import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { creatorName, creatorCode, creatorId, email } = await req.json();

    if (!creatorName || !creatorCode || !creatorId || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const logoUrl = 'https://ravecomtupiyurjezwji.supabase.co/storage/v1/object/public/email-assets/mad-monkey-email-logo.png';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Segoe UI', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <div style="background-color: #ffffff; padding: 32px 40px; text-align: center; border-bottom: 3px solid #e54fcc;">
      <img src="${logoUrl}" alt="Mad Monkey" width="200" style="width: 200px; max-width: 100%; height: auto;" />
    </div>

    <!-- Pink accent bar -->
    <div style="height: 4px; background: linear-gradient(90deg, #e54fcc, #f078db);"></div>

    <!-- Body -->
    <div style="padding: 40px;">
      
      <p style="font-size: 16px; color: #111827; margin: 0 0 20px; line-height: 1.6;">
        Hi ${creatorName},
      </p>

      <p style="font-size: 16px; color: #111827; margin: 0 0 24px; line-height: 1.6;">
        Great news — your application to the <strong>Mad Monkey Creator Hub</strong> has been approved! 🎉
      </p>

      <p style="font-size: 15px; color: #111827; margin: 0 0 16px; line-height: 1.6;">
        Here are your unique credentials to get you started:
      </p>

      <!-- Credentials Card -->
      <div style="background-color: #fdf2fb; border: 1px solid #e54fcc; border-radius: 10px; padding: 24px; margin: 0 0 32px; text-align: center;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #9b1d8a; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Unique Discount Code</p>
        <p style="margin: 0 0 20px; font-size: 32px; font-weight: 800; color: #000000; font-family: 'Courier New', monospace; letter-spacing: 3px;">${creatorCode}</p>
        <p style="margin: 0 0 4px; font-size: 12px; color: #9b1d8a; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Creator ID</p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #000000; font-family: 'Courier New', monospace; letter-spacing: 2px;">${creatorId}</p>
      </div>

      <!-- How to Earn Commission -->
      <h2 style="font-size: 18px; color: #000000; margin: 0 0 12px; border-bottom: 2px solid #e54fcc; padding-bottom: 8px;">💰 How to Earn Commission</h2>
      <p style="font-size: 15px; color: #374151; margin: 0 0 8px; line-height: 1.7;">
        Simply share your code with your followers — when they use it at checkout, they receive a <strong>10% discount</strong>, and you earn a <strong>10% commission</strong> on the net revenue of the sale.
      </p>
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 28px; line-height: 1.6; font-style: italic;">
        This is much more reliable than tracking links, as you get credited for every sale that uses your code, regardless of how they landed on our site!
      </p>

      <!-- Track Your Success -->
      <h2 style="font-size: 18px; color: #000000; margin: 0 0 12px; border-bottom: 2px solid #e54fcc; padding-bottom: 8px;">📊 Track Your Success</h2>
      <p style="font-size: 15px; color: #374151; margin: 0 0 16px; line-height: 1.7;">
        Monitor your performance and earnings in real-time via our dashboard:
      </p>
      <div style="text-align: center; margin: 0 0 16px;">
        <a href="https://madmonkeyhostels.com/creatorhub/revenue" style="display: inline-block; background-color: #e54fcc; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">View Your Dashboard →</a>
      </div>
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 28px; line-height: 1.6;">
        To view your stats, simply enter your <strong>Unique Code</strong> and your <strong>Creator ID</strong> mentioned above. The dashboard provides a monthly breakdown of bookings and revenue so you can stay on top of your earnings.
      </p>

      <!-- Invoicing & Payments -->
      <h2 style="font-size: 18px; color: #000000; margin: 0 0 12px; border-bottom: 2px solid #e54fcc; padding-bottom: 8px;">📄 Invoicing &amp; Payments</h2>
      <p style="font-size: 15px; color: #374151; margin: 0 0 12px; line-height: 1.7;">
        To receive payment, you are responsible for submitting a monthly invoice to <a href="mailto:accountspayable.sg@madmonkeyhostels.com" style="color: #e54fcc; text-decoration: underline;">accountspayable.sg@madmonkeyhostels.com</a>.
      </p>
      <div style="background-color: #f9fafb; border-left: 3px solid #e54fcc; padding: 16px 20px; margin: 0 0 28px; border-radius: 0 8px 8px 0;">
        <p style="font-size: 14px; color: #374151; margin: 0 0 10px; line-height: 1.6;">
          <strong>Minimum Threshold:</strong> Commission is payable once your monthly total exceeds <strong>USD 100</strong>.
        </p>
        <p style="font-size: 14px; color: #374151; margin: 0 0 10px; line-height: 1.6;">
          <strong>Invoice Details:</strong> Your invoice must match our monthly report and include your full legal name, Creator ID, and full bank details (IBAN/SWIFT).
        </p>
        <p style="font-size: 14px; color: #374151; margin: 0 0 10px; line-height: 1.6;">
          <strong>Agreement:</strong> Please review the documents below. Using your code or submitting an invoice confirms your acceptance of these terms.
        </p>
      </div>

      <!-- Document Links -->
      <div style="text-align: center; margin: 0 0 32px;">
        <a href="https://mm-influencer-hub.lovable.app/docs/creator-hub-commission-agreement.pdf" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 0 6px 8px;">📄 Commission Agreement</a>
        <a href="https://mm-influencer-hub.lovable.app/docs/creator-hub-first-touch-point.pdf" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 0 6px 8px;">📋 Standards + Deliverables</a>
      </div>

      <!-- Next Steps -->
      <h2 style="font-size: 18px; color: #000000; margin: 0 0 12px; border-bottom: 2px solid #e54fcc; padding-bottom: 8px;">🚀 Next Steps</h2>
      <p style="font-size: 15px; color: #374151; margin: 0 0 32px; line-height: 1.7;">
        If you have already requested a stay and provided your preferred dates, hang tight — our team is reviewing the schedule and will be in touch very soon to coordinate your visit.
      </p>

      <p style="font-size: 16px; color: #111827; margin: 0 0 8px; line-height: 1.6;">
        We can't wait to see the content you create! 🐒
      </p>

      <p style="font-size: 15px; color: #374151; margin: 32px 0 4px; line-height: 1.6;">
        Best,
      </p>
      <p style="font-size: 16px; color: #000000; margin: 0; font-weight: 700;">
        The Mad Monkey Team
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0 0 4px;">Mad Monkey Creator Hub</p>
      <p style="font-size: 11px; color: #d1d5db; margin: 0;">This is an automated message. Please do not reply to this email.</p>
      <p style="font-size: 11px; color: #9ca3af; margin: 8px 0 0;">For questions, contact <a href="mailto:creatorhub@madmonkeyhostels.com" style="color: #e54fcc;">creatorhub@madmonkeyhostels.com</a></p>
    </div>

  </div>
</body>
</html>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mad Monkey Creator Hub <codes@verify.theorox.com>',
        to: [email],
        reply_to: 'creatorhub@madmonkeyhostels.com',
        subject: `Welcome to the Creator Hub, ${creatorName} — Your Code & ID Are Ready`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      await supabase.from('email_send_log').insert({
        recipient_email: email,
        template_name: 'creator-welcome',
        status: 'failed',
        error_message: `Resend API error [${res.status}]: ${JSON.stringify(data)}`,
        metadata: { creatorName, creatorCode, creatorId },
      });
      // Always return 200 so callers can read the body reliably.
      return new Response(JSON.stringify({ ok: false, error: `Resend ${res.status}`, data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('email_send_log').insert({
      recipient_email: email,
      template_name: 'creator-welcome',
      status: 'sent',
      metadata: { creatorName, creatorCode, creatorId, resendId: data?.id },
    });

    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending creator welcome email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Still 200 so the caller sees the structured error instead of a transport-level non-2xx.
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
