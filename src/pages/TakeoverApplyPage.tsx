import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, ArrowLeft, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import madMonkeyLogo from '@/assets/mad-monkey-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FormData {
  fullName: string;
  email: string;
  instagram: string;
  tiktok: string;
  otherSocials: string;
  soldBefore: string;
  screenshotFile: File | null;
  whenPeriod: string;
  whereCountry: string;
}

const ALL_PERIODS = [
  { label: 'JAN - MARCH 2027', endYear: 2027, endMonth: 3 },
  { label: 'APRIL - JUNE 2026', endYear: 2026, endMonth: 6 },
  { label: 'JULY - SEPT 2026', endYear: 2026, endMonth: 9 },
  { label: 'OCT - DEC 2026', endYear: 2026, endMonth: 12 },
];

function getUpcomingPeriods() {
  const now = new Date();
  return ALL_PERIODS.filter(p => {
    // include period if its last day hasn't passed
    const endDate = new Date(p.endYear, p.endMonth, 0); // last day of end month
    return endDate >= now;
  }).sort((a, b) => {
    const aD = new Date(a.endYear, a.endMonth, 0).getTime();
    const bD = new Date(b.endYear, b.endMonth, 0).getTime();
    return aD - bD;
  });
}

const COUNTRIES = ['Cambodia', 'Indonesia', 'Vietnam'];

