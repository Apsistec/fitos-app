import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEB_APP_URL = Deno.env.get('WEB_APP_URL') || 'https://fitos-mobile.web.app';

/**
 * Build the redirect URL based on the platform.
 * - web: redirects to the PWA wearables settings page with query params
 * - native: redirects using the fitos:// custom URL scheme
 */
function buildRedirectUrl(
  platform: string,
  status: 'success' | 'error',
  provider?: string
): string {
  if (platform === 'native') {
    if (status === 'success') {
      return `fitos://wearables/success?provider=${provider}`;
    }
    return 'fitos://wearables/error';
  }

  // Web redirect
  if (status === 'success') {
    return `${WEB_APP_URL}/tabs/settings/wearables?connected=${provider}`;
  }
  return `${WEB_APP_URL}/tabs/settings/wearables?wearable_error=true`;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const referenceId = url.searchParams.get('reference_id');
    const terraUserId = url.searchParams.get('user_id');
    const status = url.searchParams.get('status');
    const platform = url.searchParams.get('platform') || 'web';

    if (!referenceId || !terraUserId || !status) {
      throw new Error('Missing required parameters');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const provider = referenceId.split('_')[1];

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

      return new Response(null, {
        status: 302,
        headers: {
          Location: buildRedirectUrl(platform, 'success', provider),
        },
      });
    } else {
      // Authentication failed, clean up the pending connection
      await supabase
        .from('wearable_connections')
        .delete()
        .eq('terra_user_id', referenceId);

      return new Response(null, {
        status: 302,
        headers: {
          Location: buildRedirectUrl(platform, 'error'),
        },
      });
    }
  } catch (error) {
    console.error('Terra callback error:', error);
    const url = new URL(req.url);
    const platform = url.searchParams.get('platform') || 'web';

    return new Response(null, {
      status: 302,
      headers: {
        Location: buildRedirectUrl(platform, 'error'),
      },
    });
  }
});
