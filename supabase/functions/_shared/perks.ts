// Perks marketing picks when approving a creator stay (Creatorhub Updates
// brief, Nov 2026). Shared by the CS email, the creator confirmation (which the
// GM is CC'd on) and the 48-hour pre-arrival email so they all say the same.

export type PerkFields = {
  fnb_perk?: string | null;      // 'half_off' | 'fixed' | null (bookings approved before perks existed)
  fnb_amount?: string | null;    // free text with its currency, e.g. "$20" or "500 THB"
  activity_perk?: string | null; // activity title from the Experience Dashboard
};

export const PERK_COLUMNS = 'fnb_perk, fnb_amount, activity_perk';

// Bookings approved before perks existed always had 50% off, so that stays the default.
export const DEFAULT_FNB = '50% off all food and beverage';

/** "50% off all food and beverage", "$20 off food and beverage", or null if none was recorded. */
export function fnbText(p?: PerkFields | null): string | null {
  if (!p?.fnb_perk) return null;
  if (p.fnb_perk === 'fixed') {
    const amount = String(p.fnb_amount || '').trim();
    return amount ? `${amount} off food and beverage` : 'A fixed amount off food and beverage';
  }
  return DEFAULT_FNB;
}

export function activityText(p?: PerkFields | null): string | null {
  const a = String(p?.activity_perk || '').trim();
  return a || null;
}

/** Everything chosen, in order: food and beverage first, then the activity. Empty for older bookings. */
export function perkList(p?: PerkFields | null): string[] {
  return [fnbText(p), activityText(p)].filter((x): x is string => Boolean(x));
}
