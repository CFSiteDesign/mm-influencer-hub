import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Brief step 7: the "message box to send back to creator as an email" used when
// the Creator Hub reviews a booking's free-text requests.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'RESEND_API_KEY not configured' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { creatorName, email, message } = await req.json();

    if (!email || !message) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing email or message' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firstName = String(creatorName || '').trim().split(/\s+/)[0] || 'there';
    const logoUrl = 'https://ravecomtupiyurjezwji.supabase.co/storage/v1/object/public/email-assets/mad-monkey-email-logo.png';
    const safeMessage = String(message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br />');

    const html = `
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <div style="background-color:#ffffff;padding:32px 40px;text-align:center;border-bottom:3px solid #e54fcc;">
      <img src="${logoUrl}" alt="Mad Monkey" width="200" style="width:200px;max-width:100%;height:auto;" />
    </div>
    <div style="height:4px;background:linear-gradient(90deg,#e54fcc,#f078db);"></div>
    <div style="padding:40px;">
      <p style="font-size:16px;color:#111827;margin:0 0 20px;line-height:1.6;">Hey ${firstName},</p>
      <p style="font-size:16px;color:#111827;margin:0 0 20px;line-height:1.6;">${safeMessage}</p>
      <p style="font-size:15px;color:#374151;margin:24px 0 4px;line-height:1.6;">Best,</p>
      <p style="font-size:16px;color:#000000;margin:0;font-weight:700;">The Mad Monkey Creator Hub Team</p>
    </div>
    <div style="background-color:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="font-size:11px;color:#9ca3af;margin:0;">For questions, contact <a href="mailto:creatorhub@madmonkeyhostels.com" style="color:#e54fcc;">creatorhub@madmonkeyhostels.com</a></p>
    </div>
  </div>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Mad Monkey Creator Hub <hello@creatorhub.madmonkeyhostels.com>',
        to: [email],
        reply_to: 'creatorhub@madmonkeyhostels.com',
        subject: 'Re: Your Mad Monkey Creator stay request',
        html,
      }),
    });

    const data = await res.json();
    await supabase.from('email_send_log').insert({
      recipient_email: email,
      template_name: 'booking-reply',
      status: res.ok ? 'sent' : 'failed',
      error_message: res.ok ? null : `Resend ${res.status}: ${JSON.stringify(data)}`.slice(0, 500),
      metadata: { creatorName },
    });

    return new Response(JSON.stringify({ ok: res.ok, data }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-booking-reply-email error:', error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
