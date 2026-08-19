import { useState } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import madMonkeyLogo from '@/assets/mad-monkey-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function BookingLinkRequestPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!clean.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-booking-link', {
        body: { email: clean },
      });
      if (error) throw error;
      if (data && (data as any).ok === false) {
        toast.error((data as any).error || 'Something went wrong');
        return;
      }
      setSent(true);
    } catch {
      toast.error('Could not send your link. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={madMonkeyLogo} alt="Mad Monkey" className="h-14 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-foreground">Request collaboration dates</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enter the email you applied with and we'll send your personal booking link.
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Check your inbox</h2>
            <p className="text-sm text-muted-foreground">
              If that email matches an approved creator, your booking link is on its way. It can take a
              minute or two — remember to check spam.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Still nothing? Email{' '}
              <a href="mailto:creatorhub@madmonkeyhostels.com" className="text-primary font-medium">
                creatorhub@madmonkeyhostels.com
              </a>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Your email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? 'Sending…' : 'Send me my booking link'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Only approved Creator Hub members can request dates.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
