import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const referenceId = url.searchParams.get('reference_id');
    const terraUserId = url.searchParams.get('user_id');
    const status = url.searchParams.get('status');

    if (!referenceId || !terraUserId || !status) {
      throw new Error('Missing required parameters');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (status === 'success') {
      // Update the connection with the actual Terra user ID and activate it
      const { error } = await supabase
        .from('wearable_connections')
        .update({
          terra_user_id: terraUserId,
          is_active: true,
        })
        .eq('terra_user_id', referenceId);

      if (error) {
        console.error('Error updating connection:', error);
        throw error;
      }

      // Redirect to success page in the app
      return new Response(null, {
        status: 302,
        headers: {
          Location: `fitos://wearables/success?provider=${referenceId.split('_')[1]}`,
        },
      });
    } else {
      // Authentication failed, clean up the pending connection
      await supabase
        .from('wearable_connections')
        .delete()
        .eq('terra_user_id', referenceId);

      // Redirect to error page in the app
      return new Response(null, {
        status: 302,
        headers: {
          Location: 'fitos://wearables/error',
        },
      });
    }
  } catch (error) {
    console.error('Terra callback error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        Location: 'fitos://wearables/error',
      },
    });
  }
});
