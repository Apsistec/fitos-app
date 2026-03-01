/**
 * send-checkin-notifications Edge Function — Sprint 66.1
 *
 * Runs every minute via pg_cron. Finds check-in templates whose scheduled time
 * matches NOW(), inserts response rows for each assigned client, and sends
 * push notifications to prompt responses.
 *
 * Cron schedule: every minute  (`* * * * *`)
 * Registered in: 20260400050001_checkin_notifications_cron.sql
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PendingTemplate {
  template_id:   string;
  trainer_id:    string;
  template_name: string;
  client_ids:    string[];
  questions:     unknown[];
}

interface ClientProfile {
  id:         string;
  push_token: string | null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const adminSupabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // ── Find templates whose schedule fires right now ─────────────────────────
    const { data: pendingTemplates, error: templateError } = await adminSupabase
      .rpc('get_pending_checkins_for_trainer');

    if (templateError) throw templateError;
    if (!pendingTemplates || pendingTemplates.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalSent = 0;

    for (const template of pendingTemplates as PendingTemplate[]) {
      const clientIds: string[] = template.client_ids ?? [];
      if (clientIds.length === 0) continue;

      // ── Load template questions snapshot ────────────────────────────────────
      const { data: templateData } = await adminSupabase
        .from('checkin_templates')
        .select('questions')
        .eq('id', template.template_id)
        .single();

      const questions = templateData?.questions ?? [];

      // ── Insert response rows (one per client) ───────────────────────────────
      const responseRows = clientIds.map((clientId: string) => ({
        client_id:          clientId,
        trainer_id:         template.trainer_id,
        template_id:        template.template_id,
        questions_snapshot: questions,
        sent_at:            new Date().toISOString(),
      }));

      const { data: insertedRows, error: insertError } = await adminSupabase
        .from('checkin_responses')
        .insert(responseRows)
        .select('id, client_id');

      if (insertError) {
        console.error('Error inserting checkin responses:', insertError.message);
        continue;
      }

      // ── Send push notifications ─────────────────────────────────────────────
      const clientProfileMap = new Map<string, string>();

      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, push_token')
        .in('id', clientIds);

      for (const p of (profiles ?? []) as ClientProfile[]) {
        if (p.push_token) clientProfileMap.set(p.id, p.push_token);
      }

      for (const row of (insertedRows ?? []) as { id: string; client_id: string }[]) {
        const pushToken = clientProfileMap.get(row.client_id);
        if (!pushToken) continue;

        // Insert into notifications table — existing push handler delivers to device
        await adminSupabase.from('notifications').insert({
          user_id: row.client_id,
          type:    'checkin_request',
          title:   '📋 Time for your check-in!',
          body:    `${template.template_name} — tap to respond in under a minute.`,
          data:    JSON.stringify({
            type:        'checkin_response',
            response_id: row.id,
            deep_link:   `/tabs/workouts/checkin/${row.id}`,
          }),
        });

        totalSent++;
      }
    }

    return new Response(
      JSON.stringify({ processed: pendingTemplates.length, sent: totalSent }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('send-checkin-notifications error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
