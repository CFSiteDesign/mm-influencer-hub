import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { relativeTime } from '@/lib/utils';
import { ArrowLeft, RefreshCw, CalendarDays, MapPin } from 'lucide-react';

type Booking = {
  id: string;
  applicant_id: string;
  creator_id: string | null;
  creator_name: string | null;
  creator_email: string | null;
  property: string;
  check_in: string;
  check_out: string;
  nights: number;
  other_requests: string | null;
  type: string;
  status: string;
  reference_code: string | null;
  gm_email: string | null;
  review_note: string | null;
  submitted_at: string;
  applicants?: { whatsapp_number?: string | null; primary_social_link?: string | null; booking_token?: string | null } | null;
};

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-orange-100 text-orange-800',
  approved: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  declined: 'bg-destructive/10 text-destructive',
};
const STATUS_LABELS: Record<string, string> = {
  submitted: 'Needs review', approved: 'Awaiting reference', confirmed: 'Confirmed', declined: 'Declined',
};

export default function BookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [refDrafts, setRefDrafts] = useState<Record<string, string>>({});
  const [monthFilter, setMonthFilter] = useState('All');
  const [propertyFilter, setPropertyFilter] = useState('All');

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*, applicants(whatsapp_number, primary_social_link, booking_token)')
      .order('submitted_at', { ascending: false });
    if (error) toast.error('Failed to load bookings');
    else setBookings((data as Booking[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const setRowBusy = (id: string, v: boolean) => setBusy((p) => ({ ...p, [id]: v }));

  const handleSendMessage = async (b: Booking) => {
    const message = (messageDrafts[b.id] || '').trim();
    if (!message) { toast.error('Type a message first.'); return; }
    setRowBusy(b.id, true);
    try {
      const { data, error } = await supabase.functions.invoke('send-booking-reply-email', {
        body: { creatorName: b.creator_name, email: b.creator_email, message },
      });
      if (error || !(data as any)?.ok) throw new Error((data as any)?.error || 'Email failed');
      await supabase.from('bookings').update({ review_note: message }).eq('id', b.id);
      toast.success('Message sent to creator');
      setMessageDrafts((p) => ({ ...p, [b.id]: '' }));
      fetchBookings();
    } catch (e: any) {
      toast.error(e?.message || 'Could not send message');
    } finally {
      setRowBusy(b.id, false);
    }
  };

  const handleApprove = async (b: Booking) => {
    setRowBusy(b.id, true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'approved', approved_at: now, cs_notified_at: now })
        .eq('id', b.id);
      if (error) throw error;

      const { data, error: fnErr } = await supabase.functions.invoke('send-cs-booking-email', {
        body: {
          creatorName: b.creator_name,
          email: b.creator_email,
          phone: b.applicants?.whatsapp_number || '',
          property: b.property,
          checkIn: b.check_in,
          checkOut: b.check_out,
          bookingType: b.type,
        },
      });
      if (fnErr || !(data as any)?.ok) {
        toast.warning('Approved, but the Customer Services email may not have sent — check the email log.');
      } else {
        toast.success('Approved — Customer Services notified');
      }
      fetchBookings();
    } catch (e: any) {
      toast.error(e?.message || 'Could not approve booking');
    } finally {
      setRowBusy(b.id, false);
    }
  };

  const handleDecline = async (b: Booking) => {
    setRowBusy(b.id, true);
    try {
      const { error } = await supabase.from('bookings').update({ status: 'declined' }).eq('id', b.id);
      if (error) throw error;
      toast.success('Booking declined');
      fetchBookings();
    } catch (e: any) {
      toast.error(e?.message || 'Could not decline booking');
    } finally {
      setRowBusy(b.id, false);
    }
  };

  const handleConfirm = async (b: Booking) => {
    const ref = (refDrafts[b.id] || '').trim();
    if (!ref) { toast.error('Enter the Cloudbeds reference code first.'); return; }
    setRowBusy(b.id, true);
    try {
      // Resolve the property's GM email for the confirmation CC.
      const { data: prop } = await supabase
        .from('properties').select('gm_email').eq('location', b.property).maybeSingle();
      const gmEmail = prop?.gm_email || null;

      const { error } = await supabase
        .from('bookings')
        .update({ reference_code: ref, gm_email: gmEmail, status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', b.id);
      if (error) throw error;

      const { data, error: fnErr } = await supabase.functions.invoke('send-booking-confirmed-email', {
        body: {
          creatorName: b.creator_name,
          email: b.creator_email,
          gmEmail,
          referenceCode: ref,
          property: b.property,
          checkIn: b.check_in,
          checkOut: b.check_out,
          bookingToken: b.applicants?.booking_token,
        },
      });
      if (fnErr || !(data as any)?.ok) {
        toast.warning('Reference saved, but the confirmation email may not have sent — check the email log.');
      } else {
        toast.success(gmEmail ? 'Confirmed — creator emailed, GM CC’d' : 'Confirmed — creator emailed (no GM email on file yet)');
      }
      setRefDrafts((p) => ({ ...p, [b.id]: '' }));
      fetchBookings();
    } catch (e: any) {
      toast.error(e?.message || 'Could not confirm booking');
    } finally {
      setRowBusy(b.id, false);
    }
  };

  const needsReview = bookings.filter((b) => b.status === 'submitted');
  const awaitingRef = bookings.filter((b) => b.status === 'approved');

  const months = useMemo(() => {
    const set = new Set(bookings.map((b) => b.check_in?.slice(0, 7)).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [bookings]);

  const propertiesInUse = useMemo(
    () => Array.from(new Set(bookings.map((b) => b.property))).sort(),
    [bookings],
  );

  const filtered = bookings.filter(
    (b) =>
      (monthFilter === 'All' || b.check_in?.startsWith(monthFilter)) &&
      (propertyFilter === 'All' || b.property === propertyFilter),
  );

  // Report: bookings per month + per location (brief: dashboard report).
  const monthlyCounts = useMemo(() => {
    const map = new Map<string, number>();
    bookings.forEach((b) => {
      const m = b.check_in?.slice(0, 7);
      if (m) map.set(m, (map.get(m) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [bookings]);

  const locationCounts = useMemo(() => {
    const map = new Map<string, number>();
    bookings.forEach((b) => map.set(b.property, (map.get(b.property) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [bookings]);

  const fmtMonth = (m: string) => format(new Date(`${m}-01T00:00:00`), 'MMMM yyyy');
  const fmtDate = (d: string) => format(new Date(`${d}T00:00:00`), 'd MMM yyyy');

  const statusBadge = (b: Booking) => (
    <Badge className={STATUS_STYLES[b.status] || ''}>{STATUS_LABELS[b.status] || b.status}</Badge>
  );

  const reviewCard = (b: Booking) => (
    <Card key={b.id} className={b.type === 'amended' ? 'border-red-300 bg-red-50/40' : ''}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground">{b.creator_name || '—'}</p>
              {b.type === 'amended' && <Badge className="bg-red-600 text-white">AMENDED · URGENT</Badge>}
              {b.type === 'new' && <Badge variant="secondary">New booking</Badge>}
            </div>
            <p className="text-xs text-muted-foreground truncate">{b.creator_email}</p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{relativeTime(b.submitted_at)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" />{b.property}</div>
          <div className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-primary" />{fmtDate(b.check_in)} – {fmtDate(b.check_out)} · {b.nights}n</div>
        </div>

        {b.other_requests ? (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Other requests</p>
            {b.other_requests}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No additional requests.</p>
        )}

        <Textarea
          placeholder="Message to creator (optional) — e.g. a question about their request…"
          value={messageDrafts[b.id] || ''}
          onChange={(e) => setMessageDrafts((p) => ({ ...p, [b.id]: e.target.value }))}
          className="min-h-[70px] text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy[b.id]} onClick={() => handleSendMessage(b)}>Send message</Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={busy[b.id]} onClick={() => handleApprove(b)}>Approve & notify CS</Button>
          <Button size="sm" variant="destructive" disabled={busy[b.id]} onClick={() => handleDecline(b)}>Decline</Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-muted p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={fetchBookings} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">Bookings</h1>

        {/* Report */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardHeader className="pb-1 p-3 sm:p-4"><CardTitle className="text-xs text-muted-foreground">Total bookings</CardTitle></CardHeader><CardContent className="p-3 pt-0 sm:p-4 sm:pt-0"><div className="text-2xl font-bold">{bookings.length}</div></CardContent></Card>
          <Card className="border-orange-200 bg-orange-50"><CardHeader className="pb-1 p-3 sm:p-4"><CardTitle className="text-xs text-orange-700">Needs review</CardTitle></CardHeader><CardContent className="p-3 pt-0 sm:p-4 sm:pt-0"><div className="text-2xl font-bold text-orange-800">{needsReview.length}</div></CardContent></Card>
          <Card className="border-blue-200 bg-blue-50"><CardHeader className="pb-1 p-3 sm:p-4"><CardTitle className="text-xs text-blue-700">Awaiting reference</CardTitle></CardHeader><CardContent className="p-3 pt-0 sm:p-4 sm:pt-0"><div className="text-2xl font-bold text-blue-800">{awaitingRef.length}</div></CardContent></Card>
          <Card className="border-green-200 bg-green-50"><CardHeader className="pb-1 p-3 sm:p-4"><CardTitle className="text-xs text-green-700">Confirmed</CardTitle></CardHeader><CardContent className="p-3 pt-0 sm:p-4 sm:pt-0"><div className="text-2xl font-bold text-green-800">{bookings.filter((b) => b.status === 'confirmed').length}</div></CardContent></Card>
        </div>

        {/* Needs review */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">Needs review ({needsReview.length})</h2>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : needsReview.length === 0 ? (
            <Card className="bg-muted border-dashed"><CardContent className="py-8 text-center text-muted-foreground text-sm">All caught up — no bookings waiting for review.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{needsReview.map(reviewCard)}</div>
          )}
        </div>

        {/* Awaiting reference */}
        {awaitingRef.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Awaiting Cloudbeds reference ({awaitingRef.length})</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {awaitingRef.map((b) => (
                <Card key={b.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div><p className="font-semibold">{b.creator_name}</p><p className="text-xs text-muted-foreground">{b.property} · {fmtDate(b.check_in)} – {fmtDate(b.check_out)}</p></div>
                      {statusBadge(b)}
                    </div>
                    <p className="text-xs text-muted-foreground">Enter the Cloudbeds reference code once the booking is in the system. This confirms the creator and CCs the GM.</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Cloudbeds reference code"
                        value={refDrafts[b.id] || ''}
                        onChange={(e) => setRefDrafts((p) => ({ ...p, [b.id]: e.target.value }))}
                      />
                      <Button className="bg-primary hover:bg-primary/90 shrink-0" disabled={busy[b.id]} onClick={() => handleConfirm(b)}>Confirm</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All bookings */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">All bookings</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="sm:w-56"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All months</SelectItem>
                  {months.map((m) => <SelectItem key={m} value={m}>{fmtMonth(m)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger className="sm:w-56"><SelectValue placeholder="Property" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All properties</SelectItem>
                  {propertiesInUse.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No bookings.</TableCell></TableRow>
                  ) : filtered.map((b) => (
                    <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/applicants/${b.applicant_id}`)}>
                      <TableCell>
                        <div className="font-medium">{b.creator_name}</div>
                        <div className="text-xs text-muted-foreground">{b.creator_id || ''} {b.applicants?.whatsapp_number ? `· ${b.applicants.whatsapp_number}` : ''}</div>
                      </TableCell>
                      <TableCell>{b.property}</TableCell>
                      <TableCell className="text-sm">{fmtDate(b.check_in)} – {fmtDate(b.check_out)}<span className="text-muted-foreground"> · {b.nights}n</span></TableCell>
                      <TableCell>{b.type === 'amended' ? <Badge className="bg-red-600 text-white">Amended</Badge> : <Badge variant="secondary">New</Badge>}</TableCell>
                      <TableCell>{statusBadge(b)}</TableCell>
                      <TableCell className="font-mono text-sm">{b.reference_code || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Report tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="p-4"><CardTitle className="text-base">Bookings per month</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              {monthlyCounts.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
                <div className="space-y-1.5">
                  {monthlyCounts.map(([m, c]) => (
                    <div key={m} className="flex justify-between text-sm border-b last:border-0 py-1.5">
                      <span>{fmtMonth(m)}</span><span className="font-semibold">{c}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4"><CardTitle className="text-base">Bookings per location</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              {locationCounts.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
                <div className="space-y-1.5">
                  {locationCounts.map(([p, c]) => (
                    <div key={p} className="flex justify-between text-sm border-b last:border-0 py-1.5">
                      <span>{p}</span><span className="font-semibold">{c}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
