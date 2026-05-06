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
    const { applicantName, email } = await req.json();

    if (!applicantName || !email) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firstName = String(applicantName).trim().split(/\s+/)[0] || 'there';
    const logoUrl = 'https://ravecomtupiyurjezwji.supabase.co/storage/v1/object/public/email-assets/mad-monkey-email-logo.png';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <div style="background-color:#ffffff;padding:32px 40px;text-align:center;border-bottom:3px solid #e54fcc;">
      <img src="${logoUrl}" alt="Mad Monkey" width="200" style="width:200px;max-width:100%;height:auto;" />
    </div>
    <div style="height:4px;background:linear-gradient(90deg,#e54fcc,#f078db);"></div>
    <div style="padding:40px;">
      <p style="font-size:16px;color:#111827;margin:0 0 20px;line-height:1.6;">Hey ${firstName},</p>
      <p style="font-size:16px;color:#111827;margin:0 0 20px;line-height:1.6;">Thanks for applying and thinking of Mad Monkey, we really appreciate it!</p>
      <p style="font-size:16px;color:#111827;margin:0 0 20px;line-height:1.6;">Unfortunately, we won't be moving forward with this collaboration as it doesn't quite align with what we're looking for right now.</p>
      <p style="font-size:16px;color:#111827;margin:0 0 28px;line-height:1.6;">Wishing you safe travels and all the best!</p>
      <p style="font-size:16px;color:#000000;margin:0;font-weight:700;">The Mad Monkey Creator Hub Team</p>
    </div>
    <div style="background-color:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="font-size:12px;color:#9ca3af;margin:0 0 4px;">Mad Monkey Creator Hub</p>
      <p style="font-size:11px;color:#9ca3af;margin:8px 0 0;">For questions, contact <a href="mailto:creatorhub@madmonkeyhostels.com" style="color:#e54fcc;">creatorhub@madmonkeyhostels.com</a></p>
    </div>
  </div>
</body>
</html>`;

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
        subject: 'An update on your Mad Monkey Creator application',
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      await supabase.from('email_send_log').insert({
        recipient_email: email,
        template_name: 'creator-disapproval',
        status: 'failed',
        error_message: `Resend API error [${res.status}]: ${JSON.stringify(data)}`,
        metadata: { applicantName },
      });
      return new Response(JSON.stringify({ ok: false, error: `Resend ${res.status}`, data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('email_send_log').insert({
      recipient_email: email,
      template_name: 'creator-disapproval',
      status: 'sent',
      metadata: { applicantName, resendId: data?.id },
    });

    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
