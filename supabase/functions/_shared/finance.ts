// Creatorhub Booking Confirmation Updates (27 Nov 2026): the regional finance
// team is BCC'd on every booking confirmation for a hostel in their country.
// The team list lives in public.finance_contacts (admins only), copied from
// the Finance tab of the "Regional / Global Master List" and edited on the
// GM Emails page.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Active, valid, de-duplicated addresses, leaving out anyone already on To or CC. */
export function financeBccList(
  rows: { email?: string | null; active?: boolean | null }[],
  exclude: string[] = [],
): string[] {
  const seen = new Set(exclude.map((e) => String(e ?? '').trim().toLowerCase()).filter(Boolean));
  const out: string[] = [];
  for (const r of rows) {
    const email = String(r.email ?? '').trim();
    if (!email || r.active === false || !EMAIL_RE.test(email)) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

/** The finance team to BCC for a booking at `property` (a location name such as "Uluwatu"). */
export async function financeBccFor(
  sb: any,
  property: string,
  exclude: string[] = [],
): Promise<{ country: string | null; bcc: string[] }> {
  const name = String(property ?? '').trim();
  if (!name) return { country: null, bcc: [] };
  const { data: prop } = await sb.from('properties').select('country')
    .ilike('location', name.replace(/[\\%_]/g, (c: string) => `\\${c}`))
    .limit(1).maybeSingle();
  const country: string | null = prop?.country ?? null;
  if (!country) return { country: null, bcc: [] };
  const { data: rows } = await sb.from('finance_contacts').select('email, active').eq('country', country);
  return { country, bcc: financeBccList(rows ?? [], exclude) };
}
