import { describe, expect, it } from 'vitest';
import {
  dealSummary, inviteUrl, isPartner, makeInviteToken, parseRate, partnerCodeSeed, partnerName, pct, rateOf,
} from '@/lib/partners';
import { emptyPartnerFields, partnerFieldsToRow } from '@/components/partners/PartnerFields';
import { parseName } from '@/lib/code-gen';

describe('Partner Hub helpers', () => {
  it('knows a partner from a creator', () => {
    expect(isPartner({ creator_type: 'Partner' })).toBe(true);
    expect(isPartner({ creator_type: 'Content Creator' })).toBe(false);
    expect(isPartner(null)).toBe(false);
    expect(isPartner({})).toBe(false);
  });

  it('defaults an unset rate to 10 and keeps 0', () => {
    expect(rateOf(null)).toBe(10);
    expect(rateOf(undefined)).toBe(10);
    expect(rateOf('')).toBe(10);
    expect(rateOf(0)).toBe(0);
    expect(rateOf('12.5')).toBe(12.5);
    expect(rateOf(140)).toBe(10);
  });

  it('parses typed percentages and rejects nonsense', () => {
    expect(parseRate('10')).toBe(10);
    expect(parseRate(' 12.5% ')).toBe(12.5);
    expect(parseRate('0')).toBe(0);
    expect(parseRate('100')).toBe(100);
    expect(parseRate('101')).toBeNull();
    expect(parseRate('-5')).toBeNull();
    expect(parseRate('ten')).toBeNull();
    expect(parseRate('')).toBeNull();
  });

  it('describes the deal', () => {
    expect(dealSummary({ commission_pct: 10, guest_discount_pct: 10 })).toBe('10% off for guests, 10% commission');
    expect(dealSummary({ commission_pct: 15, guest_discount_pct: 0 })).toBe('No guest discount, 15% commission');
    expect(dealSummary({})).toBe('10% off for guests, 10% commission');
    expect(pct(12.5)).toBe('12.5%');
  });

  it('lists partners under the organisation and builds codes from it', () => {
    expect(partnerName({ org_name: 'A&O Hostels', full_name: 'Anna' })).toBe('A&O Hostels');
    expect(partnerName({ full_name: 'Yellow Hostels' })).toBe('Yellow Hostels');
    expect(partnerCodeSeed({ org_name: 'A&O Hostels' })).toBe('AOHostels');
    expect(partnerCodeSeed({ org_name: 'Isaac Caleb Travel & Tours' })).toBe('IsaacCalebTravelTours');
    expect(partnerCodeSeed({ org_name: 'Lás Golondrinas' })).toBe('LasGolondrinas');
    // The code generator takes the seed as one word: Aohostels10, like the existing partner codes.
    expect(parseName(partnerCodeSeed({ org_name: 'A&O Hostels' })).firstName + '10').toBe('Aohostels10');
    expect(parseName(partnerCodeSeed({ org_name: 'Sharebus' })).firstName + '10').toBe('Sharebus10');
  });

  it('makes unguessable, URL-safe invite links on the partners page', () => {
    const a = makeInviteToken();
    const b = makeInviteToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(a).not.toBe(b);
    expect(inviteUrl(a)).toBe(`https://madmonkeyhostels.com/creatorhub/partners?invite=${a}`);
  });

  it('turns the admin form into columns', () => {
    const v = { ...emptyPartnerFields(), org_name: ' Yellow ', website: 'yellowhostels.com', promotion_channels: ['front_desk'] };
    const row = partnerFieldsToRow(v);
    expect(row.org_name).toBe('Yellow');
    expect(row.website).toBe('https://yellowhostels.com');
    expect(row.partner_contact_name).toBeNull();
    expect(row.promotion_channels).toEqual(['front_desk']);
    expect(partnerFieldsToRow(emptyPartnerFields()).promotion_channels).toBeNull();
    // An existing partner with no org name yet starts from its listed name.
    expect(emptyPartnerFields({ creator_type: 'Partner', full_name: 'SHAREBUS10' }).org_name).toBe('SHAREBUS10');
  });
});
