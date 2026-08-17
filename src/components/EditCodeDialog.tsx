import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { updateCreatorCode, normalizeCode, type CreatorCodeRow } from '@/lib/creator-code-update';

interface Props {
  row: CreatorCodeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (newCode: string) => void;
}

export default function EditCodeDialog({ row, open, onOpenChange, onUpdated }: Props) {
  const [value, setValue] = useState('');
  const [sendEmails, setSendEmails] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (next && row) setValue(row.code);
    if (!next) setSaving(false);
    onOpenChange(next);
  };

  const save = async () => {
    if (!row) return;
    setSaving(true);
    try {
      const { code, warnings } = await updateCreatorCode(row, value, { sendEmails });
      onUpdated(code);
      if (warnings.length) {
        toast.warning(`Code changed to ${code}, but: ${warnings.join('; ')}`);
      } else {
        toast.success(`Code changed to ${code}${sendEmails ? ' and code creation email sent' : ''}`);
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Could not change code');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change creator code</DialogTitle>
          <DialogDescription>
            {row?.creator_name || 'Creator'}{row?.creator_id ? ` · ${row.creator_id}` : ''} — current code{' '}
            <span className="font-mono font-semibold">{row?.code}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-code">New code</Label>
            <Input
              id="new-code"
              value={value}
              onChange={(e) => setValue(normalizeCode(e.target.value))}
              placeholder="e.g. VOAGIO10"
              className="font-mono uppercase"
            />
            <p className="text-xs text-muted-foreground">Letters and numbers only. Must be unique.</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="pr-3">
              <p className="text-sm font-medium">Send code creation email</p>
              <p className="text-xs text-muted-foreground">Notifies the internal codes team to update the new code.</p>
            </div>
            <Switch checked={sendEmails} onCheckedChange={setSendEmails} />
          </div>

          <p className="text-xs text-muted-foreground">
            The new code is also pushed to the creator revenue dashboard, and ALL IN Trips eligibility is moved across if enabled.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || !value}>{saving ? 'Saving…' : 'Save code'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
