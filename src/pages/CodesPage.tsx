import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Copy, RefreshCw, Search } from 'lucide-react';
import theoroxLogo from '@/assets/theorox-logo.png';

export default function CodesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('creator_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load codes');
    } else {
      setCodes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const filtered = codes.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.code.toLowerCase().includes(s) ||
      c.applicants?.full_name?.toLowerCase().includes(s) ||
      c.applicants?.email?.toLowerCase().includes(s)
    );
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Code copied!');
  };

  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={theoroxLogo} alt="TheoroX" className="h-10 drop-shadow-md" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">All Creator Codes</h1>
          </div>
          <Button variant="outline" onClick={fetchCodes} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{filtered.length} Codes</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search codes or names..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading codes...</p>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No codes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                          <TableCell>{c.applicants?.full_name || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{c.applicants?.email || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground capitalize">{c.method?.replace('_', ' ') || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(c.code)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
