import React, { useState } from 'react';
import { CheckCircle2, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import madMonkeyLogo from '@/assets/mad-monkey-logo.png';
import greenPattern from '@/assets/green-pattern.jpg';
import heartBadge from '@/assets/heart-badge.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ApplyPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    whatsapp: '',
    primarySocial: '',
    secondarySocial: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreed) {
      toast.error('You must agree to the Creator Agreement and Standards & Expectations before submitting.');
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
        toast.error('This email has already been submitted. If you need to update your details, please contact us.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('applicants').insert([
        {
          full_name: formData.fullName,
          email: formData.email,
          whatsapp_number: formData.whatsapp,
          primary_social_link: formData.primarySocial,
          secondary_social_link: formData.secondarySocial || null,
        },
      ]);

      if (error) throw error;

      // Send submission notification email (fire-and-forget)
      supabase.functions.invoke('send-submission-email', {
        body: {
          fullName: formData.fullName,
          email: formData.email,
          whatsapp: formData.whatsapp,
          primarySocial: formData.primarySocial,
          secondarySocial: formData.secondarySocial || null,
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6"
        >
          <img src={madMonkeyLogo} alt="Mad Monkey" className="h-16 md:h-20 mx-auto" />
          <Card className="w-full max-w-md shadow-xl border-none">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
              </motion.div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Application Submitted! 🎉</h2>
              <p className="text-muted-foreground">
                Thanks for applying, <span className="font-semibold text-foreground">{formData.fullName}</span>! We'll review your application and be in touch soon.
              </p>
              <p className="text-sm text-muted-foreground">
                Keep an eye on your email for updates.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSubmitted(false);
                  setAgreed(false);
                  setFormData({ fullName: '', email: '', whatsapp: '', primarySocial: '', secondarySocial: '' });
                }}
              >
                Submit Another Application
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-8">
      {/* Page header */}
      <div className="text-center mb-6">
        <img src={madMonkeyLogo} alt="Mad Monkey" className="h-14 md:h-20 mx-auto mb-2" />
        <p className="text-lg md:text-xl font-bold text-primary mt-1">Creator Hub</p>
      </div>

      {/* Green pattern border wrapping the form card */}
      <div className="relative w-full max-w-md mx-auto">
        {/* Badge icons in corners */}
        <img src={heartBadge} alt="" className="absolute -top-4 -left-3 w-10 h-10 md:w-16 md:h-16 md:-top-5 md:-left-5 z-10" />
        <img src={lightningBadge} alt="" className="absolute -bottom-4 -right-3 w-10 h-10 md:w-16 md:h-16 md:-bottom-5 md:-right-5 z-10" />

        <div
          className="rounded-2xl p-4 md:p-8 shadow-2xl"
          style={{
            backgroundImage: `url(${greenPattern})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <Card className="w-full border-none shadow-none rounded-xl">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">Apply Now</CardTitle>
              <CardDescription>
                Join our creator program and get your exclusive discount code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    required
                    placeholder="Jane Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="jane@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    required
                    placeholder="+61 412 345 678"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primarySocial">Instagram or TikTok Link <span className="text-destructive">*</span></Label>
                  <Input
                    id="primarySocial"
                    required
                    placeholder="https://instagram.com/yourhandle"
                    value={formData.primarySocial}
                    onChange={(e) => setFormData({ ...formData, primarySocial: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondarySocial">Instagram or TikTok Link <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    id="secondarySocial"
                    placeholder="https://tiktok.com/@yourhandle"
                    value={formData.secondarySocial}
                    onChange={(e) => setFormData({ ...formData, secondarySocial: e.target.value })}
                  />
                </div>

                {/* Agreement section */}
                <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
                  <p className="text-sm font-medium text-foreground">Please review the following documents:</p>
                  <div className="flex flex-col gap-2">
                    <a
                      href="/docs/creator-hub-commission-agreement.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      Creator Agreement
                    </a>
                    <a
                      href="/docs/creator-hub-first-touch-point.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      Standards & Expectations
                    </a>
                  </div>
                  <div className="flex items-start gap-2 pt-1">
                    <Checkbox
                      id="agreement"
                      checked={agreed}
                      onCheckedChange={(checked) => setAgreed(checked === true)}
                    />
                    <Label htmlFor="agreement" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                      I have read and agree to the Creator Agreement and the Standards & Expectations.
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full"
                  disabled={loading || !agreed}
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
