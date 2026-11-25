import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import PartnerFields, { emptyPartnerFields, partnerFieldsToRow } from './PartnerFields';
import { parseRate } from '@/lib/partners';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Partner Hub: deals like Yellow, Code and Lylo are agreed off-platform, so
// admins can add a partner directly. It lands in the queue as pending with
// its deal already filled in, and is approved like any other application.
export default function AddPartnerDialog({
  open, onOpenChange, onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  const [fields, setFields] = useState(emptyPartnerFields());
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [commission, setCommission] = useState('10');
  const [discount, setDiscount] = useState('10');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFields(emptyPartnerFields()); setEmail(''); setPhone(''); setCommission('10'); setDiscount('10'); setNotes('');
  };

  const save = async () => {
    const org = fields.org_name.trim();
    const mail = email.trim().toLowerCase();
    const c = parseRate(commission);
    const d = parseRate(discount);
    if (!org) return toast.error('Add the organisation name');
    if (!EMAIL_RE.test(mail)) return toast.error('Add a valid contact email');
    if (!fields.partner_category) return toast.error('Choose a partner type');
    if (c === null || d === null) return toast.error('Commission and discount must be numbers from 0 to 100');

    setBusy(true);
    try {
      const { data: existing } = await supabase.from('applicants').select('id, full_name')
        .ilike('email', mail).is('deleted_at', null).limit(1);
      if (existing?.length) {
        toast.error(`${existing[0].full_name} already uses that email`);
        return;
      }
      const row = partnerFieldsToRow(fields);
      const { error } = await supabase.from('applicants').insert([{
        ...row,
        full_name: org,
        email: mail,
        whatsapp_number: phone.trim(),
        primary_social_link: row.website || '',
        city_country: row.partner_regions,
        creator_type: 'Partner',
        visiting_hostel: false,
        flow: 'prod',
        status: 'pending',
        commission_pct: c,
        guest_discount_pct: d,
        notes: notes.trim() || null,
      } as any]);
      if (error) throw error;
      toast.success(`${org} added. Approve it in the queue to create the code.`);
      reset();
      onOpenChange(false);
      onAdded();
    } catch (e: any) {
      toast.error(e?.message || 'Could not add the partner');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add partner</DialogTitle>
          <DialogDescription>
            For a partner deal agreed outside the hub. It goes into the queue as pending; approving it creates the code and emails the partner.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <PartnerFields value={fields} onChange={setFields} idPrefix="add" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="add-email">Contact email</Label>
              <Input id="add-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-phone">Phone or WhatsApp (optional)</Label>
              <Input id="add-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-commission">Commission %</Label>
              <Input id="add-commission" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-discount">Guest discount %</Label>
              <Input id="add-discount" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="add-notes">Internal notes (optional)</Label>
              <Textarea id="add-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How the deal came about, who agreed it…" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? 'Adding…' : 'Add partner'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
