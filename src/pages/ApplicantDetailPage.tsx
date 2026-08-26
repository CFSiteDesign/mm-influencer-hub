import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { generateCreatorCode } from '@/lib/code-gen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { relativeTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Copy, Mail, RefreshCw, Undo2, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ApplicantDetailPage() {
  const isTest = false;
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applicant, setApplicant] = useState<any>(null);
  const [codeMethod, setCodeMethod] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [replies, setReplies] = useState<any[]>([]);
  const [refreshingThread, setRefreshingThread] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [refreshingFollowers, setRefreshingFollowers] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [busyAction, setBusyAction] = useState(false);

  // Phase 2 (B1): re-pull follower counts from Instagram/TikTok via Apify.
  const refreshFollowers = async () => {
    setRefreshingFollowers(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-creator-followers', {
        body: { applicantId: id },
      });
      if (error || !(data as any)?.ok) throw new Error((data as any)?.error || 'Could not fetch follower counts');
      const d = data as any;
      toast.success(`Followers updated — IG: ${d.instagram ?? 'not found'}, TikTok: ${d.tiktok ?? 'not found'}`);
      fetchApplicant();
    } catch (e: any) {
      toast.error(e?.message || 'Could not refresh followers');
    } finally {
      setRefreshingFollowers(false);
    }
  };

  // A4: the sent + received halves of the chat log. Split out from
  // fetchApplicant so the Refresh button can re-check for new replies without
  // reloading (and blanking) the whole page.
  const fetchThread = async (creatorEmail: string) => {
    const [sentRes, replyRes] = await Promise.all([
      supabase
        .from('email_send_log')
        .select('*')
        .eq('recipient_email', creatorEmail)
        .order('created_at', { ascending: false }),
      // Matched by applicant_id, falling back to the sender address for
      // anything that arrived before the creator record existed.
      (supabase as any)
        .from('inbound_emails')
        .select('*')
        .or(`applicant_id.eq.${id},from_email.ilike.${creatorEmail}`)
        .order('received_at', { ascending: false }),
    ]);
    setEmailLogs(sentRes.data || []);
    setReplies(replyRes.data || []);
    return { sent: sentRes.data?.length ?? 0, replies: replyRes.data?.length ?? 0 };
  };

  const handleRefreshThread = async () => {
    if (!applicant?.email) return;
    setRefreshingThread(true);
    const before = replies.length;
    try {
      const { replies: after } = await fetchThread(applicant.email);
      const fresh = after - before;
      if (fresh > 0) toast.success(`${fresh} new repl${fresh === 1 ? 'y' : 'ies'} received`);
      else toast.info('Up to date — no new replies');
    } catch {
      toast.error('Could not refresh the chat log');
    } finally {
      setRefreshingThread(false);
    }
  };

  const fetchApplicant = async () => {
    setLoading(true);

    // Run all queries in parallel
    const [applicantRes, logsRes] = await Promise.all([
      supabase.from('applicants').select('*').eq('id', id).single(),
      supabase.from('status_log').select('*').eq('applicant_id', id).order('changed_at', { ascending: false }),
    ]);

    if (applicantRes.error) {
      toast.error('Failed to load applicant details');
      navigate(isTest ? '/dashboard' : '/dashboard');
      setLoading(false);
      return;
    }

    setApplicant(applicantRes.data);
    setNotes(applicantRes.data.notes || '');
    setLogs(logsRes.data || []);

    await fetchThread(applicantRes.data.email);

    // Booking log for this creator (A3: consolidated creator page).
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*')
      .eq('applicant_id', id)
      .order('submitted_at', { ascending: false });
    setBookings(bookingData || []);

    if (applicantRes.data.creator_code) {
      const { data: codeData } = await supabase
        .from('creator_codes')
        .select('method')
        .eq('code', applicantRes.data.creator_code)
        .single();
      if (codeData) setCodeMethod(codeData.method);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (id) fetchApplicant();
  }, [id]);

  // A4: one chronological conversation from what we sent + what they replied.
  const thread = useMemo(() => {
    const sent = emailLogs.map(log => ({ kind: 'sent' as const, id: log.id, at: log.created_at, data: log }));
    const received = replies.map(r => ({ kind: 'reply' as const, id: r.id, at: r.received_at, data: r }));
    return [...sent, ...received].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [emailLogs, replies]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const { error } = await supabase.from('applicants').update({ notes }).eq('id', id);
      if (error) throw error;
      toast.success('Notes saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleApprove = async () => {
    try {
      const { error: approveError } = await supabase.from('applicants').update({ status: 'approved' }).eq('id', id);
      if (approveError) throw approveError;

      const { code, method } = await generateCreatorCode(applicant.full_name);
      if (!code) {
        toast.error('Code generation exhausted. Please assign manually.');
        await fetchApplicant();
        return;
      }

      const { error: codeError } = await supabase.from('creator_codes').insert([{ code, applicant_id: id, method }]);
      if (codeError) throw codeError;

      // Get next creator ID
      const { data: idData } = await supabase.rpc('next_creator_id');
      const creatorId = idData || null;

      const { error: finalError } = await supabase.from('applicants').update({
        creator_code: code,
        status: 'code_generated',
        creator_id: creatorId,
      }).eq('id', id);
      if (finalError) throw finalError;

      await supabase.from('status_log').insert([{
        applicant_id: id, from_status: 'pending', to_status: 'code_generated',
        changed_by: user?.email || 'system', note: `Approved and code generated: ${code} (${creatorId || 'no ID'}, Method: ${method})`
      }]);

      // Partners skip the Creator Hub welcome / stay-dates email entirely and
      // only get the (partner-worded) code email.
      const isPartner = applicant.creator_type === 'Partner';

      // New booking-flow welcome email (stay-dates link) + revenue-tracker sync.
      supabase.functions.invoke('send-approval-email', {
        body: {
          applicantName: applicant.full_name,
          creatorCode: code,
          codeMethod: method,
          email: applicant.email,
          primarySocial: applicant.primary_social_link,
          secondarySocial: applicant.secondary_social_link,
          creatorId,
          skipWelcome: false,
          isPartner,
        },
      }).then(({ error }) => {
        if (error) console.error('Internal approval email failed:', error);
      });

      if (!isPartner) {
        supabase.functions.invoke('send-creator-welcome-email-test', {
          body: {
            creatorName: applicant.full_name,
            creatorCode: code,
            creatorId,
            email: applicant.email,
            bookingToken: applicant.booking_token,
          },
        }).then(({ error }) => {
          if (error) console.error('Welcome email failed:', error);
        });
      }

      supabase.functions.invoke('sync-creator-revenue', {
        body: {
          code,
          name: applicant.full_name,
          creator_id: creatorId,
        },
      }).then(({ data, error }) => {
        if (error) {
          console.error('Revenue tracker sync failed:', error);
        } else if (data?.status === 409 || data?.data?.error?.includes?.('already exists')) {
          console.log('Creator already exists in revenue tracker');
        }
      });

      toast.success(`Approved! Code generated: ${code} (${creatorId})`);
      fetchApplicant();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve applicant');
    }
  };

  const handleDisapprove = async () => {
    try {
      const { error } = await supabase.from('applicants').update({ status: 'disapproved' }).eq('id', id);
      if (error) throw error;

      await supabase.from('status_log').insert([{
        applicant_id: id, from_status: 'pending', to_status: 'disapproved',
        changed_by: user?.email || 'system',
      }]);

      toast.success('Application disapproved');
      fetchApplicant();
    } catch (error: any) {
      toast.error(error.message || 'Failed to disapprove applicant');
    }
  };

  const handleMarkAsDone = async () => {
    try {
      const { error } = await supabase.from('applicants').update({ status: 'done' }).eq('id', id);
      if (error) throw error;

      await supabase.from('status_log').insert([{
        applicant_id: id, from_status: 'code_generated', to_status: 'done',
        changed_by: user?.email || 'system',
      }]);

      toast.success('Code marked as created');
      fetchApplicant();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark as done');
    }
  };

  // Phase 3 (item 7): recover from an accidental approval. Puts the applicant
  // back to pending and switches their promo code off. Deliberately sends no
  // email — an automated "your code was revoked" to someone approved by mistake
  // would be worse than the mistake.
  const handleUndoApproval = async () => {
    setBusyAction(true);
    try {
      const previous = applicant.status;

      if (applicant.creator_code) {
        const { error: codeErr } = await (supabase as any)
          .from('creator_codes')
          .update({
            active: false,
            deactivated_at: new Date().toISOString(),
            deactivated_reason: `Approval undone by ${user?.email || 'admin'}`,
          })
          .eq('code', applicant.creator_code);
        if (codeErr) throw codeErr;
      }

      const { error } = await supabase
        .from('applicants')
        .update({ status: 'pending', creator_code: null, creator_id: null, approved_at: null })
        .eq('id', id);
      if (error) throw error;

      await supabase.from('status_log').insert([{
        applicant_id: id, from_status: previous, to_status: 'pending',
        changed_by: user?.email || 'system',
        note: applicant.creator_code
          ? `Approval undone — code ${applicant.creator_code} deactivated. Remove it from the revenue tracker manually.`
          : 'Approval undone',
      }]);

      toast.success(
        applicant.creator_code
          ? `Approval undone — code ${applicant.creator_code} switched off here. Remove it from the revenue tracker too.`
          : 'Approval undone — back to pending',
        { duration: 8000 },
      );
      setConfirmUndo(false);
      fetchApplicant();
    } catch (e: any) {
      toast.error(e?.message || 'Could not undo the approval');
    } finally {
      setBusyAction(false);
    }
  };

  // Soft delete: hides the application from the dashboard but keeps the row, so
  // bookings, emails and codes never end up orphaned. Blocked if they have
  // bookings — those need dealing with first.
  const handleDeleteApplication = async () => {
    setBusyAction(true);
    try {
      if (bookings.length > 0) {
        toast.error(`Cannot delete — this creator has ${bookings.length} booking${bookings.length === 1 ? '' : 's'}. Decline or remove those first.`);
        return;
      }

      const { error } = await (supabase as any)
        .from('applicants')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.email || 'admin',
          deleted_reason: deleteReason.trim() || null,
        })
        .eq('id', id);
      if (error) throw error;

      toast.success('Application deleted');
      navigate('/dashboard');
    } catch (e: any) {
      toast.error(e?.message || 'Could not delete the application');
    } finally {
      setBusyAction(false);
    }
  };

  // Rendered in both the mobile and desktop Actions cards, so the two stay in
  // step. Undo only appears once they have actually been approved.
  const wasApproved = ['approved', 'code_generated', 'done'].includes(applicant?.status);
  const dangerActions = (
    <div className="pt-3 mt-1 border-t space-y-2">
      {wasApproved && (
        <Button variant="outline" className="w-full justify-start text-amber-700 border-amber-300 hover:bg-amber-50"
          onClick={() => setConfirmUndo(true)} disabled={busyAction}>
          <Undo2 className="h-4 w-4 mr-2" />Undo approval
        </Button>
      )}
      <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setConfirmDelete(true)} disabled={busyAction}>
        <Trash2 className="h-4 w-4 mr-2" />Delete application
      </Button>
    </div>
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Code copied!');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-800 hover:bg-orange-200 text-lg px-4 py-1',
      approved: 'bg-blue-100 text-blue-800 hover:bg-blue-200 text-lg px-4 py-1',
      disapproved: 'bg-destructive/10 text-destructive hover:bg-destructive/20 text-lg px-4 py-1',
      code_generated: 'bg-purple-100 text-purple-800 hover:bg-purple-200 text-lg px-4 py-1',
      done: 'bg-green-100 text-green-800 hover:bg-green-200 text-lg px-4 py-1',
    };
    const labels: Record<string, string> = {
      pending: 'Pending', approved: 'Approved', disapproved: 'Disapproved',
      code_generated: 'Code Ready', done: 'Done'
    };
    return <Badge className={styles[status] || 'text-lg px-4 py-1'}>{labels[status] || status}</Badge>;
  };

  if (loading || !applicant) {
    return <div className="min-h-screen flex items-center justify-center bg-muted">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-muted p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(isTest ? '/dashboard' : '/dashboard')} className="mb-2 sm:mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-start">
          {/* Actions card - show on top for mobile */}
          <div className="md:hidden space-y-4">
            <Card>
              <CardHeader className="p-4"><CardTitle className="text-base">Actions</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {applicant.status === 'pending' && (
                  <>
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleApprove}>Approve & Generate Code</Button>
                    <Button className="w-full" variant="destructive" onClick={handleDisapprove}>Disapprove</Button>
                  </>
                )}
                {applicant.status === 'code_generated' && (
                  <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleMarkAsDone}>Mark as Done</Button>
                )}
                {applicant.status === 'disapproved' && (
                  <div className="text-center p-3 bg-destructive/10 text-destructive rounded-md border border-destructive/20 text-sm">
                    This application was disapproved.
                  </div>
                )}
                {applicant.status === 'done' && (
                  <div className="text-center p-3 bg-primary/10 text-primary rounded-md border border-primary/20 text-sm">
                    Discount code has been created.
                  </div>
                )}
                {dangerActions}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                  <div>
                    <CardTitle className="text-xl sm:text-3xl font-bold">{applicant.full_name}</CardTitle>
                    {applicant.creator_id && (
                      <span className="text-sm font-mono text-muted-foreground">{applicant.creator_id}</span>
                    )}
                    <p className="text-muted-foreground text-sm mt-1">Submitted {relativeTime(applicant.submitted_at)}</p>
                  </div>
                  {getStatusBadge(applicant.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <a href={`mailto:${applicant.email}`} className="text-primary hover:underline text-sm sm:text-base break-all">{applicant.email}</a>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
                    <p className="text-foreground text-sm sm:text-base">{applicant.whatsapp_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Primary Social</p>
                    {applicant.primary_social_link ? (
                      <a href={applicant.primary_social_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm sm:text-base break-all">{applicant.primary_social_link}</a>
                    ) : <p className="text-foreground text-sm sm:text-base">Not provided</p>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Secondary Social</p>
                    {applicant.secondary_social_link ? (
                      <a href={applicant.secondary_social_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm sm:text-base break-all">{applicant.secondary_social_link}</a>
                    ) : <p className="text-muted-foreground text-sm sm:text-base">Not provided</p>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Instagram Followers</p>
                    <p className="text-foreground text-sm sm:text-base">{applicant.instagram_followers || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">TikTok Followers</p>
                    <p className="text-foreground text-sm sm:text-base">{applicant.tiktok_followers || '—'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-foreground text-sm sm:text-base">{applicant.creator_type || '—'}</span>
                      {applicant.creator_type === 'Partner' && (
                        <Badge className="bg-amber-500 text-white hover:bg-amber-500">PARTNER</Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const next = applicant.creator_type === 'Partner' ? 'Content Creator' : 'Partner';
                          const { error } = await supabase.from('applicants').update({ creator_type: next }).eq('id', id);
                          if (error) toast.error(error.message);
                          else {
                            toast.success(`Marked as ${next}`);
                            fetchApplicant();
                          }
                        }}
                      >
                        {applicant.creator_type === 'Partner' ? 'Unmark Partner' : 'Mark as Partner'}
                      </Button>
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                    <Button variant="outline" size="sm" onClick={refreshFollowers} disabled={refreshingFollowers}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${refreshingFollowers ? 'animate-spin' : ''}`} />
                      {refreshingFollowers ? 'Fetching from Instagram / TikTok…' : 'Refresh followers'}
                    </Button>
                    {applicant.followers_fetched_at && (
                      <p className="text-xs text-muted-foreground">
                        Auto-fetched {relativeTime(applicant.followers_fetched_at)}
                        {applicant.followers_fetch_status && applicant.followers_fetch_status !== 'ok' ? ` · ${applicant.followers_fetch_status}` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {applicant.creator_code && (
                  <div className="bg-secondary rounded-lg p-4 sm:p-6 flex flex-col items-center justify-center space-y-2 border">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Creator Code</p>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-2xl sm:text-4xl font-bold tracking-tight text-foreground">{applicant.creator_code}</span>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(applicant.creator_code)}>
                        <Copy className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      </Button>
                    </div>
                    {codeMethod && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Method: {codeMethod === 'first_name' ? 'Tier 1 — primary' : codeMethod === 'first_name_initial' ? 'Tier 2 — initial fallback' : codeMethod === 'first_name_initial_inc' ? 'Tier 3 — numeric increment' : 'Manual'}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Internal Notes</p>
                  <Textarea placeholder="Add notes about this applicant..." value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[100px] sm:min-h-[120px]" />
                  <div className="flex justify-end">
                    <Button onClick={handleSaveNotes} disabled={savingNotes} variant="secondary" size="sm">
                      {savingNotes ? 'Saving...' : 'Save Notes'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking log (A3: consolidated creator page) */}
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3"><CardTitle className="text-base sm:text-lg">Booking Log ({bookings.length})</CardTitle></CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                {bookings.length === 0 ? (
                  <p className="text-muted-foreground italic text-sm">No bookings submitted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((b) => (
                      <div key={b.id} className="rounded-lg border p-3 sm:p-4 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{b.property}</span>
                          <div className="flex items-center gap-1.5">
                            {b.type === 'amended' && <Badge className="bg-red-600 text-white text-xs">Amended</Badge>}
                            <Badge className={
                              b.status === 'confirmed' ? 'bg-green-100 text-green-800'
                              : b.status === 'approved' ? 'bg-blue-100 text-blue-800'
                              : b.status === 'declined' ? 'bg-destructive/10 text-destructive'
                              : 'bg-orange-100 text-orange-800'
                            }>{b.status}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-foreground">
                          {new Date(b.check_in).toLocaleDateString()} – {new Date(b.check_out).toLocaleDateString()} · {b.nights} night{b.nights === 1 ? '' : 's'}
                          {b.room_type ? ` · ${b.room_type === 'private' ? 'Private room' : 'Standard dorm'}` : ''}
                        </p>
                        {b.other_requests && (
                          <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Requests:</span> {b.other_requests}</p>
                        )}
                        {b.reference_code && (
                          <p className="text-sm"><span className="font-medium text-foreground">Reference:</span> <span className="font-mono">{b.reference_code}</span></p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6"><CardTitle className="text-base sm:text-lg">Activity Log</CardTitle></CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground italic text-sm">No activity recorded yet.</p>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {logs.map(log => (
                      <div key={log.id} className="flex gap-3 sm:gap-4 border-l-2 border-border pl-3 sm:pl-4 py-1">
                        <div className="flex-1 space-y-1">
                          <p className="text-xs sm:text-sm">
                            <span className="font-medium text-foreground">{log.changed_by}</span>
                            {' changed status '}
                            {log.from_status && <span className="text-muted-foreground line-through">{log.from_status}</span>}
                            {log.from_status && ' → '}
                            <span className="font-medium text-foreground">{log.to_status}</span>
                          </p>
                          {log.note && <p className="text-xs text-muted-foreground italic">{log.note}</p>}
                          <p className="text-xs text-muted-foreground">{new Date(log.changed_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* A4: Email chat log — everything we sent plus everything they replied. */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base sm:text-lg">Email Chat Log</CardTitle>
                    {replies.length > 0 && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</Badge>
                    )}
                  </div>
                  {/* Replies arrive by webhook, so the page needs re-checking. */}
                  <Button variant="outline" size="sm" onClick={handleRefreshThread} disabled={refreshingThread}>
                    <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshingThread ? 'animate-spin' : ''}`} />
                    {refreshingThread ? 'Checking…' : 'Check for replies'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                {thread.length === 0 ? (
                  <p className="text-muted-foreground italic text-sm">No emails with this creator yet.</p>
                ) : (
                  <div className="space-y-3">
                    {thread.map(item =>
                      item.kind === 'sent' ? (
                        // Outgoing — left aligned, muted.
                        <div key={`s-${item.id}`} className="flex justify-start">
                          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="text-xs font-normal">{item.data.template_name}</Badge>
                              <Badge className={`text-xs ${item.data.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {item.data.status}
                              </Badge>
                            </div>
                            <p className="text-sm">Sent to {item.data.recipient_email}</p>
                            {item.data.error_message && <p className="text-xs text-red-600">{item.data.error_message}</p>}
                            <p className="text-xs text-muted-foreground">{new Date(item.at).toLocaleString()}</p>
                          </div>
                        </div>
                      ) : (
                        // Incoming reply — right aligned, highlighted.
                        <div key={`r-${item.id}`} className="flex justify-end">
                          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary/10 border border-primary/20 px-4 py-3 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-blue-100 text-blue-800 text-xs">Reply</Badge>
                              <span className="text-xs font-medium">{item.data.from_name || item.data.from_email}</span>
                            </div>
                            {item.data.subject && <p className="text-xs font-semibold">{item.data.subject}</p>}
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {item.data.body_text?.trim() || <span className="italic text-muted-foreground">(no text content)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">{new Date(item.at).toLocaleString()}</p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions card - desktop sidebar */}
          <div className="hidden md:block space-y-6 self-start sticky top-6">
            <Card>
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {applicant.status === 'pending' && (
                  <>
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleApprove}>Approve & Generate Code</Button>
                    <Button className="w-full" variant="destructive" onClick={handleDisapprove}>Disapprove</Button>
                  </>
                )}
                {applicant.status === 'code_generated' && (
                  <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleMarkAsDone}>Mark as Done</Button>
                )}
                {applicant.status === 'disapproved' && (
                  <div className="text-center p-4 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
                    This application was disapproved.
                  </div>
                )}
                {applicant.status === 'done' && (
                  <div className="text-center p-4 bg-primary/10 text-primary rounded-md border border-primary/20">
                    Discount code has been created.
                  </div>
                )}
                {dangerActions}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Undo an accidental approval — reverts to pending and kills the code. */}
      <AlertDialog open={confirmUndo} onOpenChange={setConfirmUndo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo this approval?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p><strong className="text-foreground">{applicant?.full_name}</strong> goes back to pending and can be reviewed again.</p>
                {applicant?.creator_code && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <p>Their code <span className="font-mono font-semibold">{applicant.creator_code}</span> will be switched off here.</p>
                    <p className="mt-1.5">
                      It is <strong>not</strong> automatically removed from the revenue tracker, so it may still work at
                      checkout until someone removes it there.
                    </p>
                  </div>
                )}
                <p>No email is sent to the creator.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleUndoApproval(); }} disabled={busyAction}>
              {busyAction ? 'Undoing…' : 'Undo approval'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Soft delete — hides the application, keeps the record. */}
      <AlertDialog open={confirmDelete} onOpenChange={(o) => { setConfirmDelete(o); if (!o) setDeleteReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this application?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p><strong className="text-foreground">{applicant?.full_name}</strong> will be removed from the dashboard.</p>
                {bookings.length > 0 ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                    This creator has {bookings.length} booking{bookings.length === 1 ? '' : 's'}. Decline or remove
                    {bookings.length === 1 ? ' it' : ' them'} before deleting.
                  </div>
                ) : (
                  <p>The record is kept in the database, so nothing breaks and it can be restored if needed. No email is sent.</p>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Reason (optional)</label>
                  <Textarea rows={2} placeholder="e.g. duplicate application, spam, approved by mistake"
                    value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); handleDeleteApplication(); }}
              disabled={busyAction || bookings.length > 0}>
              {busyAction ? 'Deleting…' : 'Delete application'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
