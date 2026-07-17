import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ArrowLeft, Download, RefreshCw, Instagram, Music2, Users } from 'lucide-react';

// Phase 2 B2: "Creators of <Month> list that shows total followers on
// Instagram and TikTok and combined."
//
// "Creators of <Month>" is ambiguous, so both readings are selectable:
//  - Stayed  = creators whose stay starts in that month (who we hosted)
//  - Applied = creators who applied that month
type Basis = 'stayed' | 'applied';

type Row = {
  applicantId: string;
  name: string;
  email: string;
  instagram: number | null;
  tiktok: number | null;
  combined: number;
  instagramLink: string | null;
  tiktokLink: string | null;
  property: string | null;
  checkIn: string | null;
  fetchStatus: string | null;
};

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  // Follower counts are stored as text and may be creator-typed ("12.5k", "3,200").
  const raw = String(v).trim().toLowerCase().replace(/,/g, '');
  const m = raw.match(/^([\d.]+)\s*([km])?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * (m[2] === 'k' ? 1_000 : m[2] === 'm' ? 1_000_000 : 1));
};

const fmt = (n: number | null) => (n === null ? '—' : n.toLocaleString());

export default function MonthlyReportPage({ mode = 'prod' }: { mode?: 'prod' | 'test' }) {
  const isTest = mode === 'test';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [scrapingPosts, setScrapingPosts] = useState(false);
  const [basis, setBasis] = useState<Basis>('stayed');
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));

  const fetchAll = async () => {
    setLoading(true);
    const [aRes, bRes, pRes] = await Promise.all([
      supabase.from('applicants').select('*').eq('flow', isTest ? 'test' : 'prod'),
      supabase.from('bookings').select('applicant_id, property, check_in, status'),
      // B3: cached posts — the report reads these, scraping only on demand.
      (supabase as any).from('creator_posts').select('*'),
    ]);
    if (aRes.error) toast.error('Failed to load creators');
    setApplicants(aRes.data || []);
    setBookings(bRes.data || []);
    setPosts(pRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [isTest]);

  // Months offered come from whichever basis is selected, so the picker never
  // shows a month with nothing in it.
  const months = useMemo(() => {
    const set = new Set<string>();
    if (basis === 'stayed') bookings.forEach(b => b.check_in && set.add(b.check_in.slice(0, 7)));
    else applicants.forEach(a => a.submitted_at && set.add(a.submitted_at.slice(0, 7)));
    set.add(new Date().toISOString().slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [basis, bookings, applicants]);

  const rows: Row[] = useMemo(() => {
    const byId = new Map(applicants.map(a => [a.id, a]));
    const out: Row[] = [];

    if (basis === 'stayed') {
      // One row per creator hosted that month (dedup if they have several stays).
      const seen = new Set<string>();
      bookings
        .filter(b => b.check_in?.startsWith(month) && b.status !== 'declined')
        .forEach(b => {
          const a = byId.get(b.applicant_id);
          if (!a || seen.has(a.id)) return;
          seen.add(a.id);
          const ig = num(a.instagram_followers), tt = num(a.tiktok_followers);
          out.push({
            applicantId: a.id, name: a.full_name, email: a.email,
            instagram: ig, tiktok: tt, combined: (ig ?? 0) + (tt ?? 0),
            instagramLink: a.primary_social_link, tiktokLink: a.tiktok_link,
            property: b.property, checkIn: b.check_in, fetchStatus: a.followers_fetch_status,
          });
        });
    } else {
      applicants
        .filter(a => a.submitted_at?.startsWith(month))
        .forEach(a => {
          const ig = num(a.instagram_followers), tt = num(a.tiktok_followers);
          out.push({
            applicantId: a.id, name: a.full_name, email: a.email,
            instagram: ig, tiktok: tt, combined: (ig ?? 0) + (tt ?? 0),
            instagramLink: a.primary_social_link, tiktokLink: a.tiktok_link,
            property: null, checkIn: null, fetchStatus: a.followers_fetch_status,
          });
        });
    }
    return out.sort((a, b) => b.combined - a.combined);
  }, [basis, month, applicants, bookings]);

  const totals = useMemo(() => ({
    creators: rows.length,
    instagram: rows.reduce((s, r) => s + (r.instagram ?? 0), 0),
    tiktok: rows.reduce((s, r) => s + (r.tiktok ?? 0), 0),
    combined: rows.reduce((s, r) => s + r.combined, 0),
    missing: rows.filter(r => r.instagram === null && r.tiktok === null).length,
  }), [rows]);

  // B3: "Monthly summary of views, likes, comments on posts that mentioned
  // @madmonkeyhostels this month, on IG AND TT."
  const engagement = useMemo(() => {
    const inMonth = posts.filter(p => p.posted_at?.startsWith(month) && p.mentions_brand);
    const sum = (list: any[], k: string) => list.reduce((s, p) => s + (p[k] ?? 0), 0);
    const ig = inMonth.filter(p => p.platform === 'instagram');
    const tt = inMonth.filter(p => p.platform === 'tiktok');
    return {
      posts: inMonth.length,
      creators: new Set(inMonth.map(p => p.applicant_id)).size,
      views: sum(inMonth, 'views'), likes: sum(inMonth, 'likes'), comments: sum(inMonth, 'comments'),
      instagram: { posts: ig.length, views: sum(ig, 'views'), likes: sum(ig, 'likes'), comments: sum(ig, 'comments') },
      tiktok: { posts: tt.length, views: sum(tt, 'views'), likes: sum(tt, 'likes'), comments: sum(tt, 'comments') },
      lastFetched: applicants.map(a => a.posts_fetched_at).filter(Boolean).sort().reverse()[0] || null,
    };
  }, [posts, month, applicants]);

  // Scrape this month's posts for every creator in view, then reload.
  const scrapePosts = async () => {
    if (!rows.length) return;
    setScrapingPosts(true);
    let ok = 0, failed = 0;
    for (const r of rows) {
      try {
        const { data } = await supabase.functions.invoke('fetch-creator-engagement', {
          body: { applicantId: r.applicantId, month },
        });
        (data as any)?.ok ? ok++ : failed++;
      } catch { failed++; }
    }
    setScrapingPosts(false);
    toast[failed ? 'warning' : 'success'](`Posts scanned — ${ok} creator${ok === 1 ? '' : 's'} done${failed ? `, ${failed} failed` : ''}`);
    fetchAll();
  };

  // Pull fresh counts for everyone in view (Apify), then reload.
  const refreshFollowers = async () => {
    if (!rows.length) return;
    setRefreshing(true);
    let ok = 0, failed = 0;
    for (const r of rows) {
      try {
        const { data } = await supabase.functions.invoke('fetch-creator-followers', {
          body: { applicantId: r.applicantId },
        });
        (data as any)?.ok ? ok++ : failed++;
      } catch { failed++; }
    }
    setRefreshing(false);
    toast[failed ? 'warning' : 'success'](`Followers refreshed — ${ok} updated${failed ? `, ${failed} failed` : ''}`);
    fetchAll();
  };

  const exportCsv = () => {
    const head = ['Creator', 'Email', 'Instagram', 'TikTok', 'Combined', 'Instagram link', 'TikTok link',
      ...(basis === 'stayed' ? ['Property', 'Check-in'] : [])];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      head.join(','),
      ...rows.map(r => [r.name, r.email, r.instagram ?? '', r.tiktok ?? '', r.combined, r.instagramLink ?? '', r.tiktokLink ?? '',
        ...(basis === 'stayed' ? [r.property ?? '', r.checkIn ?? ''] : [])].map(esc).join(',')),
      [`"TOTAL (${totals.creators} creators)"`, '""', esc(totals.instagram), esc(totals.tiktok), esc(totals.combined)].join(','),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creators-${month}-${basis}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmtMonth = (m: string) => format(new Date(`${m}-01T00:00:00`), 'MMMM yyyy');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(isTest ? '/dashboard-test' : '/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold">Creators of {fmtMonth(month)}</h1>
            {isTest && <Badge className="bg-amber-100 text-amber-800">TEST</Badge>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshFollowers} disabled={refreshing || !rows.length}>
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh followers'}
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={!rows.length}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="sm:w-56"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              {months.map(m => <SelectItem key={m} value={m}>{fmtMonth(m)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={basis} onValueChange={(v) => setBasis(v as Basis)}>
            <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="stayed">Creators who stayed that month</SelectItem>
              <SelectItem value="applied">Creators who applied that month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Totals — the headline reach numbers for the month. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Creators', value: totals.creators.toLocaleString(), icon: Users },
            { label: 'Instagram followers', value: totals.instagram.toLocaleString(), icon: Instagram },
            { label: 'TikTok followers', value: totals.tiktok.toLocaleString(), icon: Music2 },
            { label: 'Combined reach', value: totals.combined.toLocaleString(), icon: Users, highlight: true },
          ].map(({ label, value, icon: Icon, highlight }) => (
            <Card key={label} className={highlight ? 'border-primary/40 bg-primary/5' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Icon className="h-3.5 w-3.5" />{label}
                </div>
                <p className={`text-2xl font-bold ${highlight ? 'text-primary' : ''}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {totals.missing > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
            {totals.missing} creator{totals.missing === 1 ? ' has' : 's have'} no follower data yet — totals exclude them.
            Use <strong>Refresh followers</strong> to fetch from Instagram and TikTok.
          </p>
        )}

        {/* B3: engagement on posts that mentioned the brand this month. */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base sm:text-lg">Posts mentioning @madmonkeyhostels</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {fmtMonth(month)} · Instagram + TikTok
                  {engagement.lastFetched && ` · last scanned ${format(new Date(engagement.lastFetched), 'd MMM, HH:mm')}`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={scrapePosts} disabled={scrapingPosts || !rows.length}>
                <RefreshCw className={`h-4 w-4 mr-1 ${scrapingPosts ? 'animate-spin' : ''}`} />
                {scrapingPosts ? 'Scanning posts…' : 'Scan posts'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            {engagement.posts === 0 ? (
              <p className="text-muted-foreground italic text-sm">
                No brand-mentioning posts found for {fmtMonth(month)}. Hit <strong>Scan posts</strong> to check
                {rows.length ? ` the ${rows.length} creator${rows.length === 1 ? '' : 's'} above` : ''}.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Posts', value: engagement.posts },
                    { label: 'Views', value: engagement.views },
                    { label: 'Likes', value: engagement.likes },
                    { label: 'Comments', value: engagement.comments },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground text-left">
                        <th className="py-2 pr-3 font-medium">Platform</th>
                        <th className="py-2 px-3 font-medium text-right">Posts</th>
                        <th className="py-2 px-3 font-medium text-right">Views</th>
                        <th className="py-2 px-3 font-medium text-right">Likes</th>
                        <th className="py-2 pl-3 font-medium text-right">Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'Instagram', icon: Instagram, d: engagement.instagram },
                        { name: 'TikTok', icon: Music2, d: engagement.tiktok },
                      ].map(({ name, icon: Icon, d }) => (
                        <tr key={name} className="border-b last:border-0">
                          <td className="py-2.5 pr-3"><span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{name}</span></td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{d.posts.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{d.views.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{d.likes.toLocaleString()}</td>
                          <td className="py-2.5 pl-3 text-right tabular-nums">{d.comments.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  From {engagement.creators} creator{engagement.creators === 1 ? '' : 's'}.
                  Instagram does not report view counts on photo posts, so views come from video content.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-base sm:text-lg">
              {rows.length} creator{rows.length === 1 ? '' : 's'} · {fmtMonth(month)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground italic text-sm">
                No creators {basis === 'stayed' ? 'stayed' : 'applied'} in {fmtMonth(month)}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground text-left">
                      <th className="py-2 pr-3 font-medium">Creator</th>
                      {basis === 'stayed' && <th className="py-2 px-3 font-medium">Stay</th>}
                      <th className="py-2 px-3 font-medium text-right">Instagram</th>
                      <th className="py-2 px-3 font-medium text-right">TikTok</th>
                      <th className="py-2 pl-3 font-medium text-right">Combined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.applicantId} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-2.5 pr-3">
                          <button
                            className="font-medium text-primary hover:underline text-left"
                            onClick={() => navigate(isTest ? `/applicants-test/${r.applicantId}` : `/applicants/${r.applicantId}`)}
                          >
                            {r.name}
                          </button>
                          <p className="text-xs text-muted-foreground truncate max-w-[220px]">{r.email}</p>
                        </td>
                        {basis === 'stayed' && (
                          <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                            {r.property}<br />{r.checkIn}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-right tabular-nums">{fmt(r.instagram)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{fmt(r.tiktok)}</td>
                        <td className="py-2.5 pl-3 text-right tabular-nums font-semibold">{r.combined ? r.combined.toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td className="py-2.5 pr-3">Total</td>
                      {basis === 'stayed' && <td />}
                      <td className="py-2.5 px-3 text-right tabular-nums">{totals.instagram.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{totals.tiktok.toLocaleString()}</td>
                      <td className="py-2.5 pl-3 text-right tabular-nums text-primary">{totals.combined.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
