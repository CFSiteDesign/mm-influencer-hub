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
        Great news — you're in with the <strong>Mad Monkey Creator Hub</strong>.
      </p>

      <!-- Credentials Card -->
      <div style="background-color: #fdf2fb; border: 1px solid #e54fcc; border-radius: 10px; padding: 24px; margin: 0 0 32px; text-align: center;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #9b1d8a; letter-spacing: 1px; font-weight: 600;">your code</p>
        <p style="margin: 0 0 20px; font-size: 32px; font-weight: 800; color: #000000; font-family: 'Courier New', monospace; letter-spacing: 3px;">${creatorCode}</p>
        <p style="margin: 0 0 4px; font-size: 12px; color: #9b1d8a; letter-spacing: 1px; font-weight: 600;">your creator id</p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #000000; font-family: 'Courier New', monospace; letter-spacing: 2px;">${creatorId}</p>
      </div>

      <h2 style="font-size: 18px; color: #000000; margin: 0 0 12px; border-bottom: 2px solid #e54fcc; padding-bottom: 8px;">How it works</h2>
      <p style="font-size: 15px; color: #374151; margin: 0 0 28px; line-height: 1.7;">
        Share your code with your followers — they save 10% at checkout, and you earn 10% back on the net booking value. You're credited for every stay booked with your code, no tracking links needed.
      </p>

      <h2 style="font-size: 18px; color: #000000; margin: 0 0 12px; border-bottom: 2px solid #e54fcc; padding-bottom: 8px;">Track your stats</h2>
      <p style="font-size: 15px; color: #374151; margin: 0 0 16px; line-height: 1.7;">
        Log in to your dashboard any time using your code and Creator ID:
      </p>
      <p style="margin: 0 0 28px; font-size: 15px;">
        <a href="https://madmonkeyhostels.com/creatorhub/revenue" style="color: #e54fcc; font-weight: 600;">madmonkeyhostels.com/creatorhub/revenue</a>
      </p>

      <h2 style="font-size: 18px; color: #000000; margin: 0 0 12px; border-bottom: 2px solid #e54fcc; padding-bottom: 8px;">Getting paid</h2>
      <p style="font-size: 15px; color: #374151; margin: 0 0 12px; line-height: 1.7;">
        Once your monthly total passes USD 100, send a monthly invoice to <a href="mailto:accountspayable.sg@madmonkeyhostels.com" style="color: #e54fcc;">accountspayable.sg@madmonkeyhostels.com</a>. Include your full legal name, Creator ID, and bank details (IBAN/SWIFT). Your invoice should match our monthly report.
      </p>
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 28px; line-height: 1.6;">
        Using your code or submitting an invoice confirms you accept the agreement and standards below.
      </p>

      <!-- Document Links -->
      <div style="text-align: center; margin: 0 0 32px;">
        <a href="https://mm-influencer-hub.lovable.app/docs/creator-hub-commission-agreement.pdf" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 0 6px 8px;">Commission Agreement</a>
        <a href="https://mm-influencer-hub.lovable.app/docs/creator-hub-first-touch-point.pdf" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 0 6px 8px;">Standards + Deliverables</a>
      </div>

      <p style="font-size: 15px; color: #374151; margin: 0 0 8px; line-height: 1.6;">
        If you've already requested a stay, sit tight — we'll be in touch shortly to confirm dates.
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
      <p style="font-size: 11px; color: #9ca3af; margin: 8px 0 0;">Reply to this email any time — we're happy to help. <a href="mailto:creatorhub@madmonkeyhostels.com" style="color: #e54fcc;">creatorhub@madmonkeyhostels.com</a></p>
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