function StepWrapper({ children, stepKey }: { children: React.ReactNode; stepKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function QBlock({ n, label, required, children }: { n: number; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <span className="text-xs font-bold text-orange-500">Q{n}</span>
        <h2 className="text-lg font-bold text-foreground mt-0.5">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </h2>
      </div>
      {children}
    </div>
  );
}

export default function TakeoverApplyPage() {
  const periods = getUpcomingPeriods();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fd, setFd] = useState<FormData>({
    fullName: '', email: '', instagram: '', tiktok: '', otherSocials: '',
    soldBefore: '', screenshotFile: null, whenPeriod: '', whereCountry: '',
  });
  const update = (k: keyof FormData, v: any) => setFd(p => ({ ...p, [k]: v }));

  const steps = [
    { id: 'name', valid: () => fd.fullName.trim().length > 0, render: () => (
      <QBlock n={1} label="Creator Hub is full for July, but we will be taking applications again in August!" required>
        <Input autoFocus placeholder="Jane Doe" className="h-12 text-base rounded-xl" value={fd.fullName} onChange={e => update('fullName', e.target.value)} />
      </QBlock>
    )},
    { id: 'email', valid: () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.email), render: () => (
      <QBlock n={2} label="Email" required>
        <Input type="email" autoFocus placeholder="you@example.com" className="h-12 text-base rounded-xl" value={fd.email} onChange={e => update('email', e.target.value)} />
      </QBlock>
    )},
    { id: 'instagram', valid: () => fd.instagram.trim().length > 0, render: () => (
      <QBlock n={3} label="Instagram" required>
        <Input autoFocus placeholder="https://instagram.com/yourhandle" className="h-12 text-base rounded-xl" value={fd.instagram} onChange={e => update('instagram', e.target.value)} />
      </QBlock>
    )},
    { id: 'tiktok', valid: () => fd.tiktok.trim().length > 0, render: () => (
      <QBlock n={4} label="TikTok" required>
        <Input autoFocus placeholder="https://tiktok.com/@yourhandle" className="h-12 text-base rounded-xl" value={fd.tiktok} onChange={e => update('tiktok', e.target.value)} />
      </QBlock>
    )},
    { id: 'others', valid: () => true, render: () => (
      <QBlock n={5} label="Others (optional)">
        <Input autoFocus placeholder="YouTube, Twitter, etc." className="h-12 text-base rounded-xl" value={fd.otherSocials} onChange={e => update('otherSocials', e.target.value)} />
      </QBlock>
    )},
    { id: 'sold', valid: () => fd.soldBefore === 'yes' || fd.soldBefore === 'no', render: () => (
      <QBlock n={6} label="Have you ever sold anything to your audience before?" required>
        <div className="flex gap-3">
          {['yes', 'no'].map(v => (
            <button key={v} type="button" onClick={() => update('soldBefore', v)}
              className={cn(
                "flex-1 rounded-xl border-2 py-3 px-4 text-sm font-medium capitalize transition-all",
                fd.soldBefore === v ? "border-orange-500 bg-orange-500/10 text-orange-600" : "border-border hover:border-orange-500/50"
              )}>
              {v}
            </button>
          ))}
        </div>
      </QBlock>
    )},
    { id: 'screenshot', valid: () => !!fd.screenshotFile, render: () => (
      <QBlock n={7} label="Upload a screenshot of your Story Views (Last 24h)" required>
        <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-orange-500/40 bg-orange-500/5 cursor-pointer hover:bg-orange-500/10 transition-colors">
          <Upload className="h-6 w-6 text-orange-500" />
          <span className="text-sm font-medium text-foreground">
            {fd.screenshotFile ? fd.screenshotFile.name : 'Tap to upload screenshot'}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={e => update('screenshotFile', e.target.files?.[0] || null)} />
        </label>
      </QBlock>
    )},
    { id: 'when', valid: () => fd.whenPeriod.length > 0, render: () => (
      <QBlock n={8} label="When do you want to run your Takeover?" required>
        <div className="grid grid-cols-1 gap-2">
          {periods.map(p => (
            <button key={p.label} type="button" onClick={() => update('whenPeriod', p.label)}
              className={cn(
                "rounded-xl border-2 py-3 px-4 text-sm font-semibold transition-all",
                fd.whenPeriod === p.label ? "border-orange-500 bg-orange-500/10 text-orange-600" : "border-border hover:border-orange-500/50 text-foreground"
              )}>
              {p.label}
            </button>
          ))}
        </div>
      </QBlock>
    )},
    { id: 'where', valid: () => fd.whereCountry.length > 0, render: () => (
      <QBlock n={9} label="Where do you want to run your Takeover?" required>
        <div className="grid grid-cols-1 gap-2">
          {COUNTRIES.map(c => (
            <button key={c} type="button" onClick={() => update('whereCountry', c)}
              className={cn(
                "rounded-xl border-2 py-3 px-4 text-sm font-semibold transition-all",
                fd.whereCountry === c ? "border-orange-500 bg-orange-500/10 text-orange-600" : "border-border hover:border-orange-500/50 text-foreground"
              )}>
              {c}
            </button>
          ))}
        </div>
      </QBlock>
    )},
  ];

  const current = steps[step];
  const total = steps.length;
  const progress = ((step + 1) / total) * 100;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let screenshot_url: string | null = null;
      if (fd.screenshotFile) {
        const ext = fd.screenshotFile.name.split('.').pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('takeover-screenshots').upload(path, fd.screenshotFile);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('takeover-screenshots').getPublicUrl(path);
        screenshot_url = data.publicUrl;
      }
      const { error } = await supabase.from('takeover_applicants').insert([{
        full_name: fd.fullName,
        email: fd.email,
        instagram: fd.instagram,
        tiktok: fd.tiktok,
        other_socials: fd.otherSocials || null,
        sold_before: fd.soldBefore,
        screenshot_url,
        when_period: fd.whenPeriod,
        where_country: fd.whereCountry,
      }]);
      if (error) throw error;
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 max-w-md w-full">
          <img src={madMonkeyLogo} alt="Mad Monkey" className="h-14 mx-auto" />
          <CheckCircle2 className="h-16 w-16 text-orange-500 mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Takeover Application Submitted! 🎉</h2>
          <p className="text-muted-foreground">Thanks <span className="font-semibold text-foreground">{fd.fullName}</span>! We'll be in touch.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <img src={madMonkeyLogo} alt="Mad Monkey" className="h-8" />
        <span className="text-xs font-semibold text-orange-500">Creator Takeover</span>
      </div>
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">Step {step + 1} of {total}</span>
          <span className="text-[11px] text-muted-foreground font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 [&>div]:bg-orange-500" />
      </div>
      <div className="flex-1 flex flex-col justify-center px-4 py-6 max-w-md mx-auto w-full">
        <StepWrapper stepKey={current.id}>{current.render()}</StepWrapper>
      </div>
      <div className="px-4 pb-8 md:pb-4 pt-2 max-w-md mx-auto w-full">
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 rounded-full h-11">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          {step === total - 1 ? (
            <Button onClick={handleSubmit} disabled={loading || !current.valid()}
              className="flex-1 rounded-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold">
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          ) : (
            <Button onClick={() => current.valid() && setStep(s => s + 1)} disabled={!current.valid()}
              className="flex-1 rounded-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold">
              Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
