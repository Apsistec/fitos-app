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

interface DeauthenticateRequest {
  connection_id: string;
}

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

    const { connection_id }: DeauthenticateRequest = await req.json();

    // Get the connection details
    const { data: connection, error: fetchError } = await supabase
      .from('wearable_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('client_id', user.id) // Ensure user owns this connection
      .single();

    if (fetchError || !connection) {
      throw new Error('Connection not found');
    }

    // Call Terra API to deauthenticate
    const terraResponse = await fetch(`https://api.tryterra.co/v2/auth/deauthenticateUser`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'dev-id': TERRA_DEV_ID,
        'x-api-key': TERRA_API_KEY,
      },
      body: JSON.stringify({
        user_id: connection.terra_user_id,
      }),
    });

    if (!terraResponse.ok) {
      const errorData = await terraResponse.json();
      console.error('Terra deauth error:', errorData);
      // Continue with local deletion even if Terra API fails
    }

    // Delete the connection from our database
    const { error: deleteError } = await supabase
      .from('wearable_connections')
      .delete()
      .eq('id', connection_id);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Terra deauthenticate error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
