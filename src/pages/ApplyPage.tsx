import React, { useState, useCallback } from 'react';
import { CheckCircle2, FileText, ArrowRight, ArrowLeft, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import madMonkeyLogo from '@/assets/mad-monkey-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const MAD_MONKEY_LOCATIONS = [
  { group: 'Cambodia', locations: ['Koh Sdach', 'Koh Rong', 'Phnom Penh', 'Siem Reap'] },
  { group: 'Indonesia', locations: ['Gili Trawangan', 'Kuta Lombok', 'Nusa Lembongan', 'Uluwatu'] },
  { group: 'Laos', locations: ['Luang Prabang', 'Vang Vieng'] },
  { group: 'Philippines', locations: ['Dumaguete', 'Nacpan Beach', 'Manila', 'Panglao', 'Siargao', 'Siquijor'] },
  { group: 'Thailand', locations: ['Bangkok', 'Chiang Mai', 'Pai', 'Phuket'] },
  { group: 'Vietnam', locations: ['Ha Giang', 'Hanoi', 'Hoi An'] },
];

interface FormData {
  email: string;
  fullName: string;
  whatsapp: string;
  cityCountry: string;
  instagramLink: string;
  instagramFollowers: string;
  tiktokLink: string;
  tiktokFollowers: string;
  visitingHostel: string;
  plannedHostels: string[];
  arrivalDate: Date | undefined;
}

const TOTAL_STEPS = 12; // max steps including conditional ones

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

