
-- Create applicants table
CREATE TABLE public.applicants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  whatsapp_number TEXT NOT NULL,
  dates_requested TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  creator_code TEXT,
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create creator_codes table
CREATE TABLE public.creator_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  applicant_id UUID REFERENCES public.applicants(id) ON DELETE CASCADE,
  method TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create status_log table
CREATE TABLE public.status_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id UUID REFERENCES public.applicants(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT,
  note TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_log ENABLE ROW LEVEL SECURITY;

-- Applicants: anyone can insert (public application form)
CREATE POLICY "Anyone can submit application" ON public.applicants FOR INSERT WITH CHECK (true);

-- Applicants: only authenticated users can read
CREATE POLICY "Authenticated users can read applicants" ON public.applicants FOR SELECT TO authenticated USING (true);

-- Applicants: only authenticated users can update
CREATE POLICY "Authenticated users can update applicants" ON public.applicants FOR UPDATE TO authenticated USING (true);

-- Creator codes: authenticated can do everything
CREATE POLICY "Authenticated users can read creator_codes" ON public.creator_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert creator_codes" ON public.creator_codes FOR INSERT TO authenticated WITH CHECK (true);

-- Status log: authenticated can read and insert
CREATE POLICY "Authenticated users can read status_log" ON public.status_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert status_log" ON public.status_log FOR INSERT TO authenticated WITH CHECK (true);
