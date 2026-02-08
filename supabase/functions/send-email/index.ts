import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getUserFromAuth } from '../_shared/supabase.ts';

/**
 * Send Email Edge Function
 *
 * Sends emails via the Resend API. Used by the email marketing system
 * for campaigns, sequences, and transactional emails.
 *
 * Environment variables required:
 * - RESEND_API_KEY: Your Resend API key
 * - RESEND_FROM_EMAIL: Default sender address (optional, defaults to noreply@nutrifitos.com)
 *
 * Request body:
 * {
 *   to: string | string[]       // Recipient email(s)
 *   subject: string             // Email subject line
 *   html: string                // HTML body content
 *   replyTo?: string            // Reply-to address (optional)
 *   tags?: { name: string; value: string }[]  // Tracking tags (optional)
 * }
 *
 * Sprint 11-12: CRM & Email Marketing
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing Authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const user = await getUserFromAuth(authHeader);
    if (!user?.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Resend config
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@nutrifitos.com';

    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Configuration error - Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { to, subject, html, replyTo, tags } = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build Resend API payload
    const emailPayload: Record<string, unknown> = {
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    if (replyTo) {
      emailPayload.reply_to = replyTo;
    }

    if (tags && Array.isArray(tags)) {
      emailPayload.tags = tags;
    }

    console.log(`[send-email] Sending email to ${emailPayload.to} | Subject: "${subject}" | User: ${user.id}`);

    // Call Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[send-email] Resend API error:', resendData);
      return new Response(
        JSON.stringify({
          error: 'Email delivery failed',
          details: resendData.message || resendData.error || 'Unknown Resend error',
        }),
        {
          status: resendResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[send-email] Email sent successfully. Resend ID: ${resendData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        id: resendData.id,
        from: fromEmail,
        to: emailPayload.to,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[send-email] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
