import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Search, Save, Mail, AlertCircle } from 'lucide-react';

// Phase 3 item 8: "A section where i can input or change GM emails instead of
// you doing it manually whenever there is a new GM."
//
// The GM email is what gets CC'd on a booking confirmation, so a stale one
// means a property never hears that a creator is arriving.

type Property = {
  id: string;
  location: string;
  country: string;
  gm_name: string | null;
  gm_email: string | null;
  is_active: boolean;
  excluded_from_booking: boolean;
  sort_order: number;
};

// Deliberately permissive — enough to catch a typo, not to police valid addresses.
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function PropertiesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Property[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { gm_name: string; gm_email: string }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProperties = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) toast.error('Could not load properties');
    setRows((data as Property[]) || []);
    setDrafts({});
    setLoading(false);
  };

  useEffect(() => { fetchProperties(); }, []);

  const draftFor = (p: Property) =>
    drafts[p.id] ?? { gm_name: p.gm_name || '', gm_email: p.gm_email || '' };

  const isDirty = (p: Property) => {
    const d = drafts[p.id];
    if (!d) return false;
    return d.gm_name !== (p.gm_name || '') || d.gm_email !== (p.gm_email || '');
  };

  const setDraft = (p: Property, patch: Partial<{ gm_name: string; gm_email: string }>) =>
    setDrafts((prev) => ({ ...prev, [p.id]: { ...draftFor(p), ...patch } }));

  const save = async (p: Property) => {
    const d = draftFor(p);
    const email = d.gm_email.trim();
    if (email && !looksLikeEmail(email)) {
      toast.error(`"${email}" doesn't look like an email address`);
      return;
    }
    setSaving((s) => ({ ...s, [p.id]: true }));
    try {
      const { error } = await supabase
        .from('properties')
        .update({ gm_name: d.gm_name.trim() || null, gm_email: email || null })
        .eq('id', p.id);
      if (error) throw error;
      setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, gm_name: d.gm_name.trim() || null, gm_email: email || null } : r)));
      setDrafts((prev) => { const n = { ...prev }; delete n[p.id]; return n; });
      toast.success(`${p.location} updated`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not save');
    } finally {
      setSaving((s) => ({ ...s, [p.id]: false }));
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.location, r.country, r.gm_name, r.gm_email].some((v) => (v || '').toLowerCase().includes(q)));
  }, [rows, search]);

  const missing = rows.filter((r) => r.is_active && !r.excluded_from_booking && !r.gm_email);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Properties &amp; GM emails</h1>
        </div>

        <p className="text-sm text-muted-foreground">
          The GM email is CC'd on every booking confirmation for that property, alongside the
          location inbox. Update it here whenever a General Manager changes.
        </p>

        {missing.length > 0 && (
          <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              <strong>{missing.length}</strong> bookable {missing.length === 1 ? 'property has' : 'properties have'} no
              GM email — confirmations for {missing.length === 1 ? 'it' : 'them'} go out without a GM CC'd.
              {' '}({missing.map((m) => m.location).join(', ')})
            </p>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search property, country, GM name or email…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-base sm:text-lg">
              {filtered.length} propert{filtered.length === 1 ? 'y' : 'ies'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No properties match that search.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((p) => {
                  const d = draftFor(p);
                  const dirty = isDirty(p);
                  return (
                    <div key={p.id} className={`rounded-lg border p-3 space-y-3 ${dirty ? 'border-primary/50 bg-primary/5' : ''}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{p.location}</span>
                        <span className="text-xs text-muted-foreground">{p.country}</span>
                        {!p.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                        {p.excluded_from_booking && <Badge variant="secondary" className="text-[10px]">Not bookable</Badge>}
                        {!p.gm_email && <Badge className="bg-amber-100 text-amber-800 text-[10px]">No GM email</Badge>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-2">
                        <Input placeholder="GM name" value={d.gm_name}
                          onChange={(e) => setDraft(p, { gm_name: e.target.value })} />
                        <Input placeholder="gm@madmonkeyhostels.com" type="email" value={d.gm_email}
                          onChange={(e) => setDraft(p, { gm_email: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter' && dirty) save(p); }} />
                        <Button onClick={() => save(p)} disabled={!dirty || saving[p.id]} className="sm:w-28">
                          <Save className="h-4 w-4 mr-1.5" />{saving[p.id] ? 'Saving…' : 'Save'}
                        </Button>
                      </div>
                      {p.gm_email && !dirty && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Mail className="h-3 w-3" />Confirmations CC {p.gm_email}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
