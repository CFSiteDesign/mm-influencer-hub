-- Creatorhub Updates brief (Cai, Nov 2026): three changes.

-- 1. Google review button in the post-stay (check-out day) email.
--    One review link per hostel, editable on the Properties page. Seeded from
--    the "Google Review Links" tab of the WhatsApp/Socials/Mother of all QRs
--    links sheet (12 Nov 2026). Only fills hostels that have no link yet.
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS google_review_url text;

UPDATE public.properties p
SET google_review_url = v.url
FROM (VALUES
  ('Koh Sdach',      'https://search.google.com/local/writereview?placeid=ChIJhapLPH-xBzER8g6bAQCtXEM'),
  ('Koh Rong',       'https://search.google.com/local/writereview?placeid=ChIJB0QNm67BBzERm4sKJqAhYTY'),
  ('Phnom Penh',     'https://search.google.com/local/writereview?placeid=ChIJxaaRaiVRCTERDEK0DQwG4tk'),
  ('Kampot',         'https://search.google.com/local/writereview?placeid=ChIJa5ziw_I3CDERvBSor2I3OSQ'),
  ('Siem Reap',      'https://search.google.com/local/writereview?placeid=ChIJq7w0rW8XEDERAsTo81bxhmc'),
  ('Gili Trawangan', 'https://search.google.com/local/writereview?placeid=ChIJE6V6GN_hzS0RD3hNw4Jt2oE'),
  ('Kuta Lombok',    'https://search.google.com/local/writereview?placeid=ChIJpz-Q0LGpzS0REPQJKki5HqY'),
  ('Nusa Lembongan', 'https://search.google.com/local/writereview?placeid=ChIJjXoh3SRt0i0RcyFBNK354lg'),
  ('Uluwatu',        'https://search.google.com/local/writereview?placeid=ChIJc2OuO9ZF0i0RfhSEnIb8TR8'),
  ('Luang Prabang',  'https://search.google.com/local/writereview?placeid=ChIJ_xKhsr4rLzERJXAEmw3CS9U'),
  ('Vang Vieng',     'https://search.google.com/local/writereview?placeid=ChIJDb07TBOTJTERfAqTm2KbaT0'),
  ('Dumaguete',      'https://search.google.com/local/writereview?placeid=ChIJJU16XcFvqzMRiU_3f0I3R7c'),
  ('Nacpan Beach',   'https://search.google.com/local/writereview?placeid=ChIJ65zRRn0HtzMRhLto_n5eCiI'),
  ('Manila',         'https://search.google.com/local/writereview?placeid=ChIJn4TGI4fJlzMRPEJ4GW_GWOc'),
  ('Panglao',        'https://search.google.com/local/writereview?placeid=ChIJQ1gM77-tqzMRUy2WTo3UUeM'),
  ('Siargao',        'https://search.google.com/local/writereview?placeid=ChIJY6KU1y0JBDMRQVqscCdtbqo'),
  ('Siquijor',       'https://search.google.com/local/writereview?placeid=ChIJK_a4w2M9qzMRoh_dzDzidHA'),
  ('Bangkok',        'https://search.google.com/local/writereview?placeid=ChIJ5Srg2RSZ4jARICTop3S7fb0'),
  ('Chiang Mai',     'https://search.google.com/local/writereview?placeid=ChIJ_-6rkYgx2jARCVdjnw0lIZA'),
  ('Pai',            'https://search.google.com/local/writereview?placeid=ChIJ-wvL1jaA2jARvhwnvaR4Wpk'),
  ('Phuket',         'https://search.google.com/local/writereview?placeid=ChIJwyevfn87UDARAxA1MZuHo_Q'),
  ('Hanoi',          'https://search.google.com/local/writereview?placeid=ChIJ7Wv7gqCrNTERV0aUMHe7tsk'),
  ('Hoi An',         'https://search.google.com/local/writereview?placeid=ChIJM8U2l0sNQjERy97C2T46naA'),
  ('Ha Giang',       'https://search.google.com/local/writereview?placeid=ChIJf3-9N9yrNTERM1JGhnihpeQ')
) AS v(location, url)
WHERE p.location = v.location AND p.google_review_url IS NULL;

