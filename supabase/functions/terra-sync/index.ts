import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TERRA_API_KEY = Deno.env.get('TERRA_API_KEY')!;
const TERRA_DEV_ID = Deno.env.get('TERRA_DEV_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Manually trigger a sync for all user's connected devices
 * This is useful for on-demand data refresh
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get all active connections for this user
    const { data: connections, error: connError } = await supabase
      .from('wearable_connections')
      .select('*')
      .eq('client_id', user.id)
      .eq('is_active', true);

    if (connError) {
      throw connError;
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active connections to sync' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Request data from Terra for each connection
    const syncPromises = connections.map(async (connection) => {
      try {
        // Request last 7 days of data
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const response = await fetch(
          `https://api.tryterra.co/v2/daily?user_id=${connection.terra_user_id}&start_date=${startDate}&end_date=${endDate}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'dev-id': TERRA_DEV_ID,
              'x-api-key': TERRA_API_KEY,
            },
          }
        );

        if (!response.ok) {
          console.error(`Failed to sync ${connection.provider}:`, await response.text());
          return { provider: connection.provider, success: false };
        }

        return { provider: connection.provider, success: true };
      } catch (error) {
        console.error(`Error syncing ${connection.provider}:`, error);
        return { provider: connection.provider, success: false };
      }
    });

    const results = await Promise.all(syncPromises);

    return new Response(
      JSON.stringify({
        message: 'Sync requested',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Terra sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
