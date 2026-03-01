/**
 * send-weekly-pod-digest Edge Function — Sprint 66.2
 *
 * Runs every Monday at 8am UTC. For each active accountability group,
 * fetches the previous week's stats and sends a digest push notification
 * to every pod member.
 *
 * Cron: `0 8 * * 1`  (Monday 8:00 UTC)
 * Registered in: 20260400060001_pod_digest_cron.sql
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PodStats {
  total_workouts:   number;
  total_sessions:   number;
  most_active_name: string | null;
  member_count:     number;
}

interface GroupRow {
  id:   string;
  name: string;
  emoji: string;
}

interface MemberRow {
  client_id: string;
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
    // ── Fetch all active groups ───────────────────────────────────────────────
    const { data: groups, error: groupError } = await adminSupabase
      .from('accountability_groups')
      .select('id, name, emoji')
      .eq('is_active', true);

    if (groupError) throw groupError;
    if (!groups || groups.length === 0) {
      return new Response(JSON.stringify({ digests_sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalNotifications = 0;

    for (const group of groups as GroupRow[]) {
      // ── Get weekly stats via RPC ──────────────────────────────────────────────
      const { data: statsRows } = await adminSupabase
        .rpc('get_pod_weekly_stats', { p_group_id: group.id });

      const stats: PodStats = statsRows?.[0] ?? {
        total_workouts:   0,
        total_sessions:   0,
        most_active_name: null,
        member_count:     0,
      };

      if (stats.total_workouts === 0 && stats.total_sessions === 0) continue;

      // ── Fetch member list ─────────────────────────────────────────────────────
      const { data: members } = await adminSupabase
        .from('accountability_group_members')
        .select('client_id')
        .eq('group_id', group.id);

      if (!members || members.length === 0) continue;

      const memberIds = (members as MemberRow[]).map((m) => m.client_id);

      // ── Build notification copy ───────────────────────────────────────────────
      const title = `${group.emoji} ${group.name} weekly recap`;

      let body = `Your pod crushed ${stats.total_workouts} workout${stats.total_workouts === 1 ? '' : 's'} last week!`;
      if (stats.most_active_name) {
        body += ` 🏆 MVP: ${stats.most_active_name}`;
      }

      // ── Insert notifications for each member ──────────────────────────────────
      const notifications = memberIds.map((clientId: string) => ({
        user_id: clientId,
        type:    'pod_digest',
        title,
        body,
        data:    JSON.stringify({
          type:     'pod_feed',
          group_id: group.id,
          deep_link: '/tabs/social/pods',
        }),
      }));

      const { error: notifError } = await adminSupabase
        .from('notifications')
        .insert(notifications);

      if (!notifError) {
        totalNotifications += notifications.length;
      }
    }

    return new Response(
      JSON.stringify({ groups_processed: groups.length, notifications_sent: totalNotifications }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('send-weekly-pod-digest error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
