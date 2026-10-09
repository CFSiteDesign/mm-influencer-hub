import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Two creator-only emails around a confirmed stay, sent by the daily
// send-stay-reminders job:
//   kind 'pre_arrival' -> 48 hours before check-in
//   kind 'thank_you'   -> on check-out day
// Copy reuses the approved confirmation-email wording. The booking must be
// confirmed; anything else is refused.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const LOGO = 'https://ravecomtupiyurjezwji.supabase.co/storage/v1/object/public/email-assets/logo.png';
const TOOLKIT = 'https://madmonkey-wp.sgp1.cdn.digitaloceanspaces.com/creator-hub-second-touch-point.pdf';
const AGREEMENT = 'https://madmonkey-wp.sgp1.cdn.digitaloceanspaces.com/creator-hub-commission-agreement.pdf';
const RAW_CLIPS = 'https://drive.google.com/drive/folders/1uFNLi7_KtmJ5jL3ulh7kJMRKlcohCdZ0?usp=drive_link';
const REVENUE = 'https://madmonkeyhostels.com/creatorhub/revenue';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) return json({ ok: false, error: 'RESEND_API_KEY not configured' });
  const REPLY_TO = Deno.env.get('CREATOR_REPLY_TO') || 'creatorhub@madmonkeyhostels.com';
  const HUB = Deno.env.get('CREATOR_HUB_URL') || 'https://mm-influencer-hub.lovable.app';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const { bookingId, kind } = await req.json();
    if (!bookingId || (kind !== 'pre_arrival' && kind !== 'thank_you')) return json({ ok: false, error: 'Need bookingId and kind pre_arrival|thank_you' });

    const { data: b } = await sb.from('bookings')
      .select('id, status, creator_name, creator_email, property, check_in, check_out, reference_code, applicant_id')
      .eq('id', bookingId).maybeSingle();
    if (!b) return json({ ok: false, error: 'Booking not found' });
    if (b.status !== 'confirmed') return json({ ok: false, error: 'Booking is not confirmed' });
    if (!b.creator_email) return json({ ok: false, error: 'No creator email' });

    const { data: a } = await sb.from('applicants').select('creator_code, booking_token').eq('id', b.applicant_id).maybeSingle();
    const code = a?.creator_code ? esc(a.creator_code) : '';
    const codeText = code ? `your promo code <strong>${code}</strong>` : 'your PROMO code';
    const first = esc(String(b.creator_name || '').trim().split(/\s+/)[0] || 'there');
    const property = esc(b.property);

    const p = (html: string, mb = 16) => `<p style="font-size:15px;color:#374151;margin:0 0 ${mb}px;line-height:1.7;">${html}</p>`;
    const li = (items: string[]) => `<ul style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.8;padding-left:20px;">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
    const box = `<div style="background:#fdf2fb;border:1px solid #e54fcc;border-radius:10px;padding:16px 20px;margin:0 0 22px;">
        <p style="margin:0 0 4px;font-size:12px;color:#9b1d8a;letter-spacing:1px;font-weight:600;">YOUR STAY</p>
        <p style="margin:0;font-size:16px;color:#111827;font-weight:700;">${property}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#374151;">${fmt(b.check_in)} to ${fmt(b.check_out)}${b.reference_code ? ` · Ref <span style="font-family:monospace;">${esc(b.reference_code)}</span>` : ''}</p>
      </div>`;

    let subject: string, body: string, template: string;
    if (kind === 'pre_arrival') {
      const days = Math.round((Date.parse(`${b.check_in}T00:00:00Z`) - Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)) / 86400000);
      const when = days <= 1 ? 'tomorrow' : `in ${days} days`;
      template = 'stay-reminder-48h';
      subject = `Your Mad Monkey stay starts ${when}!`;
      const amend = a?.booking_token ? `${HUB}/book/${a.booking_token}?mode=amend` : '';
      body = `
        ${p(`Hey ${first},`)}
        ${p(`Just a reminder that your creator stay at <strong>${property}</strong> starts ${when}. We can't wait to host you!`)}
        ${box}
        ${p('<strong>Deliverables:</strong> 2 video deliverables cross-posted on TikTok and Instagram.', 12)}
        ${li([
          "You're welcome to get <strong>50% off all food and beverage</strong>!",
          'Please collaborate with <strong>@Madmonkeyhostels</strong> and <strong>@Madmonkeycreators</strong> on IG (tag and mention both accounts on any content).',
          'Tag <strong>@madmonkeyhostels</strong> in all captions.',
          `<strong>All posts</strong> should contain ${codeText} for your audience to use!`,
        ])}
        ${p(`Have a read of your <a href="${TOOLKIT}" style="color:#e54fcc;text-decoration:underline;">Creator Toolkit</a> before you arrive, it covers the content brief and our standards.`)}
        ${amend ? p(`Plans changed? <a href="${amend}" style="color:#e54fcc;text-decoration:underline;">Change or amend your booking</a>.`, 24) : ''}
        ${p('See you soon! 🐒', 24)}`;
    } else {
      template = 'stay-thank-you';
      subject = `Thanks for staying with Mad Monkey, ${String(b.creator_name || '').trim().split(/\s+/)[0] || 'there'}!`;
      body = `
        ${p(`Hey ${first},`)}
        ${p(`Thank you for staying with us at <strong>${property}</strong>! We hope you had an amazing time.`)}
        ${p("Here's a quick reminder of what we're looking forward to:", 12)}
        ${li([
          'Your <strong>2 video deliverables</strong>, cross-posted on TikTok and Instagram.',
          'Tag <strong>@madmonkeyhostels</strong> in all captions, and collaborate with <strong>@Madmonkeyhostels</strong> and <strong>@Madmonkeycreators</strong> on IG.',
          `<strong>All posts</strong> should contain ${codeText} for your audience to use!`,
          `Please upload your raw clips and stills <a href="${RAW_CLIPS}" style="color:#e54fcc;font-weight:700;text-decoration:underline;">HERE</a> &gt; Select region &gt; Select hostel.`,
        ])}
        ${p(`Every booking made with your code earns you commission. You can track it any time on your <a href="${REVENUE}" style="color:#e54fcc;text-decoration:underline;">creator revenue dashboard</a>.`)}
        ${p("We can't wait to see what you've created! 🐒", 24)}`;
    }

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <div style="background-color:#ffffff;padding:32px 40px;text-align:center;border-bottom:3px solid #e54fcc;">
      <img src="${LOGO}" alt="Mad Monkey" width="200" style="width:200px;max-width:100%;height:auto;" />
    </div>
    <div style="height:4px;background:linear-gradient(90deg,#e54fcc,#f078db);"></div>
    <div style="padding:36px 40px 28px;">
      ${body}
      <p style="font-size:15px;color:#374151;margin:0 0 4px;line-height:1.6;">Best,</p>
      <p style="font-size:16px;color:#000000;margin:0;font-weight:700;">The Mad Monkey Creator Hub Team</p>
    </div>
    <div style="background-color:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="font-size:11px;color:#6b7280;margin:0 0 14px;line-height:1.5;text-align:left;"><strong>Important:</strong> All commissions must be claimed within 3 months of being awarded via invoice. For the avoidance of doubt, all commissions awarded in January must be invoiced by 11th April. Full terms and conditions <a href="${AGREEMENT}" style="color:#e54fcc;">here</a>.</p>
      <p style="font-size:11px;color:#9ca3af;margin:0;">For questions, contact <a href="mailto:creatorhub@madmonkeyhostels.com" style="color:#e54fcc;">creatorhub@madmonkeyhostels.com</a></p>
    </div>
  </div>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Mad Monkey Creator Hub <hello@creatorhub.madmonkeyhostels.com>', to: [b.creator_email], reply_to: REPLY_TO, subject, html }),
    });
    const data = await res.json().catch(() => ({}));
    await sb.from('email_send_log').insert({
      recipient_email: b.creator_email, template_name: template,
      status: res.ok ? 'sent' : 'failed',
      error_message: res.ok ? null : `Resend ${res.status}: ${JSON.stringify(data)}`.slice(0, 500),
      metadata: { bookingId: b.id, creatorName: b.creator_name, property: b.property, checkIn: b.check_in, checkOut: b.check_out },
    });
    return json({ ok: res.ok, data });
  } catch (e) {
    console.error('send-creator-stay-email error:', e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' });
  }
});
