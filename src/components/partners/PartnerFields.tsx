import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AUDIENCE_SIZES, PARTNER_CATEGORIES, PROMOTION_CHANNELS } from '@/lib/partners';

// The partner details admins edit (Add partner, and the partner's page).
export type PartnerFieldValues = {
  org_name: string;
  partner_category: string;
  partner_contact_name: string;
  partner_contact_role: string;
  website: string;
  partner_regions: string;
  promotion_channels: string[];
  audience_size: string;
  partner_owner: string;
};

export const emptyPartnerFields = (a: any = {}): PartnerFieldValues => ({
  org_name: a.org_name || (a.creator_type === 'Partner' ? a.full_name : '') || '',
  partner_category: a.partner_category || '',
  partner_contact_name: a.partner_contact_name || '',
  partner_contact_role: a.partner_contact_role || '',
  website: a.website || '',
  partner_regions: a.partner_regions || a.city_country || '',
  promotion_channels: a.promotion_channels || [],
  audience_size: a.audience_size || '',
  partner_owner: a.partner_owner || '',
});

/** Turns the form into database columns (empty strings become null). */
export function partnerFieldsToRow(v: PartnerFieldValues) {
  const t = (s: string) => s.trim() || null;
  let website = v.website.trim();
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  return {
    org_name: t(v.org_name),
    partner_category: v.partner_category || null,
    partner_contact_name: t(v.partner_contact_name),
    partner_contact_role: t(v.partner_contact_role),
    website: website || null,
    partner_regions: t(v.partner_regions),
    promotion_channels: v.promotion_channels.length ? v.promotion_channels : null,
    audience_size: v.audience_size || null,
    partner_owner: t(v.partner_owner),
  };
}

export default function PartnerFields({
  value, onChange, idPrefix = 'pf',
}: {
  value: PartnerFieldValues;
  onChange: (next: PartnerFieldValues) => void;
  idPrefix?: string;
}) {
  const set = <K extends keyof PartnerFieldValues>(k: K, v: PartnerFieldValues[K]) => onChange({ ...value, [k]: v });
  const toggleChannel = (c: string, on: boolean) =>
    set('promotion_channels', on ? [...new Set([...value.promotion_channels, c])] : value.promotion_channels.filter((x) => x !== c));
  const id = (k: string) => `${idPrefix}-${k}`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={id('org')}>Organisation</Label>
        <Input id={id('org')} value={value.org_name} onChange={(e) => set('org_name', e.target.value)} placeholder="e.g. Yellow Hostels" />
      </div>
      <div className="space-y-1.5">
        <Label>Partner type</Label>
        <Select value={value.partner_category} onValueChange={(v) => set('partner_category', v)}>
          <SelectTrigger aria-label="Partner type"><SelectValue placeholder="Choose a type" /></SelectTrigger>
          <SelectContent>
            {PARTNER_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id('web')}>Website</Label>
        <Input id={id('web')} value={value.website} onChange={(e) => set('website', e.target.value)} placeholder="yellowhostels.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id('contact')}>Contact name</Label>
        <Input id={id('contact')} value={value.partner_contact_name} onChange={(e) => set('partner_contact_name', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id('role')}>Contact role</Label>
        <Input id={id('role')} value={value.partner_contact_role} onChange={(e) => set('partner_contact_role', e.target.value)} placeholder="e.g. Marketing manager" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id('regions')}>Country or regions</Label>
        <Input id={id('regions')} value={value.partner_regions} onChange={(e) => set('partner_regions', e.target.value)} placeholder="e.g. Portugal, Spain" />
      </div>
      <div className="space-y-1.5">
        <Label>Rough audience size</Label>
        <Select value={value.audience_size} onValueChange={(v) => set('audience_size', v)}>
          <SelectTrigger aria-label="Rough audience size"><SelectValue placeholder="Choose a size" /></SelectTrigger>
          <SelectContent>
            {AUDIENCE_SIZES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>How they will share the code</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PROMOTION_CHANNELS.map((c) => (
            <label key={c.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={value.promotion_channels.includes(c.value)} onCheckedChange={(v) => toggleChannel(c.value, v === true)} />
              {c.label}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={id('owner')}>Owner at Mad Monkey</Label>
        <Input id={id('owner')} value={value.partner_owner} onChange={(e) => set('partner_owner', e.target.value)} placeholder="Hayley and Katrina" />
      </div>
    </div>
  );
}
