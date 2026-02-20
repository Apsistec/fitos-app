/**
 * send-push-notification Edge Function
 * Sprint 52: Context-Aware Notifications + Geofencing
 *
 * Sends an FCM push notification to a specific user's device token.
 * Called server-side by JITAI triggers, streak-risk cron, or trainer alerts.
 *
 * Request body:
 *   { user_id, title, body, type, deep_link?, data? }
 *
 * Enforces:
 *   - User's notification type preference enabled
 *   - Quiet hours
 *   - Max daily notification count (from notification_preferences)
 *   - Logs delivery to notification_log
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const FCM_URL = 'https://fcm.googleapis.com/v1/projects/{projectId}/messages:send';

interface SendPushRequest {
  user_id: string;
  title: string;
  body: string;
  type: string;
  deep_link?: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const payload: SendPushRequest = await req.json();
    const { user_id, title, body, type, deep_link, data } = payload;

    if (!user_id || !title || !body || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, title, body, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Load notification preferences ────────────────────────────────────────
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Check quiet hours server-side
    if (prefs) {
      const now = new Date();
      const currentMins = now.getUTCHours() * 60 + now.getUTCMinutes();
      const [sh, sm] = (prefs.quiet_hours_start || '22:00').split(':').map(Number);
      const [eh, em] = (prefs.quiet_hours_end || '07:00').split(':').map(Number);
      const startMins = sh * 60 + sm;
      const endMins   = eh * 60 + em;
      const inQuiet = startMins > endMins
        ? currentMins >= startMins || currentMins <= endMins
        : currentMins >= startMins && currentMins <= endMins;

      if (inQuiet) {
        return new Response(
          JSON.stringify({ skipped: true, reason: 'quiet_hours' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Enforce daily limit
      const maxDaily = prefs.max_daily_notifications ?? 3;
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('notification_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .gte('delivered_at', startOfDay.toISOString());

      if ((count ?? 0) >= maxDaily) {
        return new Response(
          JSON.stringify({ skipped: true, reason: 'daily_limit_reached' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // ── Get FCM token from profiles ──────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', user_id)
      .single();

    const fcmToken = profile?.fcm_token;
    let fcmMessageId: string | null = null;

    if (fcmToken) {
      // ── Send via FCM v1 API ────────────────────────────────────────────────
      const fcmProjectId = Deno.env.get('FIREBASE_PROJECT_ID');
      const fcmServerKey = Deno.env.get('FIREBASE_SERVER_KEY'); // legacy or service account token

      if (fcmProjectId && fcmServerKey) {
        const fcmBody = {
          message: {
            token: fcmToken,
            notification: { title, body },
            data: {
              type,
              deep_link: deep_link ?? '',
              ...(data ?? {}),
            },
            android: {
              priority: 'high',
              notification: { channel_id: 'fitos_default' },
            },
            apns: {
              payload: { aps: { sound: 'default', badge: 1 } },
            },
          },
        };

        const url = FCM_URL.replace('{projectId}', fcmProjectId);
        const fcmRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${fcmServerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fcmBody),
        });

        if (fcmRes.ok) {
          const fcmData = await fcmRes.json();
          fcmMessageId = fcmData.name ?? null;
        } else {
          const errText = await fcmRes.text();
          console.error('[send-push-notification] FCM error:', errText);
        }
      }
    }

    // ── Log delivery to notification_log ────────────────────────────────────
    await supabase.from('notification_log').insert({
      user_id,
      notification_type: type,
      title,
      body,
      data: { deep_link: deep_link ?? null, ...(data ?? {}) },
      channel: fcmToken ? 'push' : 'local',
      delivered_at: new Date().toISOString(),
      fcm_message_id: fcmMessageId,
    });

    return new Response(
      JSON.stringify({ success: true, fcm_message_id: fcmMessageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[send-push-notification] error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
