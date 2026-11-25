import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Copy, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { inviteUrl, makeInviteToken } from '@/lib/partners';
import { useAuth } from '@/contexts/AuthContext';

// Partner Hub decision 6: the partner apply page is invite only. There is
// one live link; making a new one switches the old one off.
export default function PartnerInviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const [invite, setInvite] = useState<{ id: string; token: string; created_at: string; created_by: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from('partner_invites')
      .select('id, token, created_at, created_by').is('revoked_at', null)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) toast.error('Could not load the invite link');
    setInvite(data ?? null);
    setLoading(false);
  };

  useEffect(() => { if (open) { setConfirmReplace(false); load(); } }, [open]);

  const create = async () => {
    setBusy(true);
    try {
      const now = new Date().toISOString();
      if (invite) {
        const { error } = await (supabase as any).from('partner_invites').update({ revoked_at: now }).is('revoked_at', null);
        if (error) throw error;
      }
      const { error } = await (supabase as any).from('partner_invites')
        .insert([{ token: makeInviteToken(), created_by: user?.email || null }]);
      if (error) throw error;
      toast.success(invite ? 'New link made. The old one no longer works.' : 'Invite link made');
      setConfirmReplace(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not make the link');
    } finally {
      setBusy(false);
    }
  };

  const url = invite ? inviteUrl(invite.token) : '';
  const copy = () => { navigator.clipboard.writeText(url); toast.success('Invite link copied'); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Partner invite link</DialogTitle>
          <DialogDescription>
            The partner apply page only opens with this link. Send it to partners you want to sign up; their application lands in the queue for approval.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : invite ? (
          <div className="space-y-2 py-2">
            <div className="flex gap-2">
              <Input readOnly value={url} aria-label="Partner invite link" onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copy} aria-label="Copy invite link"><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Made {format(new Date(invite.created_at), 'd MMM yyyy')}{invite.created_by ? ` by ${invite.created_by}` : ''}.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No invite link yet.</p>
        )}
        {confirmReplace && (
          <p className="text-sm text-destructive">Anyone holding the current link will no longer be able to apply. Make a new one?</p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          {invite && !confirmReplace && (
            <Button variant="outline" onClick={() => setConfirmReplace(true)} className="gap-2"><RefreshCw className="h-3.5 w-3.5" />Make a new link</Button>
          )}
          {invite && confirmReplace && (
            <>
              <Button variant="outline" onClick={() => setConfirmReplace(false)} disabled={busy}>Keep current link</Button>
              <Button variant="destructive" onClick={create} disabled={busy}>{busy ? 'Making…' : 'Replace link'}</Button>
            </>
          )}
          {!invite && !loading && <Button onClick={create} disabled={busy}>{busy ? 'Making…' : 'Make invite link'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
