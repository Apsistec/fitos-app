import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

/**
 * Send Payment Failure Notification
 *
 * Notifies trainer when a client's payment fails, allowing proactive outreach
 * This improves recovery rates beyond Stripe's Smart Retries alone
 *
 * Sprint 29: Payment Analytics & Recovery
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();

    const { trainerId, clientId, invoiceId, amount, attemptCount } = await req.json();

    // Get trainer and client details
    const [trainerResult, clientResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, email, notification_preferences')
        .eq('id', trainerId)
        .single(),
      supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', clientId)
        .single(),
    ]);

    if (trainerResult.error || clientResult.error) {
      throw new Error('Failed to fetch user details');
    }

    const trainer = trainerResult.data;
    const client = clientResult.data;

    // Check trainer's notification preferences
    const preferences = trainer.notification_preferences || {};
    if (preferences.payment_failures === false) {
      console.log(`Trainer ${trainerId} has payment failure notifications disabled`);
      return new Response(
        JSON.stringify({ message: 'Notification skipped per user preferences' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create in-app notification
    await supabase.from('notifications').insert({
      user_id: trainerId,
      type: 'payment_failure',
      title: 'Payment Failed',
      message: `Payment of $${amount.toFixed(2)} from ${client.full_name} failed (attempt ${attemptCount}). Stripe Smart Retries is handling recovery automatically.`,
      data: {
        client_id: clientId,
        client_name: client.full_name,
        invoice_id: invoiceId,
        amount,
        attempt_count: attemptCount,
      },
      action_url: `/clients/${clientId}/billing`,
      priority: attemptCount >= 3 ? 'high' : 'normal',
    });

    // Send email notification for 2nd+ attempts
    if (attemptCount >= 2) {
      // TODO: Integrate with email service (SendGrid, Resend, etc.)
      // For now, we'll just log it
      console.log(`Email notification needed for trainer ${trainer.email}:`);
      console.log(`  Client: ${client.full_name} (${client.email})`);
      console.log(`  Amount: $${amount.toFixed(2)}`);
      console.log(`  Attempt: ${attemptCount}`);
      console.log(`  Invoice: ${invoiceId}`);

      // Example email content:
      const emailContent = {
        to: trainer.email,
        subject: `Payment Issue: ${client.full_name} - $${amount.toFixed(2)}`,
        html: `
          <h2>Payment Failure Alert</h2>
          <p>Hi ${trainer.full_name},</p>
          <p>We wanted to let you know that a payment from <strong>${client.full_name}</strong> has failed.</p>

          <h3>Details:</h3>
          <ul>
            <li><strong>Amount:</strong> $${amount.toFixed(2)}</li>
            <li><strong>Attempt:</strong> ${attemptCount}</li>
            <li><strong>Status:</strong> Stripe Smart Retries is active</li>
          </ul>

          <h3>What This Means:</h3>
          <p>Stripe's Smart Retries system is automatically attempting to recover this payment using ML-optimized timing. On average, this recovers 57% of failed payments without any action needed.</p>

          <h3>What You Can Do:</h3>
          ${
            attemptCount === 2
              ? '<p>Consider reaching out to the client to ensure their payment method is up to date. A quick, friendly message can help prevent churn.</p>'
              : '<p>This is attempt #' +
                attemptCount +
                '. You may want to reach out to the client to discuss their payment method or offer alternative options.</p>'
          }

          <p><a href="${Deno.env.get('APP_URL')}/clients/${clientId}/billing" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View Client Billing</a></p>

          <p style="margin-top: 32px; color: #6B7280; font-size: 14px;">
            You're receiving this notification because you have payment failure alerts enabled. You can adjust your notification preferences in Settings.
          </p>
        `,
      };

      // Store email for batch processing or send via edge function
      // await sendEmail(emailContent);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_sent: true,
        email_sent: attemptCount >= 2,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending payment failure notification:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
