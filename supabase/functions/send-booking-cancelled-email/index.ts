import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Admin cancelled a creator stay. Tells everyone who was told it was happening:
//  - Customer Services (always): cancel it in Cloudbeds.
//  - GM + location inbox (only if it was confirmed, the point they were CC'd).
//  - The creator (if the admin left "Email the creator" ticked).
// The booking row must already be status 'cancelled'; we refuse otherwise.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) return json({ ok: false, error: 'RESEND_API_KEY not configured' });
  const CS_EMAIL = Deno.env.get('CS_EMAIL') || 'cs@madmonkeyhostels.com';
  const CREATOR_REPLY_TO = Deno.env.get('CREATOR_REPLY_TO') || 'creatorhub@madmonkeyhostels.com';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const { bookingId, previousStatus, message, notifyCreator } = await req.json();
    if (!bookingId) return json({ ok: false, error: 'Missing bookingId' });

    const { data: b, error } = await supabase
      .from('bookings')
      .select('id, status, creator_name, creator_email, property, check_in, check_out, nights, reference_code, room_type, room_quantity, gm_email, cs_notified_at')
      .eq('id', bookingId).maybeSingle();
    if (error || !b) return json({ ok: false, error: 'Booking not found' });
    if (b.status !== 'cancelled') return json({ ok: false, error: 'Booking is not cancelled' });

    const wasConfirmed = previousStatus === 'confirmed';
    const note = typeof message === 'string' ? message.trim() : '';
    const dates = `${fmt(b.check_in)} to ${fmt(b.check_out)}`;
    const room = b.room_type === 'private' ? 'Private room' : b.room_type === 'dorm' ? 'Standard dorm' : '';
    const qty = Number(b.room_quantity) || 1;
    const roomLine = room ? `${room}${qty > 1 ? ` (${qty} ${b.room_type === 'private' ? 'rooms' : 'beds'})` : ''}` : '';
    const firstName = String(b.creator_name || '').trim().split(/\s+/)[0] || 'there';
    const from = 'Mad Monkey Creator Hub <hello@creatorhub.madmonkeyhostels.com>';
    const results: Record<string, unknown> = {};

    const send = async (template: string, payload: Record<string, unknown>) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      await supabase.from('email_send_log').insert({
        recipient_email: (payload.to as string[])[0],
        template_name: template,
        status: res.ok ? 'sent' : 'failed',
        error_message: res.ok ? null : `Resend ${res.status}: ${JSON.stringify(data)}`.slice(0, 500),
        metadata: { bookingId: b.id, creatorName: b.creator_name, property: b.property, referenceCode: b.reference_code, cc: payload.cc ?? null },
      });
      results[template] = res.ok;
      return res.ok;
    };

    const row = (label: string, value: string) => `
      <tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:6px 0;color:#111827;font-size:15px;font-weight:600;">${esc(value) || '-'}</td></tr>`;

    // 1. Customer Services: always, they were asked to book it.
    const csBanner = b.reference_code
      ? `CANCELLED: please cancel booking reference ${esc(b.reference_code)} in Cloudbeds. The creator is no longer coming.`
      : `CANCELLED: this booking was sent to you to enter in Cloudbeds. If you have already entered it, please cancel it. The creator is no longer coming.`;
    await send('booking-cancelled-cs', {
      to: [CS_EMAIL],
      reply_to: 'creatorhub@madmonkeyhostels.com',
      subject: `CANCELLED Creator Booking: ${b.creator_name} at ${b.property}${b.reference_code ? ` (${b.reference_code})` : ''}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:#fef2f2;border:1px solid #ef4444;color:#b91c1c;border-radius:8px;padding:12px 16px;margin:0 0 20px;font-weight:700;">${csBanner}</div>
        <h1 style="color:#000;font-size:22px;margin:0 0 16px;border-bottom:2px solid #e54fcc;padding-bottom:10px;">CANCELLED CREATOR BOOKING</h1>
        <table style="width:100%;border-collapse:collapse;">
          ${row('BOOKING REFERENCE', b.reference_code || 'Not entered yet')}
          ${row('NAME', b.creator_name)}
          ${row('EMAIL', b.creator_email)}
          ${row('PROPERTY', b.property)}
          ${roomLine ? row('ROOM TYPE', roomLine) : ''}
          ${row('DATES', dates)}
        </table></div>`,
    });

    // 2. GM + location inbox: only if they were CC'd on the confirmation.
    if (wasConfirmed) {
      const gms = String(b.gm_email || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (!gms.length) {
        const { data: p } = await supabase.from('properties').select('gm_email').eq('location', b.property).maybeSingle();
        String(p?.gm_email || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((g) => gms.push(g));
      }
      const locationEmail = `${String(b.property).toLowerCase().replace(/[^a-z0-9]/g, '')}@madmonkeyhostels.com`;
      const to = [...new Set([...gms, locationEmail])];
      await send('booking-cancelled-property', {
        to,
        reply_to: 'creatorhub@madmonkeyhostels.com',
        subject: `Creator stay cancelled: ${b.creator_name}, ${dates}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#374151;font-size:15px;line-height:1.6;">
          <p>Hi team,</p>
          <p>Heads up: <strong>${esc(b.creator_name)}</strong>'s creator stay at <strong>${esc(b.property)}</strong> (${esc(dates)}${b.reference_code ? `, reference ${esc(b.reference_code)}` : ''}) has been <strong>cancelled</strong>, so they will no longer be arriving.</p>
          <p>Customer Services have been asked to cancel it in Cloudbeds.</p>
          <p>Thanks,<br/>The Mad Monkey Creator Hub Team</p></div>`,
      });
    }

    // 3. The creator, unless the admin chose to tell them personally.
    if (notifyCreator !== false && b.creator_email) {
      await send('booking-cancelled-creator', {
        to: [b.creator_email],
        reply_to: CREATOR_REPLY_TO,
        subject: 'Your Mad Monkey creator stay has been cancelled',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
          <div style="background:#fff;padding:28px 40px;text-align:center;border-bottom:3px solid #e54fcc;">
            <img src="https://ravecomtupiyurjezwji.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="Mad Monkey" width="180" style="width:180px;max-width:100%;height:auto;" />
          </div>
          <div style="padding:32px 40px;color:#111827;font-size:16px;line-height:1.6;">
            <p style="margin:0 0 16px;">Hey ${esc(firstName)},</p>
            <p style="margin:0 0 16px;">Your creator stay at <strong>${esc(b.property)}</strong> (${esc(dates)}) has been cancelled.</p>
            ${note ? `<div style="background:#fdf2fb;border-left:4px solid #e54fcc;padding:14px 18px;margin:0 0 16px;white-space:pre-wrap;">${esc(note)}</div>` : ''}
            <p style="margin:0 0 16px;">If you have any questions, just reply to this email.</p>
            <p style="margin:0 0 4px;font-size:15px;color:#374151;">Best,</p>
            <p style="margin:0;font-weight:700;">The Mad Monkey Creator Hub Team</p>
          </div></div>`,
      });
    }

    return json({ ok: Object.values(results).every(Boolean), sent: results });
  } catch (e) {
    console.error('send-booking-cancelled-email error:', e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' });
  }
});
