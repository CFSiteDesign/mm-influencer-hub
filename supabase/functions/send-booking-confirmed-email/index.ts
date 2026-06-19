import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Brief step 11: once Customer Services adds the Cloudbeds reference code, the
// creator gets their confirmation. The location's General Manager is CC'd
// (gm_email resolved from the properties table — skipped until populated).
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

  // Creator hub base (drives the standards link + the change/amend link).
  // PRE-LAUNCH: Lovable test URL for manual testing — switch to
  // 'https://madmonkeyhostels.com/creatorhub' (or set CREATOR_HUB_URL) at go-live.
  const CREATOR_HUB_URL = Deno.env.get('CREATOR_HUB_URL') || 'https://mm-influencer-hub.lovable.app';

  try {
    const { creatorName, email, gmEmail, referenceCode, property, checkIn, checkOut, uploadUrl, bookingToken } = await req.json();

    if (!email || !referenceCode || !property) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firstName = String(creatorName || '').trim().split(/\s+/)[0] || 'there';
    const logoUrl = 'https://ravecomtupiyurjezwji.supabase.co/storage/v1/object/public/email-assets/logo.png';
    const standardsUrl = `${CREATOR_HUB_URL}/docs/creator-hub-first-touch-point.pdf`;
    // Brief "Changes / Booking Amendments": a button to change/amend or request
    // an additional booking, following the same calendar + restrictions.
    const amendUrl = bookingToken ? `${CREATOR_HUB_URL}/book/${bookingToken}?mode=amend` : '';
    // The "upload raw clips & stills HERE" destination — Google Drive folder.
    const rawClipsUrl = uploadUrl || 'https://drive.google.com/drive/folders/1uFNLi7_KtmJ5jL3ulh7kJMRKlcohCdZ0?usp=drive_link';
    // Location inbox, derived from the property name (e.g. "Chiang Mai" ->
    // chiangmai@madmonkeyhostels.com). CC'd on the confirmation alongside the GM.
    const locationEmail = `${property.toLowerCase().replace(/[^a-z0-9]/g, '')}@madmonkeyhostels.com`;

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

      <p style="font-size:16px;color:#111827;margin:0 0 20px;line-height:1.6;">
        You're all set — your booking is confirmed! You should receive a confirmation email shortly.
      </p>

      <div style="background:#fdf2fb;border:1px solid #e54fcc;border-radius:10px;padding:18px 20px;margin:0 0 24px;">
        <p style="margin:0;font-size:15px;color:#111827;line-height:1.6;">
          <strong>Your booking reference:</strong> ${referenceCode}<br />
          <strong>Location:</strong> ${property}<br />
          <strong>Dates:</strong> ${checkIn} – ${checkOut}
        </p>
      </div>

      <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.7;">
        <strong>@GM</strong> — please welcome ${firstName}, who'll be capturing some amazing content for us. Make them feel right at home!
      </p>

      <p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.7;">
        <strong>Deliverables:</strong> 2 video deliverables cross-posted on TikTok and Instagram.
      </p>
      <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.7;">
        Please make sure the content is high quality and selective. We don't need videos of room tours etc. — we want content for brand use!
      </p>

      <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.7;">
        Please also upload raw clips and stills
        <a href="${rawClipsUrl}" style="color:#e54fcc;font-weight:700;text-decoration:underline;">HERE</a>
        &gt; Select region &gt; Select hostel.
      </p>

      <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.7;">
        Please be reminded of our
        <a href="${standardsUrl}" style="color:#e54fcc;text-decoration:underline;">Standards and Expectations</a>!
      </p>

      <ul style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.8;padding-left:20px;">
        <li>You're welcome to get <strong>50% off all food and beverage</strong>!</li>
        <li>Please collaborate with <strong>@Madmonkeyhostels</strong> and <strong>@Madmonkeycreators</strong> on IG (tag and mention both accounts on any content).</li>
        <li>Tag <strong>@madmonkeyhostels</strong> in all captions.</li>
        <li><strong>All posts</strong> should contain your PROMO code for your audience to use!</li>
      </ul>

      <p style="font-size:16px;color:#111827;margin:0 0 24px;line-height:1.6;">
        We can't wait to host you and see you showcase Mad Monkey! See you soon! 🐒
      </p>

      ${amendUrl ? `
      <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin:0 0 24px;text-align:center;">
        <p style="font-size:13px;color:#6b7280;margin:0 0 10px;line-height:1.6;">Need to change your dates or book an additional stay?</p>
        <a href="${amendUrl}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:14px;font-weight:600;">Change / amend booking</a>
      </div>` : ''}

      <p style="font-size:15px;color:#374151;margin:0 0 4px;line-height:1.6;">Best,</p>
      <p style="font-size:16px;color:#000000;margin:0;font-weight:700;">The Mad Monkey Creator Hub Team</p>
    </div>
    <div style="background-color:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="font-size:11px;color:#9ca3af;margin:0;">For questions, contact <a href="mailto:creatorhub@madmonkeyhostels.com" style="color:#e54fcc;">creatorhub@madmonkeyhostels.com</a></p>
    </div>
  </div>
</body></html>`;

    const payload: Record<string, unknown> = {
      from: 'Mad Monkey Creator Hub <hello@creatorhub.madmonkeyhostels.com>',
      to: [email],
      reply_to: 'creatorhub@madmonkeyhostels.com',
      subject: `Your Mad Monkey stay is confirmed — ${referenceCode}`,
      html,
    };
    // CC the property's General Manager(s) (if known) and the location inbox.
    // gmEmail may be a comma-separated list of addresses.
    const gmEmails = (gmEmail || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    const cc = [...gmEmails, locationEmail].filter(Boolean);
    if (cc.length) payload.cc = cc;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    await supabase.from('email_send_log').insert({
      recipient_email: email,
      template_name: 'booking-confirmed',
      status: res.ok ? 'sent' : 'failed',
      error_message: res.ok ? null : `Resend ${res.status}: ${JSON.stringify(data)}`.slice(0, 500),
      metadata: { creatorName, property, referenceCode, gmCc: gmEmail || null },
    });

    return new Response(JSON.stringify({ ok: res.ok, data }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-booking-confirmed-email error:', error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
