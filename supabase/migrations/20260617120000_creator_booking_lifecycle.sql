-- Phase 1 — Creator booking lifecycle
-- Adds: per-creator magic-link token, canonical properties (+ GM routing),
-- and a bookings table that becomes the creator's booking log.

-- 1. Magic-link token on each applicant -------------------------------------
-- Every applicant gets an unguessable token. The welcome email's
-- "Submit your stay dates HERE" link points to /book/<booking_token>.
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS booking_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS applicants_booking_token_key
  ON public.applicants (booking_token);

-- 2. Properties — source of truth for the destination dropdown + GM routing --
-- AUS is already excluded (no Australian properties are listed). GM emails
-- are nullable and will be populated later; the confirmation email simply
-- skips the GM CC until an address is present.
CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  location text NOT NULL UNIQUE,
  region text,
  gm_name text,
  gm_email text,
  is_active boolean NOT NULL DEFAULT true,
  excluded_from_booking boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. the un-authenticated creator on the booking page) can read the
-- destination list; only authenticated admins can change it.
CREATE POLICY "Public can read properties"
  ON public.properties FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated can insert properties"
  ON public.properties FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update properties"
  ON public.properties FOR UPDATE TO authenticated USING (true);

-- Seed the canonical 24 properties (mirrors MAD_MONKEY_LOCATIONS in the app).
INSERT INTO public.properties (country, location, sort_order) VALUES
  ('Cambodia',    'Koh Sdach',       10),
  ('Cambodia',    'Koh Rong',        11),
  ('Cambodia',    'Phnom Penh',      12),
  ('Cambodia',    'Siem Reap',       13),
  ('Indonesia',   'Gili Trawangan',  20),
  ('Indonesia',   'Kuta Lombok',     21),
  ('Indonesia',   'Nusa Lembongan',  22),
  ('Indonesia',   'Uluwatu',         23),
  ('Laos',        'Luang Prabang',   30),
  ('Laos',        'Vang Vieng',      31),
  ('Philippines', 'Dumaguete',       40),
  ('Philippines', 'Nacpan Beach',    41),
  ('Philippines', 'Manila',          42),
  ('Philippines', 'Panglao',         43),
  ('Philippines', 'Siargao',         44),
  ('Philippines', 'Siquijor',        45),
  ('Thailand',    'Bangkok',         50),
  ('Thailand',    'Chiang Mai',      51),
  ('Thailand',    'Pai',             52),
  ('Thailand',    'Phuket',          53),
  ('Vietnam',     'Ha Giang',        60),
  ('Vietnam',     'Hanoi',           61),
  ('Vietnam',     'Hoi An',          62)
ON CONFLICT (location) DO NOTHING;

-- 3. Bookings — one row per stay request; the creator's booking log ----------
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  creator_id text,
  creator_name text,
  creator_email text,
  property text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  nights int NOT NULL,
  other_requests text,
  -- new | amended  (drives the dashboard flag / urgency)
  type text NOT NULL DEFAULT 'new',
  -- submitted -> approved -> confirmed | declined
  status text NOT NULL DEFAULT 'submitted',
  reference_code text,          -- Cloudbeds ref, entered by Customer Services
  gm_email text,                -- resolved from properties at confirmation time
  review_note text,             -- admin's reply message back to the creator
  parent_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  cs_notified_at timestamptz,
  confirmed_at timestamptz,
  CONSTRAINT bookings_nights_max5 CHECK (nights BETWEEN 1 AND 5),
  CONSTRAINT bookings_dates_order CHECK (check_out > check_in)
);

CREATE INDEX IF NOT EXISTS bookings_applicant_id_idx ON public.bookings (applicant_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings (status);
CREATE INDEX IF NOT EXISTS bookings_property_idx ON public.bookings (property);
CREATE INDEX IF NOT EXISTS bookings_check_in_idx ON public.bookings (check_in);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Writes from the un-authenticated creator go through the submit-booking edge
-- function (service role, bypasses RLS). Admins read/manage via the dashboard.
CREATE POLICY "Authenticated can read bookings"
  ON public.bookings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert bookings"
  ON public.bookings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update bookings"
  ON public.bookings FOR UPDATE TO authenticated USING (true);
