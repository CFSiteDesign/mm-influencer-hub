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

  if (dryRun) return json({ ok: true, dryRun: true, due: due.map(summary), skipped });

  const sent: any[] = [];
  const failed: any[] = [];
  for (const r of due) {
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

  console.log(`send-stay-reminders: sent ${sent.length}, failed ${failed.length}, skipped ${skipped.length}`);
  return json({ ok: failed.length === 0, sent, failed, skipped });
});
