import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

/**
 * validate-invite-code — PUBLIC endpoint (no auth required)
 *
 * Accepts { code: string } and returns limited invitation metadata
 * so the registration UI can show the trainer/gym context.
 * Uses service-role key internally to bypass RLS.
 *
 * Never returns the raw invitation record — only the fields the UI needs.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string' || code.length < 4) {
      return new Response(
        JSON.stringify({ valid: false }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use service-role client to bypass RLS
    const supabase = createSupabaseClient();

    // Look up the invitation by code
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('id, status, expires_at, trainer_id')
      .eq('invite_code', code.toUpperCase().trim())
      .single();

    if (error || !invitation) {
      return new Response(
        JSON.stringify({ valid: false }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if invitation is still valid
    const isExpired = new Date(invitation.expires_at) < new Date();
    if (invitation.status !== 'pending' || isExpired) {
      return new Response(
        JSON.stringify({ valid: false, reason: isExpired ? 'expired' : invitation.status }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch trainer profile for display name
    const { data: trainer } = await supabase
      .from('profiles')
      .select('full_name, gym_name')
      .eq('id', invitation.trainer_id)
      .single();

    return new Response(
      JSON.stringify({
        valid: true,
        trainerName: trainer?.full_name ?? 'Your Trainer',
        gymName: trainer?.gym_name ?? null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error in validate-invite-code:', err);
    return new Response(
      JSON.stringify({ valid: false }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
