-- Create table for Creator Takeover applications
CREATE TABLE public.takeover_applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  instagram text,
  tiktok text,
  other_socials text,
  sold_before text,
  screenshot_url text,
  when_period text NOT NULL,
  where_country text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.takeover_applicants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit takeover application"
ON public.takeover_applicants FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Authenticated users can read takeover applicants"
ON public.takeover_applicants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update takeover applicants"
ON public.takeover_applicants FOR UPDATE TO authenticated USING (true);

-- Storage bucket for takeover screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('takeover-screenshots', 'takeover-screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view takeover screenshots"
ON storage.objects FOR SELECT TO public USING (bucket_id = 'takeover-screenshots');

CREATE POLICY "Anyone can upload takeover screenshots"
ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'takeover-screenshots');
