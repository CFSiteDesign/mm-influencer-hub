import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, FileText, ArrowRight, ArrowLeft, ChevronDown, Search, X } from 'lucide-react';
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
import { openBreakout } from '@/lib/iframe-utils';

const MAD_MONKEY_LOCATIONS = [
  { group: 'Cambodia', locations: ['Koh Sdach', 'Koh Rong', 'Phnom Penh', 'Siem Reap'] },
  { group: 'Indonesia', locations: ['Gili Trawangan', 'Kuta Lombok', 'Nusa Lembongan', 'Uluwatu'] },
  { group: 'Laos', locations: ['Luang Prabang', 'Vang Vieng'] },
  { group: 'Philippines', locations: ['Dumaguete', 'Nacpan Beach', 'Manila', 'Panglao', 'Siargao', 'Siquijor'] },
  { group: 'Thailand', locations: ['Bangkok', 'Chiang Mai', 'Pai', 'Phuket'] },
  { group: 'Vietnam', locations: ['Ha Giang', 'Hanoi', 'Hoi An'] },
];
const COUNTRY_CODES = [
  { code: '+1', flag: '🇺🇸', name: 'United States' },
  { code: '+1', flag: '🇨🇦', name: 'Canada' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+64', flag: '🇳🇿', name: 'New Zealand' },
  { code: '+353', flag: '🇮🇪', name: 'Ireland' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: '+39', flag: '🇮🇹', name: 'Italy' },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+46', flag: '🇸🇪', name: 'Sweden' },
  { code: '+47', flag: '🇳🇴', name: 'Norway' },
  { code: '+45', flag: '🇩🇰', name: 'Denmark' },
  { code: '+358', flag: '🇫🇮', name: 'Finland' },
  { code: '+41', flag: '🇨🇭', name: 'Switzerland' },
  { code: '+43', flag: '🇦🇹', name: 'Austria' },
  { code: '+32', flag: '🇧🇪', name: 'Belgium' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+48', flag: '🇵🇱', name: 'Poland' },
  { code: '+420', flag: '🇨🇿', name: 'Czech Republic' },
  { code: '+36', flag: '🇭🇺', name: 'Hungary' },
  { code: '+30', flag: '🇬🇷', name: 'Greece' },
  { code: '+90', flag: '🇹🇷', name: 'Turkey' },
  { code: '+7', flag: '🇷🇺', name: 'Russia' },
  { code: '+380', flag: '🇺🇦', name: 'Ukraine' },
  { code: '+972', flag: '🇮🇱', name: 'Israel' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea' },
  { code: '+66', flag: '🇹🇭', name: 'Thailand' },
  { code: '+84', flag: '🇻🇳', name: 'Vietnam' },
  { code: '+62', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+63', flag: '🇵🇭', name: 'Philippines' },
  { code: '+855', flag: '🇰🇭', name: 'Cambodia' },
  { code: '+856', flag: '🇱🇦', name: 'Laos' },
  { code: '+95', flag: '🇲🇲', name: 'Myanmar' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil' },
  { code: '+52', flag: '🇲🇽', name: 'Mexico' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: '+51', flag: '🇵🇪', name: 'Peru' },
];

function CountryCodeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = COUNTRY_CODES.find((c) => c.code === value && c.name);
  const filtered = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search)
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 h-12 px-3 rounded-l-xl border border-r-0 border-input bg-muted/50 hover:bg-muted transition-colors text-sm min-w-[90px]"
      >
        <span className="text-lg">{selected?.flag || '🌐'}</span>
        <span className="font-medium text-foreground">{value}</span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((c, i) => (
              <button
                key={`${c.code}-${c.name}-${i}`}
                type="button"
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                  setSearch('');
                }}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left",
                  c.code === value && "bg-accent/50"
                )}
              >
                <span className="text-lg">{c.flag}</span>
                <span className="flex-1 text-foreground">{c.name}</span>
                <span className="text-muted-foreground text-xs">{c.code}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-3">No results</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface FormData {
  email: string;
  fullName: string;
  countryCode: string;
  whatsapp: string;
  creatorType: string;
  creatorTypeOther: string;
  cityCountry: string;
  instagramLink: string;
  instagramFollowers: string;
  tiktokLink: string;
  tiktokFollowers: string;
  visitingHostel: string;
  plannedHostels: string[];
  arrivalDate: Date | undefined;
}

const CREATOR_TYPES = ['Content Creator', 'Photographer', 'Videographer', 'DJ', 'Other'];

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
  const [pdfViewer, setPdfViewer] = useState<{ url: string; title: string } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    fullName: '',
    countryCode: '+61',
    whatsapp: '',
    creatorType: '',
    creatorTypeOther: '',
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
          whatsapp_number: `${formData.countryCode} ${formData.whatsapp}`,
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
          whatsapp: `${formData.countryCode} ${formData.whatsapp}`,
          cityCountry: formData.cityCountry,
          instagramLink: formData.instagramLink,
          instagramFollowers: formData.instagramFollowers,
          tiktokLink: formData.tiktokLink || null,
          tiktokFollowers: formData.tiktokFollowers,
          visitingHostel: formData.visitingHostel === 'yes',
          plannedHostels: formData.plannedHostels.length > 0 ? formData.plannedHostels : null,
          arrivalDate: formData.arrivalDate ? format(formData.arrivalDate, 'PPP') : null,
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
            openPdf: (url, title) => setPdfViewer({ url, title }),
          })}
        </StepWrapper>
      </div>

      {/* Navigation */}
      <div className="px-4 pb-8 md:pb-4 pt-2 max-w-md mx-auto w-full">
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

      {/* In-app PDF viewer */}
      <AnimatePresence>
        {pdfViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground truncate pr-2">{pdfViewer.title}</span>
              <button
                type="button"
                onClick={() => setPdfViewer(null)}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-foreground" />
              </button>
            </div>
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfViewer.url)}&embedded=true`}
              title={pdfViewer.title}
              className="flex-1 w-full border-0"
            />
          </motion.div>
        )}
      </AnimatePresence>
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
    openPdf: (url: string, title: string) => void;
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
          <div className="flex">
            <CountryCodeSelect
              value={fd.countryCode}
              onChange={(code) => update('countryCode', code)}
            />
            <Input
              type="tel"
              autoFocus
              placeholder="412 345 678"
              className="h-12 text-base rounded-r-xl rounded-l-none flex-1"
              value={fd.whatsapp}
              onChange={(e) => update('whatsapp', e.target.value)}
            />
          </div>
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
    render: ({ agreed, setAgreed, openPdf }) => (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Almost there! 🎉</h2>
        <p className="text-sm text-muted-foreground">Please review and agree to our terms before submitting.</p>
        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                openPdf('https://mm-influencer-hub.lovable.app/docs/creator-hub-commission-agreement.pdf', 'Commission Agreement');
              }}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              <FileText className="h-4 w-4" />
              Agreement
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                openPdf('https://mm-influencer-hub.lovable.app/docs/creator-hub-first-touch-point.pdf', 'Standards + Deliverables');
              }}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              <FileText className="h-4 w-4" />
              Standards + Deliverables
            </button>
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
