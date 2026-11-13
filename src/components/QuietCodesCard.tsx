import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Mail, RefreshCw, Search } from 'lucide-react';

// Creatorhub Updates brief (Nov 2026): "{CODE} has gone quiet" check-in for
// creators whose code earned nothing in the last 3 full months, using the
// Revenue Hub's copy of the coupon report. Marketing previews the list here,
// unticks anyone who shouldn't get it, and sends. Once happy, the monthly
// switch sends to everyone eligible on the 3rd of each month.

type Recipient = { code: string; name: string; email: string; created_at: string };
type Preview = {
  window: { start: string; end: string; months: string[] };
  synced_at: string | null;
  counts: { active_codes: number; too_new: number; earning: number; no_data: number; recently_emailed: number; excluded?: number; quiet: number };
  auto: boolean;
  send_day: number;
  recipients: Recipient[];
};

const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

export default function QuietCodesCard() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [auto, setAuto] = useState<boolean | null>(null);
  const [savingAuto, setSavingAuto] = useState(false);
  const [lastSent, setLastSent] = useState<{ at: string; count: number } | null>(null);

  const loadMeta = async () => {
    const [{ data: setting }, { data: recent }] = await Promise.all([
      supabase.from('app_settings').select('value').eq('key', 'quiet_code_checkins').maybeSingle(),
      (supabase as any).from('code_checkins').select('sent_at').eq('status', 'sent').order('sent_at', { ascending: false }).limit(1000),
    ]);
    setAuto(Boolean((setting?.value as any)?.auto));
    if (recent?.length) {
      const day = String(recent[0].sent_at).slice(0, 10);
      setLastSent({ at: recent[0].sent_at, count: recent.filter((r: any) => String(r.sent_at).slice(0, 10) === day).length });
    } else {
      setLastSent(null);
    }
  };
  useEffect(() => { loadMeta(); }, []);

  const runPreview = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-quiet-code-checkins', { body: { action: 'preview' } });
      if (error || !(data as any)?.ok) throw new Error((data as any)?.error || 'Could not check the codes');
      setPreview(data as Preview);
      setUnticked(new Set());
    } catch (e: any) {
      toast.error(e?.message || 'Could not check the codes');
    } finally {
      setLoading(false);
    }
  };

  const selected = useMemo(
    () => (preview?.recipients || []).filter((r) => !unticked.has(r.code)),
    [preview, unticked],
  );
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = (preview?.recipients || []).filter((r) =>
    words.every((w) => `${r.code} ${r.name} ${r.email}`.toLowerCase().includes(w)));

  const toggle = (code: string, on: boolean) =>
    setUnticked((prev) => { const n = new Set(prev); if (on) n.delete(code); else n.add(code); return n; });

  const send = async () => {
    setConfirmOpen(false);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-quiet-code-checkins', {
        body: { action: 'send', codes: selected.map((r) => r.code) },
      });
      const d = (data as any) || {};
      if (error || (!d.ok && !d.sent)) throw new Error(d.error || 'Sending failed');
      if (d.failed) toast.warning(`Sent ${d.sent}, ${d.failed} failed. Check the email log.`);
      else toast.success(`Check-in sent to ${d.sent} creator${d.sent === 1 ? '' : 's'}`);
      await Promise.all([runPreview(), loadMeta()]);
    } catch (e: any) {
      toast.error(e?.message || 'Sending failed');
    } finally {
      setSending(false);
    }
  };

  const saveAuto = async (next: boolean) => {
    setSavingAuto(true);
    // Keep the rest of the setting (e.g. the never-email list); only flip auto.
    const { data: cur } = await supabase.from('app_settings').select('value').eq('key', 'quiet_code_checkins').maybeSingle();
    const value = { ...((cur?.value as any) || {}), auto: next };
    const { error } = await supabase.from('app_settings')
      .upsert({ key: 'quiet_code_checkins', value, updated_at: new Date().toISOString() } as any);
    setSavingAuto(false);
    if (error) { toast.error('Could not save the setting'); return; }
    setAuto(next);
    toast.success(next ? 'Check-ins will send automatically each month' : 'Automatic check-ins switched off');
  };

  const sendDay = preview?.send_day ?? 3;

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6 pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2"><Mail className="h-4 w-4" /> Quiet codes check-in</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Emails creators whose code earned nothing in the last 3 full months: &ldquo;{'{CODE}'} has gone quiet&rdquo;.
              Nobody is emailed twice within 90 days.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={runPreview} disabled={loading || sending} className="gap-2 shrink-0">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {preview ? 'Check again' : 'Check quiet codes'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0 space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
          <Switch id="quiet-auto" checked={Boolean(auto)} disabled={auto === null || savingAuto} onCheckedChange={saveAuto} />
          <label htmlFor="quiet-auto" className="text-sm">
            Send automatically on the {ordinal(sendDay)} of every month
            <span className="block text-xs text-muted-foreground">
              {auto ? 'On: everyone eligible that day gets it.' : 'Off: nothing sends unless you press Send below.'}
            </span>
          </label>
          {lastSent && (
            <span className="text-xs text-muted-foreground sm:ml-auto">
              Last sent {format(new Date(lastSent.at), 'd MMM yyyy')} to {lastSent.count} creator{lastSent.count === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {preview && (
          <>
            <div className="text-sm space-y-1">
              <p>
                Checking <strong>{preview.window.months.join(', ')}</strong>
                {preview.synced_at && <span className="text-muted-foreground"> · revenue last synced {format(new Date(preview.synced_at), 'd MMM, HH:mm')}</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {preview.counts.active_codes} active codes: <strong className="text-foreground">{preview.counts.quiet} quiet</strong>,{' '}
                {preview.counts.earning} earning, {preview.counts.too_new} too new to judge
                {preview.counts.recently_emailed ? `, ${preview.counts.recently_emailed} emailed in the last 90 days` : ''}
                {preview.counts.no_data ? `, ${preview.counts.no_data} not in the coupon report` : ''}
                {preview.counts.excluded ? `, ${preview.counts.excluded} on the never-email list` : ''}.
              </p>
            </div>

            {preview.recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nobody to email right now.</p>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 h-9" placeholder="Search code, name or email" aria-label="Search quiet codes"
                      value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setUnticked(new Set())}>Tick all</Button>
                    <Button variant="ghost" size="sm" onClick={() => setUnticked(new Set(preview.recipients.map((r) => r.code)))}>Untick all</Button>
                    <Button size="sm" className="gap-2" disabled={sending || selected.length === 0} onClick={() => setConfirmOpen(true)}>
                      <Mail className="h-3.5 w-3.5" />{sending ? 'Sending…' : `Send to ${selected.length}`}
                    </Button>
                  </div>
                </div>
                <div className="max-h-96 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"><span className="sr-only">Send</span></TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Creator</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead className="hidden sm:table-cell">Code since</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shown.map((r) => (
                        <TableRow key={r.code}>
                          <TableCell>
                            <Checkbox checked={!unticked.has(r.code)} onCheckedChange={(v) => toggle(r.code, v === true)}
                              aria-label={`Send to ${r.code}`} />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{r.code}</TableCell>
                          <TableCell className="text-sm">{r.name || 'No name'}<span className="block sm:hidden text-xs text-muted-foreground">{r.email}</span></TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{r.email}</TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{format(new Date(r.created_at), 'd MMM yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send the check-in to {selected.length} creator{selected.length === 1 ? '' : 's'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Each gets &ldquo;{'{CODE}'} has gone quiet&rdquo; with the affiliates breakdown. Replies come to creatorhub@.
              They won&rsquo;t be emailed again for 90 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={send}>Send now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