-- 2. Perks chosen by marketing when approving a booking.
--    fnb_perk is required at approval from now on (enforced in the dashboard,
--    not here, so older bookings stay valid): 'half_off' = 50% off food and
--    beverage, 'fixed' = a fixed amount typed by marketing (fnb_amount, free
--    text so it can carry its currency, e.g. "$20" or "500 THB").
--    activity_perk is optional: one activity the hostel runs, picked from the
--    Experience Dashboard (activity_product_id is that product's id there).
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS fnb_perk text,
  ADD COLUMN IF NOT EXISTS fnb_amount text,
  ADD COLUMN IF NOT EXISTS activity_perk text,
  ADD COLUMN IF NOT EXISTS activity_product_id uuid;

DO $$ BEGIN
  ALTER TABLE public.bookings ADD CONSTRAINT bookings_fnb_perk_check
    CHECK (fnb_perk IS NULL OR fnb_perk IN ('half_off', 'fixed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. "{CODE} has gone quiet" check-in for codes with no revenue in 3 months.
--    Revenue comes from the Revenue Hub (code-activity), which only knows
--    month NAMES, not years. Each run keeps its own dated copy here so a
--    window that crosses New Year still reads the right year.
CREATE TABLE IF NOT EXISTS public.code_revenue_snapshots (
  code text NOT NULL,              -- lower-case creator code
  period text NOT NULL,            -- 'YYYY-MM'
  revenue numeric NOT NULL DEFAULT 0,
  bookings integer NOT NULL DEFAULT 0,
  captured_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (code, period)
);

-- One row per check-in email sent. A code is not emailed again for 90 days.
CREATE TABLE IF NOT EXISTS public.code_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  applicant_id uuid,
  creator_name text,
  creator_email text NOT NULL,
  window_start text NOT NULL,      -- 'YYYY-MM', first month checked
  window_end text NOT NULL,        -- 'YYYY-MM', last month checked
  trigger text NOT NULL DEFAULT 'manual',  -- 'manual' (dashboard) or 'auto' (monthly job)
  status text NOT NULL DEFAULT 'sent',     -- 'sent' or 'failed'
  error text,
  sent_by text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS code_checkins_code_idx ON public.code_checkins (lower(code), sent_at DESC);

ALTER TABLE public.code_revenue_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_checkins ENABLE ROW LEVEL SECURITY;
-- The dashboard only reads these; the edge function writes with the service role.
DROP POLICY IF EXISTS "Authenticated can read code revenue snapshots" ON public.code_revenue_snapshots;
CREATE POLICY "Authenticated can read code revenue snapshots"
  ON public.code_revenue_snapshots FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can read code checkins" ON public.code_checkins;
CREATE POLICY "Authenticated can read code checkins"
  ON public.code_checkins FOR SELECT TO authenticated USING (true);

-- Monthly automatic sending starts OFF. Marketing previews the list and sends
-- the first batch by hand from the Codes page, then switches this on there.
INSERT INTO public.app_settings (key, value)
VALUES ('quiet_code_checkins', '{"auto": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Daily at 02:00 UTC (09:00 Bangkok): keeps the dated revenue copy current,
-- and on the 3rd of the month sends the check-ins if auto sending is on.
-- Same shared-secret pattern as creator-stay-reminders (Vault CRON_SECRET).
SELECT cron.schedule(
  'creator-quiet-code-checkins',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ravecomtupiyurjezwji.supabase.co/functions/v1/send-quiet-code-checkins',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', public.get_cron_secret()),
    body := '{}'::jsonb
  );
  $$
);
