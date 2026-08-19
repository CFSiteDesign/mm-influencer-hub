import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const CREATOR_REPLY_TO = Deno.env.get('CREATOR_REPLY_TO') || 'creatorhub@madmonkeyhostels.com';
  const CREATOR_HUB_URL = Deno.env.get('CREATOR_HUB_URL') || 'https://mm-influencer-hub.lovable.app';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Deliberately generic response: never reveal whether an email is registered.
  const generic = json({ ok: true });

  try {
    const { email } = await req.json();
    const clean = String(email || '').trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      return json({ ok: false, error: 'Please enter a valid email address' });
    }

    const { data: applicant } = await supabase
      .from('applicants')
      .select('id, full_name, email, booking_token, status')
      .ilike('email', clean)
      .in('status', ['approved', 'code_generated', 'done'])
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!applicant?.booking_token) return generic;

    const firstName = String(applicant.full_name || '').trim().split(/\s+/)[0] || 'there';
    const bookingUrl = `${CREATOR_HUB_URL}/book/${applicant.booking_token}`;

    if (!RESEND_API_KEY) return generic;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <div style="height:4px;background:linear-gradient(90deg,#e54fcc,#f078db);"></div>
    <div style="padding:40px;">
      <p style="font-size:16px;color:#111827;margin:0 0 20px;line-height:1.6;">Hey ${firstName},</p>
      <p style="font-size:16px;color:#111827;margin:0 0 24px;line-height:1.6;">
        Here is your personal link to request collaboration dates with Mad Monkey. It is unique to you, so keep it handy.
      </p>
      <p style="margin:0 0 28px;font-size:16px;">
        <a href="${bookingUrl}" style="color:#e54fcc;font-weight:700;">Choose your dates</a>
      </p>
      <p style="font-size:14px;color:#6b7280;margin:0 0 8px;line-height:1.6;">Or copy and paste this into your browser:</p>
      <p style="font-size:13px;color:#6b7280;margin:0 0 28px;word-break:break-all;">${bookingUrl}</p>
      <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">Best,<br /><strong>The Mad Monkey Team</strong></p>
    </div>
    <div style="background-color:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="font-size:11px;color:#9ca3af;margin:0;">Mad Monkey Creator Hub — reply any time at <a href="mailto:creatorhub@madmonkeyhostels.com" style="color:#e54fcc;">creatorhub@madmonkeyhostels.com</a></p>
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
        to: [applicant.email],
        reply_to: CREATOR_REPLY_TO,
        subject: 'Your Mad Monkey booking link',
        html,
        text: `Hey ${firstName},\n\nHere is your personal link to request collaboration dates with Mad Monkey:\n${bookingUrl}\n\nBest,\nThe Mad Monkey Team`,
      }),
    });

    const data = await res.json().catch(() => ({}));
    await supabase.from('email_send_log').insert({
      recipient_email: applicant.email,
      template_name: 'booking-link-resend',
      status: res.ok ? 'sent' : 'failed',
      error_message: res.ok ? null : `Resend API error [${res.status}]: ${JSON.stringify(data)}`,
      metadata: { applicantId: applicant.id, resendId: (data as any)?.id },
    });

    return generic;
  } catch (error) {
    console.error('request-booking-link error:', error);
    return generic;
  }
});
