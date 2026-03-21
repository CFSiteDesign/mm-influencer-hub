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
      .order('code', { ascending: true });

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
      (c.creator_name || '').toLowerCase().includes(s) ||
      (c.creator_email || '').toLowerCase().includes(s)
    );
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Code copied!');
  };

  return (
    <div className="min-h-screen bg-muted p-3 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img src={theoroxLogo} alt="TheoroX" className="h-6 sm:h-8 drop-shadow-md" />
            </div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground pl-1">All Codes</h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchCodes} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3 p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-base sm:text-lg">{filtered.length} Codes</CardTitle>
              <div className="relative w-full sm:w-64">
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
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading codes...</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block rounded-md border overflow-auto">
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
                            <TableCell>{c.creator_name || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">{c.creator_email || '—'}</TableCell>
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

                {/* Mobile card view */}
                <div className="sm:hidden space-y-2">
                  {filtered.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No codes found</p>
                  ) : (
                    filtered.map((c) => (
                      <div key={c.id} className="border rounded-lg p-3 bg-background flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono font-semibold text-sm">{c.code}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.creator_name || '—'}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.creator_email || '—'}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => copyToClipboard(c.code)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
