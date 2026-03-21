import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { generateCreatorCode } from '@/lib/code-gen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { relativeTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, LogOut, RefreshCw } from 'lucide-react';
import theoroxLogo from '@/assets/theorox-logo.png';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const rowsPerPage = 25;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchApplicants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('applicants')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      toast.error('Failed to load applications');
    } else {
      setApplicants(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApplicants();

    const channel = supabase
      .channel('applicants-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applicants' },
        () => {
          fetchApplicants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (applicant: any) => {
    try {
      const { error: approveError } = await supabase
        .from('applicants')
        .update({ status: 'approved' })
        .eq('id', applicant.id);
      if (approveError) throw approveError;

      const { code, method } = await generateCreatorCode(applicant.full_name);
      if (!code) {
        toast.error('Code generation exhausted. Please assign manually.');
        await fetchApplicants();
        return;
      }

      const { error: codeError } = await supabase
        .from('creator_codes')
        .insert([{ code, applicant_id: applicant.id, method }]);
      if (codeError) throw codeError;

      const { error: finalError } = await supabase
        .from('applicants')
        .update({ creator_code: code, status: 'code_generated' })
        .eq('id', applicant.id);
      if (finalError) throw finalError;

      await supabase.from('status_log').insert([{
        applicant_id: applicant.id,
        from_status: 'pending',
        to_status: 'code_generated',
        changed_by: user?.email || 'system',
        note: `Approved and code generated: ${code}`
      }]);

      toast.success(`Approved! Code generated: ${code}`);
      fetchApplicants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve applicant');
    }
  };

  const handleDisapprove = async (applicant: any) => {
    try {
      const { error } = await supabase
        .from('applicants')
        .update({ status: 'disapproved' })
        .eq('id', applicant.id);
      if (error) throw error;

      await supabase.from('status_log').insert([{
        applicant_id: applicant.id,
        from_status: 'pending',
        to_status: 'disapproved',
        changed_by: user?.email || 'system',
      }]);

      toast.success('Application disapproved');
      fetchApplicants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to disapprove applicant');
    }
  };

  const handleMarkAsDone = async (applicant: any) => {
    try {
      const { error } = await supabase
        .from('applicants')
        .update({ status: 'done' })
        .eq('id', applicant.id);
      if (error) throw error;

      await supabase.from('status_log').insert([{
        applicant_id: applicant.id,
        from_status: 'code_generated',
        to_status: 'done',
        changed_by: user?.email || 'system',
      }]);

      toast.success('Code marked as created');
      fetchApplicants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark as done');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Code copied!');
  };

  const totalApps = applicants.length;
  const pendingApps = applicants.filter(a => a.status === 'pending').length;
  const approvedApps = applicants.filter(a => ['approved', 'code_generated', 'done'].includes(a.status)).length;
  const codesToAdd = applicants.filter(a => a.status === 'code_generated');

  let filtered = [...applicants];
  if (debouncedSearch) {
    const s = debouncedSearch.toLowerCase();
    filtered = filtered.filter(a => a.full_name.toLowerCase().includes(s) || a.email.toLowerCase().includes(s));
  }
  if (statusFilter !== 'All') {
    const statusMap: Record<string, string> = {
      'Pending': 'pending', 'Approved': 'approved', 'Disapproved': 'disapproved',
      'Code Generated': 'code_generated', 'Done': 'done'
    };
    filtered = filtered.filter(a => a.status === statusMap[statusFilter]);
  }
  if (sortOrder === 'newest') filtered.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  else if (sortOrder === 'oldest') filtered.sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
  else if (sortOrder === 'name') filtered.sort((a, b) => a.full_name.localeCompare(b.full_name));

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-secondary text-secondary-foreground',
      approved: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
      disapproved: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
      code_generated: 'bg-green-100 text-green-800 hover:bg-green-200',
      done: 'bg-primary/10 text-primary hover:bg-primary/20',
    };
    const labels: Record<string, string> = {
      pending: 'Pending', approved: 'Approved', disapproved: 'Disapproved',
      code_generated: 'Code Ready', done: 'Done'
    };
    return <Badge className={styles[status] || ''}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
           <div className="flex items-center gap-3">
              <img src={theoroxLogo} alt="TheoroX" className="h-14 drop-shadow-md" />
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchApplicants} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{totalApps}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{pendingApps}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{approvedApps}</div></CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-700">Codes to Add</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-green-800">{codesToAdd.length}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Input placeholder="Search name or email..." className="max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Disapproved">Disapproved</SelectItem>
                  <SelectItem value="Code Generated">Code Generated</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(v) => { setSortOrder(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : paginated.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No applications found.</TableCell></TableRow>
                  ) : (
                    paginated.map((app) => (
                      <TableRow key={app.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/applicants/${app.id}`)}>
                        <TableCell className="font-medium">{app.full_name}</TableCell>
                        <TableCell>{app.email}</TableCell>
                        <TableCell>{app.whatsapp_number}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{app.dates_requested || '—'}</TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                        <TableCell className="font-mono text-sm">{app.creator_code || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{relativeTime(app.submitted_at)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {app.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(app)}>Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDisapprove(app)}>Disapprove</Button>
                            </div>
                          )}
                          {app.status === 'disapproved' && <span className="text-sm text-muted-foreground">Disapproved</span>}
                          {app.status === 'done' && <span className="text-sm text-muted-foreground">Complete</span>}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-end space-x-2 py-4">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Codes to Add</h2>
            <Badge variant="secondary" className="text-sm px-2 py-0.5">{codesToAdd.length}</Badge>
          </div>
          {codesToAdd.length === 0 ? (
            <Card className="bg-muted border-dashed">
              <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                All caught up! No codes waiting to be created.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {codesToAdd.map(app => (
                  <motion.div key={app.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                    <Card className="border-green-200 shadow-sm transition-all hover:shadow-md h-full">
                      <CardContent className="p-6 space-y-4 flex flex-col h-full">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-foreground">{app.full_name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{app.email} • {app.whatsapp_number}</p>
                          {app.dates_requested && <p className="text-sm text-muted-foreground">{app.dates_requested}</p>}
                        </div>
                        <div className="bg-secondary rounded-lg p-4 flex items-center justify-between">
                          <span className="font-mono text-2xl font-bold tracking-tight text-foreground">{app.creator_code}</span>
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(app.creator_code)}>
                            <Copy className="h-5 w-5 text-muted-foreground" />
                          </Button>
                        </div>
                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleMarkAsDone(app)}>
                          Mark as Done
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
