import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// One week before a confirmed stay, re-send the confirmation email as a
// "REMINDER:" to the same people (creator + GM + location inbox) — but only
// when the booking was confirmed at least 4 weeks ahead. A booking confirmed
// last week has nothing to be reminded of.
//
// Called daily by pg_cron (see the stay_reminders migration). Idempotent: each
// booking is reminded once (bookings.reminder_sent_at); if a run is missed the
// next one catches up, right until check-in day.
//
// Also sends two creator-only emails via send-creator-stay-email (Oct 2026):
//   48 hours before check-in (bookings.reminder_48h_sent_at), and
//   a thank-you on check-out day (bookings.thank_you_sent_at).
// { dryRun: true } lists what all three would send, without sending.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const NOTICE_DAYS = 28;       // booking must have been confirmed this far ahead
const REMIND_WITHIN_DAYS = 7; // ...and check-in is now within this many days

const normalizeCronSecret = (value: string | null) => {
  const trimmed = value?.trim() ?? '';
  return /^[0-9a-fA-F]{64}$/.test(trimmed) ? trimmed.toLowerCase() : trimmed;
};
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const daysBetween = (fromYmd: string, toYmd: string) =>
  Math.round((Date.parse(toYmd) - Date.parse(fromYmd)) / 86_400_000);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // The endpoint is public (cron cannot send a JWT); the shared secret is the auth.
  const provided = normalizeCronSecret(req.headers.get('x-cron-secret'));
  const { data: vaultSecret, error: vaultErr } = await sb.rpc('get_cron_secret');
  if (vaultErr) return json({ ok: false, error: 'cron secret unavailable' }, 503);
  const expected = normalizeCronSecret(typeof vaultSecret === 'string' ? vaultSecret : null);
  if (!expected || provided !== expected) return json({ ok: false, error: 'forbidden' }, 403);

  // { dryRun: true } lists what would be sent without sending anything.
  let dryRun = false;
  try { dryRun = Boolean((await req.json())?.dryRun); } catch { /* empty body from cron */ }

  const today = new Date();
  const until = new Date(today);
  until.setUTCDate(until.getUTCDate() + REMIND_WITHIN_DAYS);

  const { data: rows, error } = await sb
    .from('bookings')
    .select('id, creator_name, creator_email, property, check_in, check_out, confirmed_at, gm_email, reference_code, applicants(booking_token)')
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .not('confirmed_at', 'is', null)
    .not('reference_code', 'is', null)
    .gte('check_in', ymd(today))
    .lte('check_in', ymd(until));
  if (error) return json({ ok: false, error: error.message }, 500);

  // A booking replaced by a confirmed amendment must not be reminded with old dates.
  const ids = (rows ?? []).map((r) => r.id);
  const superseded = new Set<string>();
  if (ids.length) {
    const { data: kids } = await sb
      .from('bookings').select('parent_booking_id')
      .in('parent_booking_id', ids).eq('status', 'confirmed');
    for (const k of kids ?? []) if (k.parent_booking_id) superseded.add(k.parent_booking_id);
  }

  const summary = (r: any) => ({
    id: r.id, creator: r.creator_name, email: r.creator_email, property: r.property,
    checkIn: r.check_in, reference: r.reference_code,
    noticeDays: daysBetween(String(r.confirmed_at).slice(0, 10), r.check_in),
  });

  const due: any[] = [];
  const skipped: { id: string; creator: string | null; reason: string }[] = [];
  for (const r of rows ?? []) {
    const notice = daysBetween(String(r.confirmed_at).slice(0, 10), r.check_in);
    if (notice < NOTICE_DAYS) { skipped.push({ id: r.id, creator: r.creator_name, reason: `confirmed only ${notice} days ahead` }); continue; }
    if (superseded.has(r.id)) { skipped.push({ id: r.id, creator: r.creator_name, reason: 'superseded by a confirmed amendment' }); continue; }
    if (!r.creator_email) { skipped.push({ id: r.id, creator: r.creator_name, reason: 'no creator email' }); continue; }
    due.push(r);
  }


  const sent: any[] = [];
  const failed: any[] = [];
  for (const r of (dryRun ? [] : due)) {
    // GMs change: use the property's current GM, falling back to what the booking stored.
    const { data: prop } = await sb.from('properties').select('gm_email').eq('location', r.property).maybeSingle();
    const gmEmail = prop?.gm_email || r.gm_email || null;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-booking-confirmed-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
      body: JSON.stringify({
        reminder: true,
        creatorName: r.creator_name, email: r.creator_email, gmEmail,
        referenceCode: r.reference_code, property: r.property,
        checkIn: r.check_in, checkOut: r.check_out,
        bookingToken: (r as any).applicants?.booking_token ?? null,
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (res.ok && out?.ok) {
      await sb.from('bookings').update({ reminder_sent_at: new Date().toISOString() }).eq('id', r.id);
      sent.push(summary(r));
    } else {
      failed.push({ ...summary(r), error: out?.error || `HTTP ${res.status}` });
    }
  }

  console.log(`send-stay-reminders (1 week): sent ${sent.length}, failed ${failed.length}, skipped ${skipped.length}`);

  // ---- Creator-only stay emails (Oct 2026): 48 hours before check-in, and a
  // thank-you on check-out day. Each once per booking; a missed run catches up
  // (48h: while check-in is still 1-2 days away; thank-you: up to a day late).
  const plusDays = (n: number) => { const d = new Date(today); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
  const supersededAmong = async (ids: string[]) => {
    const set = new Set<string>();
    if (!ids.length) return set;
    const { data: kids } = await sb.from('bookings').select('parent_booking_id')
      .in('parent_booking_id', ids).eq('status', 'confirmed');
    for (const k of kids ?? []) if (k.parent_booking_id) set.add(k.parent_booking_id);
    return set;
  };

  const runStayEmail = async (
    kind: 'pre_arrival' | 'thank_you', sentCol: 'reminder_48h_sent_at' | 'thank_you_sent_at',
    dateCol: 'check_in' | 'check_out', from: string, to: string,
  ) => {
    const { data, error: qErr } = await sb.from('bookings')
      .select('id, creator_name, creator_email, property, check_in, check_out, confirmed_at, reference_code')
      .eq('status', 'confirmed').is(sentCol, null).not('creator_email', 'is', null)
      .gte(dateCol, from).lte(dateCol, to);
    if (qErr) return { error: qErr.message };
    const sup = await supersededAmong((data ?? []).map((r) => r.id));
    const dueK: any[] = []; const skippedK: any[] = [];
    for (const r of data ?? []) {
      if (sup.has(r.id)) { skippedK.push({ id: r.id, creator: r.creator_name, reason: 'superseded by a confirmed amendment' }); continue; }
      // Just confirmed? They've only now had the full confirmation email.
      if (kind === 'pre_arrival' && r.confirmed_at && Date.parse(r.confirmed_at) > Date.now() - 24 * 3600 * 1000) {
        skippedK.push({ id: r.id, creator: r.creator_name, reason: 'confirmed less than 24 hours ago' }); continue;
      }
      dueK.push(r);
    }
    const brief = (r: any) => ({ id: r.id, creator: r.creator_name, email: r.creator_email, property: r.property, checkIn: r.check_in, checkOut: r.check_out });
    if (dryRun) return { due: dueK.map(brief), skipped: skippedK };
    const sentK: any[] = []; const failedK: any[] = [];
    for (const r of dueK) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-creator-stay-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
        body: JSON.stringify({ bookingId: r.id, kind }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out?.ok) {
        await sb.from('bookings').update({ [sentCol]: new Date().toISOString() }).eq('id', r.id);
        sentK.push(brief(r));
      } else {
        failedK.push({ ...brief(r), error: out?.error || `HTTP ${res.status}` });
      }
    }
    console.log(`send-stay-reminders (${kind}): sent ${sentK.length}, failed ${failedK.length}, skipped ${skippedK.length}`);
    return { sent: sentK, failed: failedK, skipped: skippedK };
  };

  const preArrival = await runStayEmail('pre_arrival', 'reminder_48h_sent_at', 'check_in', plusDays(1), plusDays(2));
  const thankYou = await runStayEmail('thank_you', 'thank_you_sent_at', 'check_out', plusDays(-1), plusDays(0));

  const week = dryRun ? { due: due.map(summary), skipped } : { sent, failed, skipped };
  const anyFailed = failed.length > 0 || (preArrival as any).failed?.length > 0 || (thankYou as any).failed?.length > 0
    || 'error' in preArrival || 'error' in thankYou;
  return json({ ok: !anyFailed, dryRun, week, preArrival, thankYou });
});
