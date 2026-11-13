import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// "{CODE} has gone quiet": a check-in email to creators whose code earned
// nothing in the last 3 full months (Creatorhub Updates brief, Nov 2026).
//
// Revenue comes from the Revenue Hub (code-activity), which syncs the codes
// report every hour. It stores month NAMES with no year, so every run also
// keeps a dated copy in code_revenue_snapshots; a window that crosses New Year
// then reads December from the copy even after the sheet starts a new year.
//
// Who gets it: an active code, older than the window (created before its
// first month), on a creator who is not deleted or a test, with no revenue and
// no bookings in the window, and not emailed in the last 90 days. One email
// per creator; with several quiet codes, their newest code is used. Codes in
// app_settings quiet_code_checkins.exclude (e.g. internal test codes) are
// never emailed, by hand or automatically.
//
// Calls:
//   dashboard (signed-in user)   { action: 'preview' }              who would get it, nothing sent
//                                { action: 'send', codes: [...] }    send to those codes (must be eligible)
//   daily pg_cron (x-cron-secret) {}                                 refresh the dated copy; on the 3rd of
//                                                                    the month, send to everyone eligible
//                                                                    if auto sending is switched on
//                                { action: 'preview' }               same as the dashboard preview

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const REVENUE_URL = 'https://jtiawsakiidtfobophyv.supabase.co/functions/v1/code-activity';
const WINDOW_MONTHS = 3;
const COOLDOWN_DAYS = 90;
const SEND_DAY = 3;            // day of the month (Bangkok time) the automatic run sends
const TZ_OFFSET_HOURS = 7;     // Bangkok
const PAGE = 1000;
const BATCH = 100;             // Resend batch limit

const LOGO = 'https://ravecomtupiyurjezwji.supabase.co/storage/v1/object/public/email-assets/logo.png';
const AGREEMENT = 'https://madmonkey-wp.sgp1.cdn.digitaloceanspaces.com/creator-hub-commission-agreement.pdf';

const normalizeCronSecret = (value: string | null) => {
  const trimmed = value?.trim() ?? '';
  return /^[0-9a-fA-F]{64}$/.test(trimmed) ? trimmed.toLowerCase() : trimmed;
};
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const num = (v: unknown) => Number(v) || 0;

type Period = { key: string; year: number; month: number }; // month 0-11
const periodOf = (year: number, month: number): Period => {
  const d = new Date(Date.UTC(year, month, 1));
  return { key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, year: d.getUTCFullYear(), month: d.getUTCMonth() };
};

/** "Now" in Bangkok, as a Date whose UTC fields read as Bangkok wall time. */
const bangkokNow = () => new Date(Date.now() + TZ_OFFSET_HOURS * 3_600_000);

export function windowFor(now: Date) {
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const months = Array.from({ length: WINDOW_MONTHS }, (_, i) => periodOf(y, m - WINDOW_MONTHS + i));
  const current = periodOf(y, m);
  // Codes must exist for the whole window: created before its first day (Bangkok).
  const startsAt = new Date(Date.UTC(months[0].year, months[0].month, 1) - TZ_OFFSET_HOURS * 3_600_000);
  return { months, current, startsAt };
}

