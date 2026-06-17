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
    const { creatorName, creatorCode, creatorId, email, bookingToken } = await req.json();

    // Per the brief, this email no longer prints the code/ID ("you will shortly
    // receive a personal promo code"), so only name + email are required.
    if (!creatorName || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firstName = String(creatorName).trim().split(/\s+/)[0] || 'there';

    const logoUrl = 'https://ravecomtupiyurjezwji.supabase.co/storage/v1/object/public/email-assets/mad-monkey-email-logo.png';

    // The "select your stay dates HERE" link points at the token-gated booking
    // page. Override the base URL with the CREATOR_HUB_URL secret if the app is
    // served from a custom domain.
    const CREATOR_HUB_URL = Deno.env.get('CREATOR_HUB_URL') || 'https://mm-influencer-hub.lovable.app';
    const bookingUrl = bookingToken
      ? `${CREATOR_HUB_URL}/book/${bookingToken}`
      : `${CREATOR_HUB_URL}/apply`;
    const standardsUrl = `${CREATOR_HUB_URL}/docs/creator-hub-first-touch-point.pdf`;

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
        Hey ${firstName},
      </p>

      <p style="font-size: 16px; color: #111827; margin: 0 0 20px; line-height: 1.6;">
        Thanks for applying to the Creator Hub. I have reviewed and accepted your application. <strong>WELCOME!</strong>
      </p>

      <p style="font-size: 16px; color: #111827; margin: 0 0 20px; line-height: 1.6;">
        You will shortly receive a personal promo code that you can share with your audience. They will receive a 10% discount and you will earn a 10% commission on every booking made directly with Mad Monkey. Promoting this code is a HUGE part of our creator hub collaboration!
      </p>

      <p style="font-size: 16px; color: #111827; margin: 0 0 20px; line-height: 1.6;">
        During your stay you must post 2 video outposts, cross-posted on Instagram and TikTok, exchange for a complimentary five-night stay.
      </p>

      <p style="font-size: 16px; color: #111827; margin: 0 0 24px; line-height: 1.6;">
        We are so excited to have you stay with us! Please select your stay dates
        <a href="${bookingUrl}" style="color: #e54fcc; font-weight: 700; text-decoration: underline;">HERE</a>.
      </p>

      <div style="text-align: center; margin: 0 0 28px;">
        <a href="${bookingUrl}" style="display: inline-block; background-color: #e54fcc; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 700;">Select Your Stay Dates →</a>
      </div>

      <p style="font-size: 16px; color: #111827; margin: 0 0 24px; line-height: 1.6;">
        Please see <a href="${standardsUrl}" style="color: #e54fcc; text-decoration: underline;">Standards and Expectations</a> for more information.
      </p>

      <p style="font-size: 16px; color: #111827; margin: 0 0 24px; line-height: 1.6;">
        Looking forward to hearing from you.
      </p>

      <p style="font-size: 15px; color: #374151; margin: 0 0 4px; line-height: 1.6;">
        Best,
      </p>
      <p style="font-size: 16px; color: #000000; margin: 0; font-weight: 700;">
        The Mad Monkey Creator Hub Team
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
        from: 'Mad Monkey Creator Hub <hello@creatorhub.madmonkeyhostels.com>',
        to: [email],
        reply_to: 'creatorhub@madmonkeyhostels.com',
        subject: `Welcome to the Mad Monkey Creator Hub, ${firstName}!`,
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
