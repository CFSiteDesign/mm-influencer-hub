-- Phase 1 — Creator booking lifecycle
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS booking_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS applicants_booking_token_key
  ON public.applicants (booking_token);

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

GRANT SELECT ON public.properties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read properties"
  ON public.properties FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated can insert properties"
  ON public.properties FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update properties"
  ON public.properties FOR UPDATE TO authenticated USING (true);

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
  type text NOT NULL DEFAULT 'new',
  status text NOT NULL DEFAULT 'submitted',
  reference_code text,
  gm_email text,
  review_note text,
  parent_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  cs_notified_at timestamptz,
  confirmed_at timestamptz,
  CONSTRAINT bookings_nights_max5 CHECK (nights BETWEEN 1 AND 5),
  CONSTRAINT bookings_dates_order CHECK (check_out > check_in)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

CREATE INDEX IF NOT EXISTS bookings_applicant_id_idx ON public.bookings (applicant_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings (status);
CREATE INDEX IF NOT EXISTS bookings_property_idx ON public.bookings (property);
CREATE INDEX IF NOT EXISTS bookings_check_in_idx ON public.bookings (check_in);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read bookings"
  ON public.bookings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert bookings"
  ON public.bookings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update bookings"
  ON public.bookings FOR UPDATE TO authenticated USING (true);

-- Seed GM emails
UPDATE public.properties AS p SET
  gm_name  = v.gm_name,
  gm_email = v.gm_email
FROM (VALUES
  ('Phnom Penh',     'Adrian',           'adrian@madmonkeyhostels.com'),
  ('Siem Reap',      'Kassy',            'kassy@madmonkeyhostels.com'),
  ('Koh Rong',       'Johan',            'johan@madmonkeyhostels.com'),
  ('Koh Sdach',      'Johan',            'johan@madmonkeyhostels.com'),
  ('Gili Trawangan', 'Rade',             'rade@madmonkeyhostels.com'),
  ('Kuta Lombok',    'Kyle Waters',      'kylewalters@madmonkeyhostels.com'),
  ('Nusa Lembongan', 'Gladys',           'gladys@madmonkeyhostels.com'),
  ('Uluwatu',        'Josh Goon',        'josh@madmonkeyhostels.com'),
  ('Luang Prabang',  'Louis Partington', 'louis@madmonkeyhostels.com'),
  ('Vang Vieng',     'Tom',              'tom.william@madmonkeyhostels.com'),
  ('Dumaguete',      'Sean',             'seanpaolo@madmonkeyhostels.com'),
  ('Nacpan Beach',   'Anthony',          'anthony@madmonkeyhostels.com'),
  ('Manila',         'Dan Esposito',     'dan@madmonkeyhostels.com'),
  ('Panglao',        'Jayson',           'jayson@madmonkeyhostels.com'),
  ('Siargao',        'Alex',             'alexpinfold@madmonkeyhostels.com'),
  ('Siquijor',       NULL,               'steven@madmonkeyhostels.com'),
  ('Bangkok',        'Connor',           'connor@madmonkeyhostels.com'),
  ('Chiang Mai',     'Froggy',           'doonyathat@madmonkeyhostels.com'),
  ('Pai',            'Pin',              'rittinan@madmonkeyhostels.com'),
  ('Phuket',         'Kurt',             'kurt@madmonkeyhostels.com'),
  ('Hanoi',          'Chris Gibson',     'chris@madmonkeyhostels.com'),
  ('Hoi An',         'Nick (interim)',   'nick@madmonkeyhostels.com')
) AS v(location, gm_name, gm_email)
WHERE p.location = v.location;