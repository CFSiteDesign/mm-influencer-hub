
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS instagram_followers text,
  ADD COLUMN IF NOT EXISTS tiktok_link text,
  ADD COLUMN IF NOT EXISTS tiktok_followers text,
  ADD COLUMN IF NOT EXISTS city_country text,
  ADD COLUMN IF NOT EXISTS visiting_hostel boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS planned_hostels text[],
  ADD COLUMN IF NOT EXISTS arrival_date date;
