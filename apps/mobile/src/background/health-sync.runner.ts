/**
 * health-sync.runner.ts — Sprint 49
 *
 * @capacitor/background-runner entry point for periodic health data sync.
 * This script runs in a separate JS context (not Angular) when the OS wakes the app.
 *
 * Platform behavior:
 *   iOS: BGAppRefreshTask + HealthKit background delivery wakeups (~4h)
 *   Android: WorkManager periodic job (~6h minimum, OS may defer)
 *
 * Restrictions (background-runner sandbox):
 *   - No DOM APIs
 *   - No Angular DI — must call Capacitor plugins directly
 *   - Execution budget: ~30 seconds before OS kills the task
 *   - Network calls allowed (Fetch API is available)
 *
 * Configuration: capacitor.config.ts → BackgroundRunner plugin
 *
 * @see https://capacitorjs.com/docs/apis/background-runner
 */

// Background runner exposes a small subset of the Web APIs + Capacitor plugin bridge.
// The CapacitorHealth and Preferences APIs are available directly.

addEventListener('healthSync', async (resolve: () => void, reject: (err: Error) => void) => {
  try {
    // 1. Read persisted user session from Preferences
    // (Supabase session stored by auth.service.ts on every sign-in)
    const { CapacitorPreferences } = await import('@capacitor/preferences');
    const { value: sessionJson } = await CapacitorPreferences.get({ key: 'supabase.auth.token' });
    if (!sessionJson) {
      resolve(); // not logged in — nothing to sync
      return;
    }

    // 2. Parse session to get user_id and access_token for Supabase RPC
    const session = JSON.parse(sessionJson) as {
      currentSession?: { user?: { id?: string }; access_token?: string };
    };
    const userId = session?.currentSession?.user?.id;
    const accessToken = session?.currentSession?.access_token;
    if (!userId || !accessToken) {
      resolve();
      return;
    }

    // 3. Read today's metrics from HealthKit / Health Connect
    // Plugin API: Health.readSamples({ dataType, startDate, endDate })
    const { Health } = await import('@capgo/capacitor-health');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const start = today.toISOString();
    const end = tomorrow.toISOString();

    const [hrv, rhr, sleep, steps] = await Promise.allSettled([
      Health.readSamples({ dataType: 'heartRateVariability', startDate: start, endDate: end }),
      Health.readSamples({ dataType: 'restingHeartRate', startDate: start, endDate: end }),
      Health.readSamples({ dataType: 'sleep', startDate: start, endDate: end }),
      Health.readSamples({ dataType: 'steps', startDate: start, endDate: end }),
    ]);

    // 4. Build payload for upsert_wearable_day RPC
    const payload = {
      p_user_id:     userId,
      p_date:        today.toISOString().split('T')[0],
      p_source:      'healthkit',  // background runner is iOS-only for now
      p_hrv_rmssd:   hrv.status === 'fulfilled' && hrv.value?.samples?.length
                       ? hrv.value.samples[hrv.value.samples.length - 1]?.value ?? null
                       : null,
      p_hrv_sdnn:    null,
      p_resting_hr:  rhr.status === 'fulfilled' && rhr.value?.samples?.length
                       ? Math.round(rhr.value.samples[rhr.value.samples.length - 1]?.value ?? 0) || null
                       : null,
      p_steps:       steps.status === 'fulfilled' && steps.value?.samples?.length
                       ? steps.value.samples.reduce((acc: number, s: { value: number }) => acc + s.value, 0)
                       : null,
      p_sleep_hours: null as number | null,
      p_sleep_deep:  null as number | null,
      p_sleep_rem:   null as number | null,
      p_sleep_light: null as number | null,
      p_sleep_awake: null as number | null,
      p_body_fat:    null,
      p_lean_mass:   null,
      p_bone_mass:   null,
    };

    // Aggregate sleep stages
    if (sleep.status === 'fulfilled' && sleep.value?.samples?.length) {
      let total = 0, deep = 0, rem = 0, light = 0, awake = 0;
      for (const s of sleep.value.samples) {
        const startMs = new Date(s.startDate).getTime();
        const endMs = new Date(s.endDate).getTime();
        const mins = Math.max(0, Math.round((endMs - startMs) / 60000));
        total += mins;
        const stage = (s.sleepState ?? '').toLowerCase();
        if (stage.includes('deep') || stage.includes('slow')) deep += mins;
        else if (stage.includes('rem')) rem += mins;
        else if (stage.includes('awake')) awake += mins;
        else light += mins;
      }
      payload.p_sleep_hours = Math.round((total / 60) * 10) / 10;
      payload.p_sleep_deep  = deep  > 0 ? deep  : null;
      payload.p_sleep_rem   = rem   > 0 ? rem   : null;
      payload.p_sleep_light = light > 0 ? light : null;
      payload.p_sleep_awake = awake > 0 ? awake : null;
    }

    // 5. Call Supabase RPC directly via Fetch (no Supabase JS SDK in background)
    const { CapacitorPreferences: Prefs } = await import('@capacitor/preferences');
    const { value: supabaseUrl } = await Prefs.get({ key: 'fitos_supabase_url' });
    if (!supabaseUrl) {
      resolve();
      return;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/upsert_wearable_day`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': accessToken, // anonymous key not needed for RPC with auth
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Supabase RPC failed: ${response.status}`);
    }

    // 6. Update last background sync timestamp in Preferences
    await CapacitorPreferences.set({
      key: 'fitos_last_bg_health_sync',
      value: new Date().toISOString(),
    });

    resolve();
  } catch (err) {
    // Background runner errors are non-fatal — resolve anyway to prevent
    // the OS from reducing task frequency due to repeated failures.
    console.error('[HealthSync Background]', err);
    resolve();
  }
});
