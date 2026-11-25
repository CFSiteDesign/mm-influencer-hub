// Partner Hub helpers shared by the edge functions (brief PARTNER_HUB_BRIEF.md).
// A partner is an applicant with creator_type 'Partner'. Partners promote
// Mad Monkey for a code like creators do, but have their own deal and no
// free-stay features.

export const PARTNER_CONTACTS = ['hayley@madmonkeyhostels.com', 'katrina@madmonkeyhostels.com'];
export const PARTNER_FROM = 'Mad Monkey Partner Hub <hello@creatorhub.madmonkeyhostels.com>';
export const DEFAULT_RATE = 10;

export const PARTNER_CATEGORIES: Record<string, string> = {
  hostel: 'Hostel or hotel',
  travel: 'Travel brand, transport or tours',
  work_volunteer: 'Work or volunteer abroad',
  community_media: 'Community or media',
  other: 'Other',
};

export const isPartner = (a: { creator_type?: string | null } | null | undefined) =>
  String(a?.creator_type ?? '').trim() === 'Partner';

/** A stored percentage, or the creator default when it was never set. */
export function rate(value: unknown, fallback = DEFAULT_RATE): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : fallback;
}

/** 10 -> "10%", 12.5 -> "12.5%". */
export const pct = (n: number) => `${Number.isInteger(n) ? n : Number(n.toFixed(2))}%`;

export const firstNameOf = (name: unknown) => String(name ?? '').trim().split(/\s+/)[0] || 'there';

/** Who to greet: the named contact if there is one, otherwise the organisation. */
export const partnerGreetingName = (a: { partner_contact_name?: string | null; full_name?: string | null }) =>
  firstNameOf(a.partner_contact_name || a.full_name);

/**
 * True when the request comes from a signed-in dashboard admin. Functions
 * that change partner deals or read revenue must not trust the public
 * (anon) key that the gateway's JWT check lets through.
 */
export async function isAdminRequest(sb: any, req: Request): Promise<boolean> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const { data } = await sb.auth.getUser(token);
  const user = data?.user;
  if (!user?.id) return false;
  const { data: ok } = await sb.rpc('has_role', { _user_id: user.id, _role: 'admin' });
  return ok === true;
}
