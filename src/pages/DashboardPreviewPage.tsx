import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import DashboardPage from './DashboardPage';

const PREVIEW_EMAIL = 'Admin.codes@madmonkeyhostels.com';
const PREVIEW_PASSWORD = 'Xk9#mQ2vL!pR7nW4';

const flowNotes = [
  {
    tag: 'Agentic AI',
    text: 'On submission, Apify agents scrape Instagram + TikTok follower and engagement data automatically — the numbers you see per applicant are machine-collected, not self-reported.',
  },
  {
    tag: 'Email flow',
    text: 'Approve → Creator ID + discount code generated, welcome email sent with the Payout Terms PDF, booking link issued, code synced to Revenue Hub. Disapprove → polite decline email. Replies land back in the in-app email log.',
  },
];

export default function DashboardPreviewPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const { error } = await supabase.auth.signInWithPassword({
          email: PREVIEW_EMAIL,
          password: PREVIEW_PASSWORD,
        });
        if (error && !cancelled) {
          setError(error.message);
          return;
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center text-sm text-destructive">
        Preview sign-in failed: {error}
      </div>
    );
  }

  if (!ready) {
    return <div className="flex h-screen items-center justify-center">Loading admin preview...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6">
          <Badge>Live admin dashboard — preview mode</Badge>
          <div className="grid gap-3 sm:grid-cols-2">
            {flowNotes.map((n) => (
              <div key={n.tag} className="rounded-md border bg-background p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">{n.tag}</p>
                <p className="mt-1 text-sm text-muted-foreground">{n.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <DashboardPage />
    </div>
  );
}
