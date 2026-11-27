import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { PARTNER_APPLY_URL } from '@/lib/partners';

// The partner apply page has been public since 27 Nov 2026 (Kyle, via Cai):
// anyone with the link can apply, but it is not linked from anywhere on the
// site, so this is where admins get it. Every application still waits in the
// queue for approval. (It used to make one-off invite links.)
export default function PartnerInviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const copy = () => { navigator.clipboard.writeText(PARTNER_APPLY_URL); toast.success('Partner apply link copied'); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Partner apply link</DialogTitle>
          <DialogDescription>
            Send this to partners you want to sign up. Anyone with the link can apply, but it isn't shown
            anywhere on our site. Every application lands in the queue for you to approve.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 py-2">
          <Input readOnly value={PARTNER_APPLY_URL} aria-label="Partner apply link" onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
          <Button variant="outline" size="icon" onClick={copy} aria-label="Copy partner apply link"><Copy className="h-4 w-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