export default function ApplyPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    fullName: '',
    whatsapp: '',
    cityCountry: '',
    instagramLink: '',
    instagramFollowers: '',
    tiktokLink: '',
    tiktokFollowers: '',
    visitingHostel: '',
    plannedHostels: [],
    arrivalDate: undefined,
  });

  const update = (field: keyof FormData, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const toggleHostel = (loc: string) => {
    setFormData((prev) => ({
      ...prev,
      plannedHostels: prev.plannedHostels.includes(loc)
        ? prev.plannedHostels.filter((l) => l !== loc)
        : [...prev.plannedHostels, loc],
    }));
  };

  // Build dynamic steps
  const steps = buildSteps(formData);
  const currentStep = steps[step];
  const totalSteps = steps.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const canAdvance = (): boolean => {
    if (!currentStep) return false;
    return currentStep.isValid();
  };

  const next = () => {
    if (step < totalSteps - 1 && canAdvance()) setStep(step + 1);
  };
  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentStep?.id === 'agreement') return;
      next();
    }
  };

  const handleSubmit = async () => {
    if (!agreed) {
      toast.error('Please agree to the Creator Agreement and Standards & Expectations.');
      return;
    }
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('applicants')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (existing) {
        toast.error('This email has already been submitted.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('applicants').insert([
        {
          full_name: formData.fullName,
          email: formData.email,
          whatsapp_number: formData.whatsapp,
          primary_social_link: formData.instagramLink,
          secondary_social_link: formData.tiktokLink || null,
          instagram_followers: formData.instagramFollowers,
          tiktok_link: formData.tiktokLink,
          tiktok_followers: formData.tiktokFollowers,
          city_country: formData.cityCountry,
          visiting_hostel: formData.visitingHostel === 'yes',
          planned_hostels: formData.plannedHostels.length > 0 ? formData.plannedHostels : null,
          arrival_date: formData.arrivalDate ? format(formData.arrivalDate, 'yyyy-MM-dd') : null,
        },
      ]);

      if (error) throw error;

      supabase.functions.invoke('send-submission-email', {
        body: {
          fullName: formData.fullName,
          email: formData.email,
          whatsapp: formData.whatsapp,
          primarySocial: formData.instagramLink,
          secondarySocial: formData.tiktokLink || null,
        },
      }).then(({ error }) => {
        if (error) console.error('Submission notification email failed:', error);
      });

      setSubmitted(true);
    } catch (error: any) {
      toast.error(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6 max-w-md w-full"
        >
          <img src={madMonkeyLogo} alt="Mad Monkey" className="h-14 mx-auto" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground">Application Submitted! 🎉</h2>
          <p className="text-muted-foreground">
            Thanks <span className="font-semibold text-foreground">{formData.fullName}</span>! We'll review your application and be in touch soon.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <img src={madMonkeyLogo} alt="Mad Monkey" className="h-8" />
        <span className="text-xs font-semibold text-primary">Creator Hub</span>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">
            Step {step + 1} of {totalSteps}
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Form content */}
      <div className="flex-1 flex flex-col justify-center px-4 py-6 max-w-md mx-auto w-full">
        <StepWrapper stepKey={currentStep?.id || 'unknown'}>
          {currentStep?.render({
            formData,
            update,
            toggleHostel,
            agreed,
            setAgreed,
          })}
        </StepWrapper>
      </div>

      {/* Navigation */}
      <div className="px-4 pb-4 pt-2 max-w-md mx-auto w-full">
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={prev}
              className="flex-1 rounded-full h-11"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          {currentStep?.id === 'agreement' ? (
            <Button
              onClick={handleSubmit}
              disabled={loading || !agreed}
              className="flex-1 rounded-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          ) : (
            <Button
              onClick={next}
              disabled={!canAdvance()}
              className="flex-1 rounded-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Step definitions ---

interface StepDef {
  id: string;
  isValid: () => boolean;
  render: (ctx: {
    formData: FormData;
    update: (field: keyof FormData, value: any) => void;
    toggleHostel: (loc: string) => void;
    agreed: boolean;
    setAgreed: (v: boolean) => void;
  }) => React.ReactNode;
}

function buildSteps(formData: FormData): StepDef[] {
  const steps: StepDef[] = [
    {
      id: 'email',
      isValid: () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      render: ({ formData: fd, update }) => (
        <QuestionBlock number={1} label="Email" required>
          <Input
            type="email"
            autoFocus
            placeholder="you@example.com"
            className="h-12 text-base rounded-xl"
            value={fd.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </QuestionBlock>
      ),
    },
    {
      id: 'name',
      isValid: () => formData.fullName.trim().length > 0,
      render: ({ formData: fd, update }) => (
        <QuestionBlock number={2} label="Name" required>
          <Input
            autoFocus
            placeholder="Jane Doe"
            className="h-12 text-base rounded-xl"
            value={fd.fullName}
            onChange={(e) => update('fullName', e.target.value)}
          />
        </QuestionBlock>
      ),
    },
    {
      id: 'whatsapp',
      isValid: () => formData.whatsapp.trim().length >= 6,
      render: ({ formData: fd, update }) => (
        <QuestionBlock number={3} label="WhatsApp Number" required>
          <Input
            type="tel"
            autoFocus
            placeholder="+61 412 345 678"
            className="h-12 text-base rounded-xl"
            value={fd.whatsapp}
            onChange={(e) => update('whatsapp', e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground mt-1">Include your country code (e.g. +61, +44, +1)</p>
        </QuestionBlock>
      ),
    },
    {
      id: 'location',
      isValid: () => formData.cityCountry.trim().length > 0,
      render: ({ formData: fd, update }) => (
        <QuestionBlock number={4} label="Where are you based (City / Country)?" required>
          <Input
            autoFocus
            placeholder="Sydney, Australia"
            className="h-12 text-base rounded-xl"
            value={fd.cityCountry}
            onChange={(e) => update('cityCountry', e.target.value)}
          />
        </QuestionBlock>
      ),
    },
    {
      id: 'instagram',
      isValid: () => formData.instagramLink.trim().length > 0,
      render: ({ formData: fd, update }) => (
        <QuestionBlock number={5} label="Instagram Link" required>
          <Input
            autoFocus
            placeholder="https://instagram.com/yourhandle"
            className="h-12 text-base rounded-xl"
            value={fd.instagramLink}
            onChange={(e) => update('instagramLink', e.target.value)}
          />
        </QuestionBlock>
      ),
    },
    {
      id: 'instagram_followers',
      isValid: () => formData.instagramFollowers.trim().length > 0,
      render: ({ formData: fd, update }) => (
        <QuestionBlock number={6} label="Instagram Followers" required>
          <Input
            autoFocus
            placeholder="e.g. 5,200"
            className="h-12 text-base rounded-xl"
            value={fd.instagramFollowers}
            onChange={(e) => update('instagramFollowers', e.target.value)}
          />
        </QuestionBlock>
      ),
    },
    {
      id: 'tiktok',
      isValid: () => formData.tiktokLink.trim().length > 0,
      render: ({ formData: fd, update }) => (
        <QuestionBlock number={7} label="TikTok Link" required>
          <Input
            autoFocus
            placeholder="https://tiktok.com/@yourhandle"
            className="h-12 text-base rounded-xl"
            value={fd.tiktokLink}
            onChange={(e) => update('tiktokLink', e.target.value)}
          />
        </QuestionBlock>
      ),
    },
    {
      id: 'tiktok_followers',
      isValid: () => formData.tiktokFollowers.trim().length > 0,
      render: ({ formData: fd, update }) => (
        <QuestionBlock number={8} label="TikTok Followers" required>
          <Input
            autoFocus
            placeholder="e.g. 12,000"
            className="h-12 text-base rounded-xl"
            value={fd.tiktokFollowers}
            onChange={(e) => update('tiktokFollowers', e.target.value)}
          />
        </QuestionBlock>
      ),
    },
    {
      id: 'visiting',
      isValid: () => formData.visitingHostel === 'yes' || formData.visitingHostel === 'no',
      render: ({ formData: fd, update }) => (
        <QuestionBlock number={9} label="Are you planning on heading to any of our hostels soon?" required>
          <RadioGroup
            value={fd.visitingHostel}
            onValueChange={(v) => update('visitingHostel', v)}
            className="flex gap-4 mt-2"
          >
            <label className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 px-4 cursor-pointer transition-all text-sm font-medium",
              fd.visitingHostel === 'yes' ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
            )}>
              <RadioGroupItem value="yes" className="sr-only" />
              Yes
            </label>
            <label className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 px-4 cursor-pointer transition-all text-sm font-medium",
              fd.visitingHostel === 'no' ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
            )}>
              <RadioGroupItem value="no" className="sr-only" />
              No
            </label>
          </RadioGroup>
        </QuestionBlock>
      ),
    },
  ];

  // Conditional steps if visiting = yes
  if (formData.visitingHostel === 'yes') {
    steps.push({
      id: 'which_hostels',
      isValid: () => formData.plannedHostels.length > 0,
      render: ({ formData: fd, toggleHostel }) => (
        <QuestionBlock number={10} label="Which hostel(s) are you heading to?" required>
          <div className="max-h-[40vh] overflow-y-auto space-y-3 pr-1">
            {MAD_MONKEY_LOCATIONS.map((group) => (
              <div key={group.group}>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{group.group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.locations.map((loc) => {
                    const selected = fd.plannedHostels.includes(loc);
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => toggleHostel(loc)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {loc}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </QuestionBlock>
      ),
    });

    steps.push({
      id: 'arrival_date',
      isValid: () => !!formData.arrivalDate,
      render: ({ formData: fd, update }) => (
        <QuestionBlock number={11} label="When are you planning to arrive?" required>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-12 justify-start text-left font-normal rounded-xl text-base",
                  !fd.arrivalDate && "text-muted-foreground"
                )}
              >
                {fd.arrivalDate ? format(fd.arrivalDate, 'PPP') : 'Pick a date'}
                <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fd.arrivalDate}
                onSelect={(d) => update('arrivalDate', d)}
                disabled={(date) => date < new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </QuestionBlock>
      ),
    });
  }

  // Agreement step is always last
  steps.push({
    id: 'agreement',
    isValid: () => true,
    render: ({ agreed, setAgreed }) => (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Almost there! 🎉</h2>
        <p className="text-sm text-muted-foreground">Please review and agree to our terms before submitting.</p>
        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex gap-4">
            <a
              href="/docs/creator-hub-commission-agreement.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              <FileText className="h-4 w-4" />
              Agreement
            </a>
            <a
              href="/docs/creator-hub-first-touch-point.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              <FileText className="h-4 w-4" />
              Standards
            </a>
          </div>
          <div className="flex items-start gap-2.5 pt-1">
            <Checkbox
              id="agreement"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
            />
            <Label htmlFor="agreement" className="text-xs text-muted-foreground leading-snug cursor-pointer">
              I agree to the Creator Agreement and Standards & Expectations.
            </Label>
          </div>
        </div>
      </div>
    ),
  });

  return steps;
}

function QuestionBlock({
  number,
  label,
  required,
  children,
}: {
  number: number;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <span className="text-xs font-bold text-primary">Q{number}</span>
        <h2 className="text-lg font-bold text-foreground mt-0.5">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </h2>
      </div>
      {children}
    </div>
  );
}
