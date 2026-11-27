import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import madMonkeyLogo from '@/assets/mad-monkey-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AUDIENCE_SIZES, PARTNER_CATEGORIES, PROMOTION_CHANNELS } from '@/lib/partners';

// Partner Hub apply page: madmonkeyhostels.com/creatorhub/apply/partners
// Public since 27 Nov 2026 (Kyle, via Cai): anyone with the link can apply, but
// the page is not linked from anywhere on the site. It used to need an invite
// link; an old ?invite=... on the address is simply ignored. Submissions go
// into the normal approval queue, so nothing goes live without an admin.

const AGREEMENT_URL = 'https://madmonkey-wp.sgp1.cdn.digitaloceanspaces.com/creator-hub-commission-agreement.pdf';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Form = {
  orgName: string; category: string; website: string; contactName: string; contactRole: string;
  email: string; phone: string; regions: string; channels: string[]; audience: string;
};
const EMPTY: Form = { orgName: '', category: '', website: '', contactName: '', contactRole: '', email: '', phone: '', regions: '', channels: [], audience: '' };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <img src={madMonkeyLogo} alt="Mad Monkey" className="h-8" />
        <span className="text-xs font-semibold text-orange-500">Partner Hub</span>
      </div>
      <div className="flex-1 w-full max-w-xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}

export default function PartnerApplyPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  // Left empty by people; bots that fill every field get a quiet "thanks".
  const [trap, setTrap] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleChannel = (c: string, on: boolean) =>
    set('channels', on ? [...new Set([...form.channels, c])] : form.channels.filter((x) => x !== c));

  const problem = (): string | null => {
    if (!form.orgName.trim()) return 'Please enter your organisation name.';
    if (!form.category) return 'Please choose what kind of partner you are.';
    if (!form.contactName.trim()) return 'Please enter your name.';
    if (!EMAIL_RE.test(form.email.trim())) return 'Please enter a valid email address.';
    if (!form.channels.length) return 'Please tell us how you will share your code.';
    if (!agreed) return 'Please agree to the Commission Agreement.';
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = problem();
    if (p) { setError(p); return; }
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('submit-partner-application', {
        body: { action: 'submit', ...form, agreed: true, company_fax: trap },
      });
      if (fnError) throw fnError;
      if (!data?.ok) { setError(data?.error || 'Something went wrong. Please try again.'); return; }
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Shell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-12">
          <h1 className="text-2xl font-bold text-foreground">Thanks, {form.orgName.trim()}!</h1>
          <p className="text-muted-foreground">
            We have your application. Our partnerships team will review it and email your code to <strong className="text-foreground">{form.email.trim()}</strong>.
          </p>
        </motion.div>
      </Shell>
    );
  }

  return (
    <Shell>
      <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="space-y-6" noValidate>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Become a Mad Monkey partner</h1>
          <p className="text-muted-foreground">
            Share your own Mad Monkey code with your guests or audience and earn commission on every stay booked with it.
            Tell us about your organisation and we will be in touch with your code.
          </p>
          <p className="text-sm text-muted-foreground">
            Creating content as an individual?{' '}
            <a href="https://madmonkeyhostels.com/creatorhub" className="text-primary underline">Apply to the Creator Hub</a> instead.
          </p>
        </div>

        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="company_fax">Company fax</label>
          <input id="company_fax" name="company_fax" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </div>

        <section className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="orgName">Organisation name</Label>
            <Input id="orgName" className="text-base" value={form.orgName} onChange={(e) => set('orgName', e.target.value)} autoComplete="organization" />
          </div>
          <div className="space-y-1.5">
            <Label>What kind of partner are you?</Label>
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger aria-label="What kind of partner are you?" className="text-base"><SelectValue placeholder="Choose one" /></SelectTrigger>
              <SelectContent>
                {PARTNER_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" className="text-base" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="yourwebsite.com" autoComplete="url" />
          </div>
        </section>

        <section className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contactName">Your name</Label>
              <Input id="contactName" className="text-base" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactRole">Your role</Label>
              <Input id="contactRole" className="text-base" value={form.contactRole} onChange={(e) => set('contactRole', e.target.value)} placeholder="e.g. Marketing manager" autoComplete="organization-title" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" className="text-base" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone or WhatsApp (optional)</Label>
              <Input id="phone" type="tel" className="text-base" value={form.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="regions">Country or regions you cover</Label>
            <Input id="regions" className="text-base" value={form.regions} onChange={(e) => set('regions', e.target.value)} placeholder="e.g. Portugal and Spain" />
          </div>
        </section>

        <section className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium leading-none mb-2">How will you share your code?</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PROMOTION_CHANNELS.map((c) => (
                <label key={c.value} className="flex items-center gap-2 rounded-md border p-3 text-sm cursor-pointer">
                  <Checkbox checked={form.channels.includes(c.value)} onCheckedChange={(v) => toggleChannel(c.value, v === true)} />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label>Rough audience size (guests, subscribers or followers)</Label>
            <Select value={form.audience} onValueChange={(v) => set('audience', v)}>
              <SelectTrigger aria-label="Rough audience size" className="text-base"><SelectValue placeholder="Choose a size" /></SelectTrigger>
              <SelectContent>
                {AUDIENCE_SIZES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </section>

        <label className="flex items-start gap-3 rounded-md border p-3 text-sm cursor-pointer">
          <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" aria-label="I agree to the Creator and Partner Commission Agreement" />
          <span>
            I agree to the{' '}
            <a href={AGREEMENT_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline" onClick={(e) => e.stopPropagation()}>
              Creator and Partner Commission Agreement
            </a>.
          </span>
        </label>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Sending…' : 'Apply'}
        </Button>
      </motion.form>
    </Shell>
  );
}
