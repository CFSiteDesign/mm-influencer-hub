DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) IN ('admin@admin.com','admin.codes@madmonkeyhostels.com')
ON CONFLICT DO NOTHING;

-- bookings
DROP POLICY IF EXISTS "Authenticated can read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated can insert bookings" ON public.bookings;
CREATE POLICY "Admins can read bookings" ON public.bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can insert bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- inbound_emails
DROP POLICY IF EXISTS "Authenticated users can read inbound_emails" ON public.inbound_emails;
CREATE POLICY "Admins can read inbound_emails" ON public.inbound_emails FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- status_log
DROP POLICY IF EXISTS "Authenticated users can read status_log" ON public.status_log;
DROP POLICY IF EXISTS "Authenticated users can insert status_log" ON public.status_log;
CREATE POLICY "Admins can read status_log" ON public.status_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can insert status_log" ON public.status_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- applicants
DROP POLICY IF EXISTS "Authenticated users can read applicants" ON public.applicants;
DROP POLICY IF EXISTS "Authenticated users can update applicants" ON public.applicants;
CREATE POLICY "Admins can read applicants" ON public.applicants FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update applicants" ON public.applicants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- email_send_log
DROP POLICY IF EXISTS "Authenticated users can read email_send_log" ON public.email_send_log;
CREATE POLICY "Admins can read email_send_log" ON public.email_send_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- takeover_applicants
DROP POLICY IF EXISTS "Authenticated users can read takeover applicants" ON public.takeover_applicants;
DROP POLICY IF EXISTS "Authenticated users can update takeover applicants" ON public.takeover_applicants;
CREATE POLICY "Admins can read takeover applicants" ON public.takeover_applicants FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update takeover applicants" ON public.takeover_applicants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- creator_codes
DROP POLICY IF EXISTS "Authenticated users can read creator_codes" ON public.creator_codes;
DROP POLICY IF EXISTS "Authenticated users can insert creator_codes" ON public.creator_codes;
DROP POLICY IF EXISTS "Authenticated users can update creator_codes" ON public.creator_codes;
CREATE POLICY "Admins can read creator_codes" ON public.creator_codes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can insert creator_codes" ON public.creator_codes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update creator_codes" ON public.creator_codes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- app_settings (public read kept for the apply gate)
DROP POLICY IF EXISTS "Authenticated can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated can update app settings" ON public.app_settings;
CREATE POLICY "Admins can insert app settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update app settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));