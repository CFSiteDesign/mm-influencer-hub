import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseRate, partnerName, rateOf } from '@/lib/partners';

export type PartnerDeal = { commission_pct: number; guest_discount_pct: number };

// Partner Hub decision 1: the deal is set per partner when approving.
// Both start at the creator default of 10 unless the partner already has one.
export default function PartnerDealDialog({
  applicant, open, onOpenChange, onConfirm, confirmLabel = 'Approve partner',
}: {
  applicant: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (deal: PartnerDeal) => Promise<void> | void;
  confirmLabel?: string;
}) {
  const [commission, setCommission] = useState('10');
  const [discount, setDiscount] = useState('10');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && applicant) {
      setCommission(String(rateOf(applicant.commission_pct)));
      setDiscount(String(rateOf(applicant.guest_discount_pct)));
    }
  }, [open, applicant]);

  const c = parseRate(commission);
  const d = parseRate(discount);
  const valid = c !== null && d !== null;

  const confirm = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await onConfirm({ commission_pct: c!, guest_discount_pct: d! });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{applicant ? `${partnerName(applicant)}'s deal` : 'Partner deal'}</DialogTitle>
          <DialogDescription>
            Set what this partner earns and what their guests save. The codes team gets the guest discount to set up on the code.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="deal-commission">Commission %</Label>
            <Input id="deal-commission" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)}
              aria-invalid={c === null} />
            <p className="text-xs text-muted-foreground">Of the net booking value.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deal-discount">Guest discount %</Label>
            <Input id="deal-discount" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)}
              aria-invalid={d === null} />
            <p className="text-xs text-muted-foreground">0 means tracking only.</p>
          </div>
        </div>
        {!valid && <p className="text-sm text-destructive">Enter numbers from 0 to 100.</p>}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={confirm} disabled={!valid || busy}>
            {busy ? 'Saving…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
