import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TakeoverApplyPage from './TakeoverApplyPage';
import ApplyTestPage from './ApplyTestPage';

export default function ApplyGate() {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'applications_open')
      .maybeSingle()
      .then(({ data }) => setOpen(Boolean((data?.value as any)?.open)));
  }, []);

  if (open === null) {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>;
  }

  return open ? <ApplyTestPage /> : <TakeoverApplyPage />;
}
