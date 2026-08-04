import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const steps = [
  {
    n: '01',
    title: 'Creator applies',
    tag: 'Public form',
    body:
      'A creator submits the Creator Hub application (name, email, WhatsApp, socials, creator type, stay preferences). The record lands in the applicants table with status "pending".',
    bullets: ['Route: /apply', 'Stored instantly in the backend', 'Instant internal alert email to the team (reply-to = the creator)'],
  },
  {
    n: '02',
    title: 'Agentic AI enrichment (Apify)',
    tag: 'Automated',
    body:
      'The moment an application is saved, an automated agent runs in the background. It parses the Instagram / TikTok links, launches the Apify profile scrapers in parallel and writes follower counts back onto the application — no manual checking, no self-reported numbers.',
    bullets: [
      'fetch-creator-followers — IG + TikTok follower counts',
      'fetch-creator-engagement — recent posts, views, likes, engagement rate',
      'Results cached so the admin page loads instantly',
      'Every run stamps a status ("ok", "partial", "failed") for transparency',
    ],
  },
  {
    n: '03',
    title: 'Admin review',
    tag: 'Human decision',
    body:
      'The admin dashboard shows every applicant with their scraped audience data side by side. One click to approve, one click to disapprove. Nothing is sent until a human decides.',
    bullets: ['Sortable / filterable list', 'Full applicant detail view', 'CSV export of the whole pipeline'],
  },
  {
    n: '04a',
    title: 'Approved → code + emails',
    tag: 'Automated chain',
    body:
      'Approval kicks off a chain: a unique Creator ID (CH###) and a personal discount code are generated, the welcome email goes out with the Payout Terms PDF attached, and a token-gated booking link is issued.',
    bullets: [
      'Creator ID + discount code generated',
      'Welcome email (spam-optimised, PDF attached)',
      'Booking link /book/:token — max 5 nights',
      'Code pushed to the Revenue Hub via API',
      'Approved creator exposed to the Staff Discount app',
    ],
  },
  {
    n: '04b',
    title: 'Disapproved → polite decline',
    tag: 'Automated',
    body: 'A pre-written decline email is sent automatically and the applicant is archived with a full status history.',
    bullets: ['send-disapproval-email', 'Status log keeps an audit trail'],
  },
  {
    n: '05',
    title: 'Booking + property notifications',
    tag: 'Automated',
    body:
      'The creator picks their dates on the token-gated page. The system notifies the right hostel GM and Customer Service automatically based on the property chosen, then confirms back to the creator.',
    bullets: ['Per-property GM email routing', 'CS booking email with all creator details', 'Confirmation email once booked'],
  },
  {
    n: '06',
    title: 'Two-way inbox',
    tag: 'Live',
    body:
      'Creator replies come back through an inbound email webhook and appear as an in-app chat log against the creator, so the whole conversation lives in one place.',
    bullets: ['Inbound webhook with signature verification', 'Threaded per creator', 'Reply from inside the dashboard'],
  },
  {
    n: '07',
    title: 'Ongoing control',
    tag: 'Admin',
    body:
      'Codes directory, ALL IN Trips eligibility toggle per code (synced live to the trips site), monthly performance reports and revenue sync.',
    bullets: ['Codes directory with copy-to-clipboard', 'ALL IN eligible yes/no per code', 'Monthly reports'],
  },
];

const integrations = [
  { name: 'Apify', role: 'Instagram + TikTok scraping agents' },
  { name: 'Resend', role: 'Outbound & inbound email' },
  { name: 'Revenue Hub', role: 'Discount code + commission tracking' },
  { name: 'ALL IN Trips', role: 'Affiliate eligibility sync' },
  { name: 'Staff Discount App', role: 'Approved creator feed' },
];

export default function DashboardPreviewPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <Badge className="mb-4">Backend walkthrough</Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How the Mad Monkey Creator Hub works
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            From application to approval, AI-enriched audience data, automated emails and live syncs
            with the Revenue Hub — the full pipeline, end to end.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { k: 'Manual checks removed', v: 'Follower + engagement data pulled automatically' },
            { k: 'Emails automated', v: 'Welcome, decline, booking, GM & CS notifications' },
            { k: 'Systems kept in sync', v: 'Revenue Hub, ALL IN Trips, Staff Discount app' },
          ].map((s) => (
            <Card key={s.k}>
              <CardContent className="pt-6">
                <p className="text-sm font-semibold">{s.k}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.v}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="mb-6 mt-12 text-2xl font-bold">The flow</h2>
        <ol className="space-y-4">
          {steps.map((s) => (
            <li key={s.n}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-md bg-primary px-2.5 py-1 font-mono text-xs font-bold text-primary-foreground">
                      {s.n}
                    </span>
                    <CardTitle className="text-lg">{s.title}</CardTitle>
                    <Badge variant="secondary">{s.tag}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                  <ul className="mt-3 space-y-1.5">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex gap-2 text-sm">
                        <span className="text-primary">→</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>

        <h2 className="mb-4 mt-12 text-2xl font-bold">Connected systems</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {integrations.map((i) => (
            <Card key={i.name}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <span className="font-semibold">{i.name}</span>
                <span className="text-right text-sm text-muted-foreground">{i.role}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Showcase page — no live data is shown and no login is required.
        </p>
      </main>
    </div>
  );
}
