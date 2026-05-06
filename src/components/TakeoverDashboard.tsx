import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { relativeTime } from '@/lib/utils';
import { RefreshCw, ExternalLink } from 'lucide-react';

export default function TakeoverDashboard() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('takeover_applicants')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (error) toast.error('Failed to load takeover applications');
    else setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const updateStatus = async (id: string, status: 'approved' | 'disapproved') => {
    const { error } = await supabase.from('takeover_applicants').update({ status }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success(`Marked as ${status}`);
    fetchRows();
  };

  const badge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-800',
      approved: 'bg-green-100 text-green-800',
      disapproved: 'bg-red-100 text-red-800',
    };
    return <Badge className={map[s] || ''}>{s}</Badge>;
  };

  const pending = rows.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card><CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Takeover Apps</CardTitle></CardHeader><CardContent className="p-3 pt-0 sm:p-6 sm:pt-0"><div className="text-2xl sm:text-3xl font-bold">{rows.length}</div></CardContent></Card>
        <Card className="border-orange-200 bg-orange-50"><CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6"><CardTitle className="text-xs sm:text-sm font-medium text-orange-700">Pending</CardTitle></CardHeader><CardContent className="p-3 pt-0 sm:p-6 sm:pt-0"><div className="text-2xl sm:text-3xl font-bold text-orange-800">{pending}</div></CardContent></Card>
        <Card><CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Approved</CardTitle></CardHeader><CardContent className="p-3 pt-0 sm:p-6 sm:pt-0"><div className="text-2xl sm:text-3xl font-bold">{rows.filter(r => r.status === 'approved').length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6 flex-row items-center justify-between">
          <CardTitle className="text-base sm:text-lg">Creator Takeover Applications</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchRows} className="gap-1 text-xs"><RefreshCw className="h-3 w-3" />Refresh</Button>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {/* Desktop */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Instagram</TableHead>
                  <TableHead>TikTok</TableHead>
                  <TableHead>Sold?</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Where</TableHead>
                  <TableHead>Screenshot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No takeover applications yet.</TableCell></TableRow>
                ) : rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">{r.email}</TableCell>
                    <TableCell className="text-xs"><a href={r.instagram} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">link</a></TableCell>
                    <TableCell className="text-xs"><a href={r.tiktok} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">link</a></TableCell>
                    <TableCell className="text-xs capitalize">{r.sold_before}</TableCell>
                    <TableCell className="text-xs">{r.when_period}</TableCell>
                    <TableCell className="text-xs">{r.where_country}</TableCell>
                    <TableCell>{r.screenshot_url ? <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline inline-flex items-center gap-1 text-xs"><ExternalLink className="h-3 w-3" />view</a> : '—'}</TableCell>
                    <TableCell>{badge(r.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{relativeTime(r.submitted_at)}</TableCell>
                    <TableCell className="text-right">
                      {r.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => updateStatus(r.id, 'approved')}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(r.id, 'disapproved')}>Disapprove</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {loading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> : rows.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No takeover applications yet.</p>
            ) : rows.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{r.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                    </div>
                    {badge(r.status)}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>When:</strong> {r.when_period}</p>
                    <p><strong>Where:</strong> {r.where_country}</p>
                    <p><strong>Sold before:</strong> {r.sold_before}</p>
                    <div className="flex gap-3 pt-1">
                      <a href={r.instagram} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">IG</a>
                      <a href={r.tiktok} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">TikTok</a>
                      {r.screenshot_url && <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">Screenshot</a>}
                    </div>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs" onClick={() => updateStatus(r.id, 'approved')}>Approve</Button>
                      <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => updateStatus(r.id, 'disapproved')}>Disapprove</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
