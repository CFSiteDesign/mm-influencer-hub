import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

// Creatorhub Booking Confirmation Updates (27 Nov 2026): each booking
// confirmation is BCC'd to the finance team for the hostel's country. The list
// comes from the Finance tab of the "Regional / Global Master List" (updated
// monthly by Mark Lince) and is kept here so admins can change it.

type Contact = { id: string; country: string; full_name: string | null; email: string; job_title: string | null };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Addresses from a typed list: one per line, commas and spaces also split. */
export function parseEmailList(text: string): { emails: string[]; bad: string[] } {
  const seen = new Set<string>();
  const emails: string[] = [];
  const bad: string[] = [];
  for (const part of text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean)) {
    if (!EMAIL_RE.test(part)) { bad.push(part); continue; }
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    emails.push(part);
  }
  return { emails, bad };
}

export default function FinanceBccCard({ countries, hostelsByCountry }: {
  countries: string[];
  hostelsByCountry: Record<string, string[]>;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from('finance_contacts')
      .select('id, country, full_name, email, job_title').order('created_at', { ascending: true });
    if (error) toast.error('Could not load the finance BCC list');
    setContacts(data ?? []);
    setDrafts({});
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const byCountry = useMemo(() => {
    const m: Record<string, Contact[]> = {};
    for (const c of contacts) (m[c.country] ??= []).push(c);
    return m;
  }, [contacts]);
  const list = useMemo(() => [...new Set([...countries, ...Object.keys(byCountry)])], [countries, byCountry]);

  const saved = (country: string) => (byCountry[country] ?? []).map((c) => c.email).join('\n');
  const textFor = (country: string) => drafts[country] ?? saved(country);
  const isDirty = (country: string) => drafts[country] !== undefined && drafts[country].trim() !== saved(country);

  const save = async (country: string) => {
    const { emails, bad } = parseEmailList(textFor(country));
    if (bad.length) { toast.error(`Not an email address: ${bad.join(', ')}`); return; }
    setSaving(country);
    try {
      const current = byCountry[country] ?? [];
      const keep = new Set(emails.map((e) => e.toLowerCase()));
      const have = new Set(current.map((c) => c.email.toLowerCase()));
      const remove = current.filter((c) => !keep.has(c.email.toLowerCase())).map((c) => c.id);
      const add = emails.filter((e) => !have.has(e.toLowerCase())).map((email) => ({ country, email }));
      if (remove.length) {
        const { error } = await (supabase as any).from('finance_contacts').delete().in('id', remove);
        if (error) throw error;
      }
      if (add.length) {
        const { error } = await (supabase as any).from('finance_contacts').insert(add);
        if (error) throw error;
      }
      toast.success(`${country}: ${emails.length} finance ${emails.length === 1 ? 'address' : 'addresses'} saved`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-2">
        <CardTitle className="text-base sm:text-lg">Finance BCC</CardTitle>
        <p className="text-sm text-muted-foreground">
          Every booking confirmation is BCC'd to the finance team for the hostel's country (not the
          one-week reminder). The list comes from the Finance tab of the Regional / Global Master List,
          which Mark Lince updates monthly. Change it here when that list changes: one email per line.
        </p>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {list.map((country) => {
              const people = byCountry[country] ?? [];
              const dirty = isDirty(country);
              return (
                <div key={country} className={`rounded-lg border p-3 space-y-2 ${dirty ? 'border-primary/50 bg-primary/5' : ''}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{country}</span>
                    <span className="text-xs text-muted-foreground">
                      {people.length ? `${people.length} BCC'd` : 'Nobody BCC\'d'}
                    </span>
                  </div>
                  {hostelsByCountry[country]?.length ? (
                    <p className="text-xs text-muted-foreground">{hostelsByCountry[country].join(', ')}</p>
                  ) : null}
                  <Textarea
                    aria-label={`Finance emails for ${country}`}
                    className="font-mono text-xs min-h-[96px]"
                    placeholder="finance@madmonkeyhostels.com"
                    value={textFor(country)}
                    onChange={(e) => setDrafts((d) => ({ ...d, [country]: e.target.value }))}
                  />
                  {people.some((p) => p.full_name) && !dirty && (
                    <p className="text-xs text-muted-foreground">
                      {people.map((p) => p.full_name || p.email).join(', ')}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => save(country)} disabled={!dirty || saving === country}>
                      <Save className="h-3.5 w-3.5 mr-1.5" />{saving === country ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
