// Partner Hub (PARTNER_HUB_BRIEF.md, decisions 25 Nov 2026).
// A partner is an applicant with creator_type 'Partner': hostels, travel
// brands, volunteer orgs and communities who promote Mad Monkey for a code.
// They share the code engine and Revenue Hub with creators, have their own
// deal, and get none of the free-stay features.

export const DEFAULT_RATE = 10;

/**
 * The partner apply page (public since 27 Nov 2026, not linked from the site).
 * On madmonkeyhostels.com this app is
 * served under /creatorhub/apply (plain /creatorhub is the separate landing
 * page and 404s on /creatorhub/partners), so the partner page is
 * /creatorhub/apply/partners. Checked live 25 Nov 2026.
 */
export const PARTNER_APPLY_URL = 'https://madmonkeyhostels.com/creatorhub/apply/partners';

export const PARTNER_CATEGORIES = [
  { value: 'hostel', label: 'Hostel or hotel' },
  { value: 'travel', label: 'Travel brand, transport or tours' },
  { value: 'work_volunteer', label: 'Work or volunteer abroad' },
  { value: 'community_media', label: 'Community or media' },
  { value: 'other', label: 'Other' },
] as const;

export const PROMOTION_CHANNELS = [
  { value: 'front_desk', label: 'Front desk or reception' },
  { value: 'newsletter', label: 'Newsletter or email list' },
  { value: 'website', label: 'Website' },
  { value: 'social', label: 'Social media' },
  { value: 'group_trips', label: 'Group trips or tours' },
  { value: 'other', label: 'Other' },
] as const;

export const AUDIENCE_SIZES = [
  { value: 'under_1k', label: 'Under 1,000' },
  { value: '1k_10k', label: '1,000 to 10,000' },
  { value: '10k_50k', label: '10,000 to 50,000' },
  { value: '50k_plus', label: 'Over 50,000' },
] as const;

export const PARTNER_OWNER_DEFAULT = 'Hayley and Katrina';

const labelOf = (list: readonly { value: string; label: string }[], v: string | null | undefined) =>
  list.find((x) => x.value === v)?.label ?? null;
export const categoryLabel = (v?: string | null) => labelOf(PARTNER_CATEGORIES, v);
export const audienceLabel = (v?: string | null) => labelOf(AUDIENCE_SIZES, v);
export const channelLabels = (vs?: string[] | null) =>
  (vs ?? []).map((v) => labelOf(PROMOTION_CHANNELS, v) ?? v);

export const isPartner = (a: { creator_type?: string | null } | null | undefined) =>
  String(a?.creator_type ?? '').trim() === 'Partner';

/** A stored percentage, or the creator default of 10 when it was never set. */
export function rateOf(value: unknown, fallback = DEFAULT_RATE): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : fallback;
}

/** Parses a typed percentage. Returns null when it is not a number from 0 to 100. */
export function parseRate(input: string): number | null {
  const t = input.trim().replace(/%$/, '').trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return n >= 0 && n <= 100 ? n : null;
}

export const pct = (n: number) => `${Number.isInteger(n) ? n : Number(n.toFixed(2))}%`;

/** "10% off, 10% commission" / "No guest discount, 10% commission". */
export function dealSummary(a: { commission_pct?: unknown; guest_discount_pct?: unknown }) {
  const d = rateOf(a.guest_discount_pct);
  const c = rateOf(a.commission_pct);
  return `${d > 0 ? `${pct(d)} off for guests` : 'No guest discount'}, ${pct(c)} commission`;
}

/** The name partners are listed under: their organisation if we have it. */
export const partnerName = (a: { org_name?: string | null; full_name?: string | null }) =>
  (a.org_name || a.full_name || '').trim();

/**
 * Seed for the code generator. Partner codes are the organisation name with
 * spaces and symbols removed plus 10 (Sharebus10, Aohostels10), so the
 * generator gets one word instead of a first name.
 */
export const partnerCodeSeed = (a: { org_name?: string | null; full_name?: string | null }) =>
  partnerName(a).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z]/g, '');
