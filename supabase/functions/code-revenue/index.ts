import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { isAdminRequest } from "../_shared/partners.ts";

// Revenue this year for one partner's codes, for the "Revenue this year" card
// on a partner's page (Partner Hub, Nov 2026). Reads the Revenue Hub's
// code-activity endpoint with the shared REVENUE_TRACKER_API_SECRET.
//
// The Revenue Hub keeps month NAMES with no year and is reset each January,
// so only January up to the current month (Bangkok time) are this year's.
//
//   POST { codes: ["YELLOW4MADMONKEY"] }   (signed-in dashboard admin)
//   ->   { ok, year, months: [{ month, gross, allin, revenue, bookings }], synced_at }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const REVENUE_URL = 'https://jtiawsakiidtfobophyv.supabase.co/functions/v1/code-activity';
const num = (v: unknown) => Number(v) || 0;

/** January up to this month, in Bangkok time. */
export function monthsSoFar(now = new Date()) {
  const bkk = new Date(now.getTime() + 7 * 3_600_000);
  return { year: bkk.getUTCFullYear(), months: MONTHS.slice(0, bkk.getUTCMonth() + 1) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (!(await isAdminRequest(sb, req))) return json({ ok: false, error: 'Sign in to the dashboard first' }, 401);

    const body = await req.json().catch(() => ({}));
    const codes = (Array.isArray(body.codes) ? body.codes : []).map((c: unknown) => String(c).trim()).filter(Boolean).slice(0, 20);
    if (!codes.length) return json({ ok: false, error: 'No code to look up' }, 400);

    const secret = Deno.env.get('REVENUE_TRACKER_API_SECRET');
    if (!secret) return json({ ok: false, error: 'Revenue Hub not connected' });

    const { year, months } = monthsSoFar();
    const res = await fetch(REVENUE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-secret': secret },
      body: JSON.stringify({ months, codes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) return json({ ok: false, error: data?.error || `Revenue Hub ${res.status}` });

    const wanted = new Set(codes.map((c: string) => c.toLowerCase()));
    const byMonth = new Map(months.map((m) => [m, { month: m, gross: 0, allin: 0, revenue: 0, bookings: 0 }]));
    for (const r of data.rows ?? []) {
      if (!wanted.has(String(r.code).trim().toLowerCase())) continue;
      const row = byMonth.get(r.month);
      if (!row) continue;
      row.gross += num(r.gross ?? r.revenue);
      row.allin += num(r.allin);
      row.revenue += num(r.revenue);
      row.bookings += num(r.bookings);
    }
    return json({ ok: true, year, months: [...byMonth.values()], synced_at: data.synced_at ?? null });
  } catch (e) {
    console.error('code-revenue error:', e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' });
  }
});
