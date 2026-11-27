-- Creatorhub Booking Confirmation Updates (27 Nov 2026): every booking
-- confirmation is BCC'd to the regional finance team for the hostel's
-- country (Thailand, Indonesia, Laos, Philippines, Cambodia, Vietnam).
--
-- The source is the Finance tab of the "Regional / Global Master List",
-- updated monthly. Admins edit it on the GM Emails page. Staff addresses are
-- not in this file (the repository is public): the rows are added directly.
-- Not readable by the public, unlike app_settings and properties.

CREATE TABLE IF NOT EXISTS public.finance_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  full_name text,
  email text NOT NULL,
  job_title text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS finance_contacts_country_email_key
  ON public.finance_contacts (country, lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_contacts TO authenticated;
GRANT ALL ON public.finance_contacts TO service_role;

ALTER TABLE public.finance_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read finance contacts" ON public.finance_contacts;
CREATE POLICY "Admins can read finance contacts"
  ON public.finance_contacts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can add finance contacts" ON public.finance_contacts;
CREATE POLICY "Admins can add finance contacts"
  ON public.finance_contacts FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can change finance contacts" ON public.finance_contacts;
CREATE POLICY "Admins can change finance contacts"
  ON public.finance_contacts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can remove finance contacts" ON public.finance_contacts;
CREATE POLICY "Admins can remove finance contacts"
  ON public.finance_contacts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
