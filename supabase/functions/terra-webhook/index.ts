import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const TERRA_WEBHOOK_SECRET = Deno.env.get('TERRA_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Verify Terra webhook signature
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const hmac = createHmac('sha256', TERRA_WEBHOOK_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('base64');
  return signature === expectedSignature;
}

/**
 * Process Terra daily data webhook
 */
async function processDailyData(data: any, supabase: any) {
  const terraUserId = data.user?.user_id;
  if (!terraUserId) {
    console.error('No Terra user ID in webhook data');
    return;
  }

  // Find the client_id from the connection
  const { data: connection, error: connError } = await supabase
    .from('wearable_connections')
    .select('client_id, provider')
    .eq('terra_user_id', terraUserId)
    .single();

  if (connError || !connection) {
    console.error('Connection not found for Terra user:', terraUserId);
    return;
  }

  const clientId = connection.client_id;

  // Extract relevant data points
  const dailyData = data.data?.[0]; // Terra sends array of daily summaries
  if (!dailyData) {
    console.error('No daily data in webhook');
    return;
  }

  const dataDate = dailyData.metadata?.start_time?.split('T')[0] || new Date().toISOString().split('T')[0];

  // Prepare wearable data record
  const wearableRecord = {
    client_id: clientId,
    data_date: dataDate,
    steps: dailyData.distance_data?.steps || null,
    resting_heart_rate: dailyData.heart_rate_data?.summary?.resting_hr_bpm || null,
    hrv_avg: dailyData.heart_rate_data?.summary?.hrv_rmssd_avg || null,
    sleep_duration_minutes: dailyData.sleep_data?.summary?.duration_asleep_seconds ? Math.round(dailyData.sleep_data.summary.duration_asleep_seconds / 60) : null,
    sleep_efficiency: dailyData.sleep_data?.summary?.efficiency || null,
    sleep_deep_minutes: dailyData.sleep_data?.summary?.duration_deep_sleep_seconds ? Math.round(dailyData.sleep_data.summary.duration_deep_sleep_seconds / 60) : null,
    sleep_rem_minutes: dailyData.sleep_data?.summary?.duration_REM_sleep_seconds ? Math.round(dailyData.sleep_data.summary.duration_REM_sleep_seconds / 60) : null,
    active_minutes: dailyData.active_durations_data?.activity_seconds ? Math.round(dailyData.active_durations_data.activity_seconds / 60) : null,
    raw_data: dailyData, // Store full payload for future use
    synced_at: new Date().toISOString(),
  };

  // Upsert the data (update if exists for this date, insert if not)
  const { error: upsertError } = await supabase
    .from('wearable_daily_data')
    .upsert(wearableRecord, {
      onConflict: 'client_id,data_date',
    });

  if (upsertError) {
    console.error('Error upserting wearable data:', upsertError);
    throw upsertError;
  }

  // Update last_sync_at on the connection
  await supabase
    .from('wearable_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('terra_user_id', terraUserId);

  console.log(`Successfully processed wearable data for client ${clientId} on ${dataDate}`);
}

serve(async (req) => {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('terra-signature') || '';

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle different webhook types
    switch (payload.type) {
      case 'daily':
      case 'sleep':
      case 'activity':
      case 'body':
        await processDailyData(payload, supabase);
        break;

      case 'athlete_deregistered':
        // User disconnected their device from Terra's side
        const terraUserId = payload.user?.user_id;
        if (terraUserId) {
          await supabase
            .from('wearable_connections')
            .update({ is_active: false })
            .eq('terra_user_id', terraUserId);
        }
        break;

      default:
        console.log('Unhandled webhook type:', payload.type);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Terra webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
