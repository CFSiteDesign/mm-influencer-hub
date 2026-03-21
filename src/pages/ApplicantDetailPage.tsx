import { useEffect, useState } from 'react';
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
import { ArrowLeft, Copy } from 'lucide-react';

export default function ApplicantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applicant, setApplicant] = useState<any>(null);
  const [codeMethod, setCodeMethod] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchApplicant = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast.error('Failed to load applicant details');
      navigate('/dashboard');
    } else {
      setApplicant(data);
      setNotes(data.notes || '');
      if (data.creator_code) {
        const { data: codeData } = await supabase
          .from('creator_codes')
          .select('method')
          .eq('code', data.creator_code)
          .single();
        if (codeData) setCodeMethod(codeData.method);
      }
    }

    const { data: logsData } = await supabase
      .from('status_log')
      .select('*')
      .eq('applicant_id', id)
      .order('changed_at', { ascending: false });

    setLogs(logsData || []);
    setLoading(false);
  };

  useEffect(() => {
    if (id) fetchApplicant();
  }, [id]);

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

      const { error: finalError } = await supabase.from('applicants').update({ creator_code: code, status: 'code_generated' }).eq('id', id);
      if (finalError) throw finalError;

      await supabase.from('status_log').insert([{
        applicant_id: id, from_status: 'pending', to_status: 'code_generated',
        changed_by: user?.email || 'system', note: `Approved and code generated: ${code} (Method: ${method})`
      }]);

      toast.success(`Approved! Code generated: ${code}`);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Code copied!');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-secondary text-secondary-foreground text-lg px-4 py-1',
      approved: 'bg-amber-100 text-amber-800 hover:bg-amber-200 text-lg px-4 py-1',
      disapproved: 'bg-destructive/10 text-destructive hover:bg-destructive/20 text-lg px-4 py-1',
      code_generated: 'bg-green-100 text-green-800 hover:bg-green-200 text-lg px-4 py-1',
      done: 'bg-primary/10 text-primary hover:bg-primary/20 text-lg px-4 py-1',
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
    <div className="min-h-screen bg-muted p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl font-bold">{applicant.full_name}</CardTitle>
                    <p className="text-muted-foreground mt-1">Submitted {relativeTime(applicant.submitted_at)}</p>
                  </div>
                  {getStatusBadge(applicant.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <a href={`mailto:${applicant.email}`} className="text-primary hover:underline">{applicant.email}</a>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
                    <p className="text-foreground">{applicant.whatsapp_number}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Dates Requested</p>
                    <p className="text-foreground">{applicant.dates_requested || 'Not specified'}</p>
                  </div>
                </div>

                {applicant.creator_code && (
                  <div className="bg-secondary rounded-lg p-6 flex flex-col items-center justify-center space-y-2 border">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Creator Code</p>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-4xl font-bold tracking-tight text-foreground">{applicant.creator_code}</span>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(applicant.creator_code)}>
                        <Copy className="h-5 w-5 text-muted-foreground" />
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
                  <Textarea placeholder="Add notes about this applicant..." value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[120px]" />
                  <div className="flex justify-end">
                    <Button onClick={handleSaveNotes} disabled={savingNotes} variant="secondary">
                      {savingNotes ? 'Saving...' : 'Save Notes'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-muted-foreground italic">No activity recorded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {logs.map(log => (
                      <div key={log.id} className="flex gap-4 border-l-2 border-border pl-4 py-1">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm">
                            <span className="font-medium text-foreground">{log.changed_by}</span>
                            {' changed status '}
                            {log.from_status && <span className="text-muted-foreground line-through">{log.from_status}</span>}
                            {log.from_status && ' → '}
                            <span className="font-medium text-foreground">{log.to_status}</span>
                          </p>
                          {log.note && <p className="text-sm text-muted-foreground italic">{log.note}</p>}
                          <p className="text-xs text-muted-foreground">{new Date(log.changed_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
