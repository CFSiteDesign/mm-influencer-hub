import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import madMonkeyLogo from '@/assets/mad-monkey-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { TropicalDecorations } from '@/components/TropicalDecorations';
import { motion } from 'framer-motion';

export default function ApplyPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    whatsapp: '',
    primarySocial: '',
    secondarySocial: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      setSubmitted(true);
    } catch (error: any) {
      toast.error(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-muted p-4 overflow-hidden">
        <TropicalDecorations />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 text-center space-y-6"
        >
          <img src={madMonkeyLogo} alt="Mad Monkey" className="h-16 md:h-20 mx-auto" />
          <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
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
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-muted p-4 overflow-hidden">
      {/* Full-page decorations */}
      <TropicalDecorations />

      {/* Page header */}
      <div className="relative z-10 text-center mb-6">
        <img src={madMonkeyLogo} alt="Mad Monkey" className="h-16 md:h-20 mx-auto mb-2" />
        <p className="text-lg md:text-xl font-medium text-primary mt-1">Influencer Hub</p>
      </div>

      <Card className="relative z-10 w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-xl font-bold tracking-tight">Apply Now</CardTitle>
          <CardDescription>
            Join our influencer program and get your exclusive creator discount code.
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}