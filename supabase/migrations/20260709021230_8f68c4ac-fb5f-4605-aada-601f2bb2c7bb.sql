ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS followers_fetched_at timestamptz;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS followers_fetch_status text;