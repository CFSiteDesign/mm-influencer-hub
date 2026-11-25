import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Pencil, RefreshCw } from 'lucide-react';
import PartnerFields, { emptyPartnerFields, partnerFieldsToRow } from './PartnerFields';
import {
  PARTNER_OWNER_DEFAULT, audienceLabel, categoryLabel, channelLabels, dealSummary, parseRate, partnerName, pct, rateOf,
} from '@/lib/partners';

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="text-foreground text-sm sm:text-base break-words">{children || '—'}</div>
    </div>
  );
}

/** Keeps the Revenue Hub in step: partner flag (Partner ID wording, own leaderboard) and commission %. */
export async function syncPartnerToRevenueHub(a: any, isPartnerNow: boolean) {
  if (!a?.creator_code || !a?.creator_id) return;
  const { data, error } = await supabase.functions.invoke('sync-creator-revenue', {
    body: {
      code: a.creator_code,
      name: isPartnerNow ? partnerName(a) : a.full_name,
      creator_id: a.creator_id,
      is_partner: isPartnerNow,
      commission_pct: isPartnerNow ? rateOf(a.commission_pct) : null,
    },
  });
  if (error || (data && typeof data.status === 'number' && data.status >= 400 && data.status !== 409)) {
    console.error('Revenue Hub sync failed', error || data);
    toast.warning('Saved, but the Revenue Hub did not update. Try saving again.');
  }
}

export function PartnerDetailsCard({ applicant, onSaved }: { applicant: any; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState(emptyPartnerFields(applicant));
  const [commission, setCommission] = useState(String(rateOf(applicant.commission_pct)));
  const [discount, setDiscount] = useState(String(rateOf(applicant.guest_discount_pct)));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) {
      setFields(emptyPartnerFields(applicant));
      setCommission(String(rateOf(applicant.commission_pct)));
      setDiscount(String(rateOf(applicant.guest_discount_pct)));
    }
  }, [applicant, editing]);

  const save = async () => {
    const c = parseRate(commission);
    const d = parseRate(discount);
    if (c === null || d === null) return toast.error('Commission and discount must be numbers from 0 to 100');
    const row = partnerFieldsToRow(fields);
    setBusy(true);
    try {
      const update = {
        ...row,
        ...(row.org_name ? { full_name: row.org_name } : {}),
        commission_pct: c,
        guest_discount_pct: d,
      };
      const { error } = await supabase.from('applicants').update(update as any).eq('id', applicant.id);
      if (error) throw error;
      const next = { ...applicant, ...update };
      await syncPartnerToRevenueHub(next, true);
      if (applicant.creator_code && d !== rateOf(applicant.guest_discount_pct)) {
        toast.warning(`Ask the codes team to change the guest discount on ${applicant.creator_code} to ${pct(d)}.`, { duration: 10000 });
      }
      toast.success('Partner details saved');
      setEditing(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base sm:text-lg">Partner details</CardTitle>
        {!editing && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
        )}
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        {editing ? (
          <div className="space-y-4">
            <PartnerFields value={fields} onChange={setFields} idPrefix="edit" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-commission">Commission %</Label>
                <Input id="edit-commission" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-discount">Guest discount %</Label>
                <Input id="edit-discount" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
            </div>
            {applicant.creator_code && (
              <p className="text-xs text-muted-foreground">
                A new commission % reaches the Revenue Hub when you save. A new guest discount does not change the code itself: the codes team has to update it.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Row label="Deal"><span className="font-semibold">{dealSummary(applicant)}</span></Row>
            <Row label="Organisation">{partnerName(applicant)}</Row>
            <Row label="Partner type">{categoryLabel(applicant.partner_category)}</Row>
            <Row label="Contact">
              {applicant.partner_contact_name
                ? `${applicant.partner_contact_name}${applicant.partner_contact_role ? `, ${applicant.partner_contact_role}` : ''}`
                : null}
            </Row>
            <Row label="Website">
              {applicant.website
                ? <a href={applicant.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{applicant.website}</a>
                : null}
            </Row>
            <Row label="Country or regions">{applicant.partner_regions || applicant.city_country}</Row>
            <Row label="How they share the code">{channelLabels(applicant.promotion_channels).join(', ')}</Row>
            <Row label="Rough audience size">{audienceLabel(applicant.audience_size)}</Row>
            <Row label="Owner at Mad Monkey">{applicant.partner_owner || PARTNER_OWNER_DEFAULT}</Row>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type MonthRow = { month: string; gross: number; allin: number; revenue: number; bookings: number };

/** Revenue this year for the partner's codes, from the Revenue Hub. */
export function PartnerRevenueCard({ applicant }: { applicant: any }) {
  const [state, setState] = useState<{ loading: boolean; error?: string; year?: number; months?: MonthRow[]; synced_at?: string | null }>({ loading: true });

  const load = async () => {
    setState({ loading: true });
    const { data: codes } = await supabase.from('creator_codes').select('code').eq('applicant_id', applicant.id);
    const list = [...new Set([applicant.creator_code, ...(codes ?? []).map((c: any) => c.code)].filter(Boolean))];
    if (!list.length) return setState({ loading: false, error: 'No code yet.' });
    const { data, error } = await supabase.functions.invoke('code-revenue', { body: { codes: list } });
    if (error || !data?.ok) return setState({ loading: false, error: data?.error || 'Could not reach the Revenue Hub.' });
    setState({ loading: false, year: data.year, months: data.months, synced_at: data.synced_at });
  };

  useEffect(() => { load(); }, [applicant.id, applicant.creator_code]);

  const rate = rateOf(applicant.commission_pct) / 100;
  const months = (state.months ?? []).filter((m) => m.revenue > 0 || m.bookings > 0);
  const total = (state.months ?? []).reduce((s, m) => ({
    revenue: s.revenue + m.revenue, bookings: s.bookings + m.bookings, earned: s.earned + m.gross * rate + m.allin,
  }), { revenue: 0, bookings: 0, earned: 0 });

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base sm:text-lg">Revenue {state.year ?? 'this year'}</CardTitle>
        <Button variant="ghost" size="sm" onClick={load} disabled={state.loading} aria-label="Refresh revenue">
          <RefreshCw className={`h-3.5 w-3.5 ${state.loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3">
        {state.loading ? (
          <p className="text-sm text-muted-foreground">Loading from the Revenue Hub…</p>
        ) : state.error ? (
          <p className="text-sm text-muted-foreground italic">{state.error}</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div><p className="text-xs text-muted-foreground">Revenue</p><p className="text-lg font-bold">{money(total.revenue)}</p></div>
              <div><p className="text-xs text-muted-foreground">Bookings</p><p className="text-lg font-bold">{total.bookings}</p></div>
              <div><p className="text-xs text-muted-foreground">Commission ({pct(rate * 100)})</p><p className="text-lg font-bold">{money(total.earned)}</p></div>
            </div>
            {months.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No bookings with this code yet this year.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Month</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Bookings</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {months.map((m) => (
                      <TableRow key={m.month}>
                        <TableCell>{m.month}</TableCell>
                        <TableCell className="text-right">{money(m.revenue)}</TableCell>
                        <TableCell className="text-right">{m.bookings}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {state.synced_at && (
              <p className="text-xs text-muted-foreground">Revenue Hub last synced {format(new Date(state.synced_at), 'd MMM, HH:mm')}.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