/** Email copy is Cai's, verbatim; the table is the "Affiliates" image from the brief, rebuilt in HTML so it shows even with images off. */
export function buildEmail(code: string, firstName: string) {
  const td = 'padding:14px 12px;font-size:14px;line-height:1.4;vertical-align:middle;border-top:2px solid #111827;';
  const rows = [
    ['BEDS', '', '10% discount', '10% commission', '#f6efdc'],
    ['TOURS', '', '10% discount', '10% commission', '#f3dcfb'],
    ['SURF CAMPS', 'selected creators only', '10% discount', '$30 flat fee', '#f6efdc'],
    ['ALL IN<br/>14-day trip', '', '2 free hostel nights + entry into a draw to win another 14-day trip', '$50 flat fee', '#f3dcfb'],
    ['ALL IN<br/>7-day trip', '', '2 free hostel nights + entry into a draw to win another 7-day trip', '$25 flat fee', '#f6efdc'],
  ].map(([product, note, guest, earns, bg]) => `
          <tr style="background:${bg};">
            <td style="${td}font-weight:800;color:#111827;">${product}${note ? `<br/><span style="font-weight:400;font-style:italic;font-size:12px;">${note}</span>` : ''}</td>
            <td style="${td}color:#111827;">${guest}</td>
            <td style="${td}color:#a020f0;font-weight:600;">${earns}</td>
          </tr>`).join('');

  const table = `
      <div style="margin:4px 0 24px;text-align:center;">
        <p style="margin:0;font-size:24px;line-height:1.2;font-weight:900;color:#a020f0;letter-spacing:0.5px;">AFFILIATES, AFFILIATES, AFFILIATES</p>
        <p style="margin:6px 0 14px;font-size:15px;color:#111827;">What can you actually offer your audience?</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0;border:2px solid #111827;border-radius:12px;overflow:hidden;text-align:left;">
          <tr style="background:#f3dcfb;">
            <td style="padding:14px 12px;font-size:13px;font-weight:800;color:#ff1fa8;letter-spacing:0.5px;">PRODUCT</td>
            <td style="padding:14px 12px;font-size:13px;font-weight:800;color:#ff1fa8;letter-spacing:0.5px;">GUEST RECEIVES</td>
            <td style="padding:14px 12px;font-size:13px;font-weight:800;color:#ff1fa8;letter-spacing:0.5px;">CREATOR EARNS</td>
          </tr>${rows}
        </table>
      </div>`;

  const p = (html: string, mb = 16) => `<p style="font-size:15px;color:#374151;margin:0 0 ${mb}px;line-height:1.7;">${html}</p>`;
  const subject = `${code} has gone quiet`;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <div style="background-color:#ffffff;padding:32px 40px;text-align:center;border-bottom:3px solid #e54fcc;">
      <img src="${LOGO}" alt="Mad Monkey" width="200" style="width:200px;max-width:100%;height:auto;" />
    </div>
    <div style="height:4px;background:linear-gradient(90deg,#e54fcc,#f078db);"></div>
    <div style="padding:36px 40px 28px;">
      ${p(`Hey ${esc(firstName)},`)}
      ${p(`Your code <strong>${esc(code)}</strong> hasn&rsquo;t been used in a while.`)}
      ${p('Don&rsquo;t forget to share your code with your audience to earn, even when you&rsquo;re not traveling! See the breakdown here:', 20)}
      ${table}
      <p style="font-size:15px;color:#374151;margin:0 0 4px;line-height:1.6;">Best,</p>
      <p style="font-size:16px;color:#000000;margin:0;font-weight:700;">The Mad Monkey Creator Hub Team</p>
    </div>
    <div style="background-color:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="font-size:11px;color:#6b7280;margin:0 0 14px;line-height:1.5;text-align:left;"><strong>Important:</strong> All commissions must be claimed within 3 months of being awarded via invoice. For the avoidance of doubt, all commissions awarded in January must be invoiced by 11th April. Full terms and conditions <a href="${AGREEMENT}" style="color:#e54fcc;">here</a>.</p>
      <p style="font-size:11px;color:#9ca3af;margin:0;">For questions, contact <a href="mailto:creatorhub@madmonkeyhostels.com" style="color:#e54fcc;">creatorhub@madmonkeyhostels.com</a></p>
    </div>
  </div>
</body></html>`;
  return { subject, html };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Auth: the daily cron sends the shared secret; the dashboard sends a signed-in user's token.
  let caller: 'cron' | 'user' = 'user';
  let userEmail: string | null = null;
  const cronHeader = req.headers.get('x-cron-secret');
  if (cronHeader) {
    const { data: vaultSecret, error: vaultErr } = await sb.rpc('get_cron_secret');
    if (vaultErr) return json({ ok: false, error: 'cron secret unavailable' }, 503);
    const expected = normalizeCronSecret(typeof vaultSecret === 'string' ? vaultSecret : null);
    if (!expected || normalizeCronSecret(cronHeader) !== expected) return json({ ok: false, error: 'forbidden' }, 403);
    caller = 'cron';
  } else {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: { user } } = token ? await sb.auth.getUser(token) : { data: { user: null } };
    if (!user) return json({ ok: false, error: 'Sign in to the dashboard first' }, 401);
    userEmail = user.email ?? null;
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body from cron */ }
  const action: string = body?.action || (caller === 'cron' ? 'run' : 'preview');
  if (!['preview', 'send', 'run'].includes(action)) return json({ ok: false, error: 'Unknown action' }, 400);
  if (action === 'run' && caller !== 'cron') return json({ ok: false, error: 'forbidden' }, 403);

  try {
    const now = bangkokNow();
    const { months, current, startsAt } = windowFor(now);
    const wanted = [...months, current];

    // 1. Revenue for the window (and this month, to keep the dated copy fresh).
    const SECRET = Deno.env.get('REVENUE_TRACKER_API_SECRET');
    if (!SECRET) return json({ ok: false, error: 'REVENUE_TRACKER_API_SECRET not configured' });
    const revRes = await fetch(REVENUE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-secret': SECRET },
      body: JSON.stringify({ months: [...new Set(wanted.map((p) => MONTHS[p.month]))] }),
    });
    const rev = await revRes.json().catch(() => ({}));
    if (!revRes.ok || !rev?.ok) return json({ ok: false, error: `Revenue Hub: ${rev?.error || revRes.status}` });

    // Month name -> the period it means right now (the window never spans more than a year).
    const byName = new Map(wanted.map((p) => [MONTHS[p.month], p]));
    const live = new Map<string, { revenue: number; bookings: number }>(); // `${code}|${period}`
    for (const r of rev.rows ?? []) {
      const per = byName.get(r.month);
      const code = String(r.code || '').trim().toLowerCase();
      if (!per || !code) continue;
      const k = `${code}|${per.key}`;
      const prev = live.get(k) || { revenue: 0, bookings: 0 };
      live.set(k, { revenue: prev.revenue + num(r.revenue), bookings: prev.bookings + num(r.bookings) });
    }

    // 2. Dated copy: keep the higher figure, so a sheet reset can't wipe a month.
    const keys = wanted.map((p) => p.key);
    const snaps = new Map<string, { revenue: number; bookings: number }>();
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb.from('code_revenue_snapshots')
        .select('code, period, revenue, bookings').in('period', keys)
        .order('code').order('period').range(from, from + PAGE - 1);
      if (error) throw error;
      for (const s of data ?? []) snaps.set(`${s.code}|${s.period}`, { revenue: num(s.revenue), bookings: num(s.bookings) });
      if (!data || data.length < PAGE) break;
    }
    const merged = new Map(snaps);
    const upserts: any[] = [];
    for (const [k, v] of live) {
      const s = snaps.get(k);
      const m = { revenue: Math.max(v.revenue, s?.revenue ?? 0), bookings: Math.max(v.bookings, s?.bookings ?? 0) };
      merged.set(k, m);
      if (!s || m.revenue !== s.revenue || m.bookings !== s.bookings) {
        const [code, period] = k.split('|');
        upserts.push({ code, period, revenue: m.revenue, bookings: m.bookings, captured_at: new Date().toISOString() });
      }
    }
    // Every code the Revenue Hub knows gets a row per month, even at zero, so "no data" can be told apart from "quiet".
    for (let i = 0; i < upserts.length; i += 500) {
      const { error } = await sb.from('code_revenue_snapshots').upsert(upserts.slice(i, i + 500), { onConflict: 'code,period' });
      if (error) throw error;
    }

    // 3. Who is quiet.
    const codes: any[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb.from('creator_codes')
        .select('code, created_at, creator_name, creator_email, active, applicant_id, applicants(full_name, email, flow, deleted_at)')
        .order('created_at').range(from, from + PAGE - 1);
      if (error) throw error;
      codes.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }
    const since = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000).toISOString();
    const { data: recent, error: recentErr } = await sb.from('code_checkins')
      .select('code, creator_email').eq('status', 'sent').gte('sent_at', since);
    if (recentErr) throw recentErr;
    const recentCodes = new Set((recent ?? []).map((r) => String(r.code).toLowerCase()));
    const recentEmails = new Set((recent ?? []).map((r) => String(r.creator_email).toLowerCase()));

    const { data: setting } = await sb.from('app_settings').select('value').eq('key', 'quiet_code_checkins').maybeSingle();
    const auto = Boolean((setting?.value as any)?.auto);
    const excluded = new Set(((setting?.value as any)?.exclude ?? []).map((c: unknown) => String(c).trim().toLowerCase()));

    const counts = { active_codes: 0, too_new: 0, earning: 0, no_data: 0, recently_emailed: 0, excluded: 0, quiet: 0 };
    const quietByEmail = new Map<string, any>();
    for (const c of codes) {
      const a = c.applicants || {};
      if (c.active === false || a.deleted_at || a.flow === 'test') continue;
      const email = String(c.creator_email || a.email || '').trim().toLowerCase();
      if (!email) continue;
      counts.active_codes++;
      if (new Date(c.created_at) >= startsAt) { counts.too_new++; continue; }
      const code = String(c.code).trim();
      const lc = code.toLowerCase();
      if (excluded.has(lc)) { counts.excluded++; continue; }
      const cells = months.map((p) => merged.get(`${lc}|${p.key}`));
      if (cells.every((x) => !x)) { counts.no_data++; continue; }
      if (cells.some((x) => x && (x.revenue > 0 || x.bookings > 0))) { counts.earning++; continue; }
      if (recentCodes.has(lc) || recentEmails.has(email)) { counts.recently_emailed++; continue; }
      const name = String(c.creator_name || a.full_name || '').trim();
      const prev = quietByEmail.get(email);
      if (!prev || new Date(c.created_at) > new Date(prev.created_at)) {
        quietByEmail.set(email, { code, name, first_name: name.split(/\s+/)[0] || 'there', email, created_at: c.created_at, applicant_id: c.applicant_id });
      }
    }
    const recipients = [...quietByEmail.values()].sort((x, y) => x.code.localeCompare(y.code));
    counts.quiet = recipients.length;

    const windowInfo = { start: months[0].key, end: months[months.length - 1].key, months: months.map((p) => `${MONTHS[p.month]} ${p.year}`) };
    const base = { window: windowInfo, synced_at: rev.synced_at ?? null, counts, auto, send_day: SEND_DAY };

    // 4. Send, if asked.
    let toSend: any[] = [];
    let trigger = 'manual';
    if (action === 'send') {
      const pick = new Set((Array.isArray(body.codes) ? body.codes : []).map((c: unknown) => String(c).trim().toLowerCase()));
      if (!pick.size) return json({ ok: false, error: 'Pick at least one code to send to' }, 400);
      toSend = recipients.filter((r) => pick.has(r.code.toLowerCase()));
    } else if (action === 'run' && auto && now.getUTCDate() === SEND_DAY) {
      toSend = recipients;
      trigger = 'auto';
    }
    if (!toSend.length) {
      return json({ ok: true, ...base, recipients: action === 'run' ? recipients.length : recipients, sent: 0, failed: 0 });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) return json({ ok: false, error: 'RESEND_API_KEY not configured' });
    const REPLY_TO = Deno.env.get('CREATOR_REPLY_TO') || 'creatorhub@madmonkeyhostels.com';
    let sent = 0, failed = 0;
    for (let i = 0; i < toSend.length; i += BATCH) {
      const chunk = toSend.slice(i, i + BATCH);
      const emails = chunk.map((r) => {
        const { subject, html } = buildEmail(r.code, r.first_name);
        return { from: 'Mad Monkey Creator Hub <hello@creatorhub.madmonkeyhostels.com>', to: [r.email], reply_to: REPLY_TO, subject, html };
      });
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(emails),
      });
      const out = await res.json().catch(() => ({}));
      const err = res.ok ? null : `Resend ${res.status}: ${JSON.stringify(out)}`.slice(0, 500);
      if (res.ok) sent += chunk.length; else failed += chunk.length;
      const at = new Date().toISOString();
      await sb.from('code_checkins').insert(chunk.map((r) => ({
        code: r.code, applicant_id: r.applicant_id, creator_name: r.name || null, creator_email: r.email,
        window_start: windowInfo.start, window_end: windowInfo.end, trigger,
        status: res.ok ? 'sent' : 'failed', error: err, sent_by: caller === 'cron' ? 'auto' : userEmail, sent_at: at,
      })));
      await sb.from('email_send_log').insert(chunk.map((r) => ({
        recipient_email: r.email, template_name: 'quiet-code-checkin',
        status: res.ok ? 'sent' : 'failed', error_message: err,
        metadata: { code: r.code, creatorName: r.name, window: windowInfo, trigger },
      })));
    }
    console.log(`send-quiet-code-checkins (${trigger}): sent ${sent}, failed ${failed}`);
    return json({ ok: failed === 0, ...base, sent, failed });
  } catch (e) {
    console.error('send-quiet-code-checkins error:', e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' });
  }
});
