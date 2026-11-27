import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Finance BCC sheet sync (27 Nov 2026). The Finance tab of the "Regional /
// Global Master List" Google Sheet is the source of truth for who is BCC'd on
// booking confirmations. An Apps Script in that sheet (docs/finance-sheet-sync.gs)
// posts the whole tab here every time the sheet changes, and once a day.
//
//   POST { rows: [{ country, full_name, email, job_title }], dryRun? }
//   header x-sync-key: the sheet's key (its SHA-256 is in integration_keys)
//   -> { ok, total, added, removed, updated, unknownCountries } or { ok: false, error }
//
// It refuses a sync that would empty the list or leave a country with nobody,
// so a half-edited or renamed tab can't switch the BCC off.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-key',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const KEY_NAME = 'finance_sheet_sync';
const STATUS_KEY = 'finance_sheet_sync';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ROWS = 300;

export type Contact = { country: string; full_name: string | null; email: string; job_title: string | null };
type Current = Contact & { id: string };

const clean = (v: unknown, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const titleCase = (s: string) => s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());

/**
 * The sheet's rows as contacts: valid emails only, one per country + email,
 * countries spelt as the properties table spells them.
 */
export function cleanRows(input: unknown, knownCountries: string[]): { rows: Contact[]; unknownCountries: string[] } {
  const known = new Map(knownCountries.map((c) => [c.trim().toLowerCase(), c.trim()]));
  const seen = new Set<string>();
  const rows: Contact[] = [];
  const unknown = new Set<string>();
  for (const r of Array.isArray(input) ? input.slice(0, MAX_ROWS) : []) {
    const email = clean((r as any)?.email, 200);
    const raw = clean((r as any)?.country, 60);
    if (!email || !EMAIL_RE.test(email) || !raw) continue;
    const country = known.get(raw.toLowerCase()) ?? titleCase(raw);
    if (!known.has(raw.toLowerCase())) unknown.add(country);
    const key = `${country.toLowerCase()}|${email.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ country, email, full_name: clean((r as any)?.full_name, 120) || null, job_title: clean((r as any)?.job_title, 120) || null });
  }
  return { rows, unknownCountries: [...unknown] };
}

/** What has to change so the table matches the sheet, or why it must not. */
export function planSync(current: Current[], incoming: Contact[]) {
  if (!incoming.length) return { error: 'The Finance tab has no rows with an email address. Nothing was changed.' };
  const has = new Set(incoming.map((c) => c.country.toLowerCase()));
  const emptied = [...new Set(current.map((c) => c.country))].filter((c) => !has.has(c.toLowerCase()));
  if (emptied.length) {
    return { error: `The Finance tab has nobody for ${emptied.join(', ')}. Nothing was changed, so their BCC keeps working. If that is right, clear them on the GM Emails page.` };
  }
  const k = (c: Contact) => `${c.country.toLowerCase()}|${c.email.toLowerCase()}`;
  const now = new Map(current.map((c) => [k(c), c]));
  const next = new Map(incoming.map((c) => [k(c), c]));
  const add = incoming.filter((c) => !now.has(k(c)));
  const remove = current.filter((c) => !next.has(k(c))).map((c) => c.id);
  const update = current
    .filter((c) => next.has(k(c)))
    .map((c) => ({ c, n: next.get(k(c))! }))
    .filter(({ c, n }) => c.full_name !== n.full_name || c.job_title !== n.job_title || c.email !== n.email)
    .map(({ c, n }) => ({ id: c.id, full_name: n.full_name, job_title: n.job_title, email: n.email }));
  return { add, remove, update };
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const sameText = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const record = async (status: Record<string, unknown>) => {
    await sb.from('app_settings').upsert(
      { key: STATUS_KEY, value: { at: new Date().toISOString(), ...status }, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    );
  };

  try {
    const given = req.headers.get('x-sync-key') || '';
    const { data: stored } = await sb.from('integration_keys').select('key_sha256').eq('name', KEY_NAME).maybeSingle();
    if (!given || !stored?.key_sha256 || !sameText(await sha256(given), stored.key_sha256)) {
      return json({ ok: false, error: 'Wrong or missing sync key' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { data: props } = await sb.from('properties').select('country');
    const knownCountries = [...new Set((props ?? []).map((p: any) => String(p.country || '').trim()).filter(Boolean))];
    const { rows, unknownCountries } = cleanRows(body.rows, knownCountries);
    const { data: current, error: readErr } = await sb.from('finance_contacts').select('id, country, full_name, email, job_title');
    if (readErr) throw readErr;

    const plan = planSync((current ?? []) as Current[], rows);
    if ('error' in plan) {
      if (!body.dryRun) await record({ ok: false, error: plan.error });
      return json({ ok: false, error: plan.error });
    }
    const summary = { total: rows.length, added: plan.add.length, removed: plan.remove.length, updated: plan.update.length, unknownCountries };
    if (body.dryRun) return json({ ok: true, dryRun: true, ...summary });

    if (plan.remove.length) {
      const { error } = await sb.from('finance_contacts').delete().in('id', plan.remove);
      if (error) throw error;
    }
    if (plan.add.length) {
      const { error } = await sb.from('finance_contacts').insert(plan.add.map((c) => ({ ...c, active: true })));
      if (error) throw error;
    }
    for (const u of plan.update) {
      const { error } = await sb.from('finance_contacts')
        .update({ full_name: u.full_name, job_title: u.job_title, email: u.email, updated_at: new Date().toISOString() })
        .eq('id', u.id);
      if (error) throw error;
    }
    await record({ ok: true, ...summary });
    return json({ ok: true, ...summary });
  } catch (e) {
    console.error('sync-finance-contacts error:', e);
    const error = e instanceof Error ? e.message : 'Unknown error';
    await record({ ok: false, error }).catch(() => {});
    return json({ ok: false, error }, 500);
  }
});
