-- Phase 2 (B1): follower counts are now auto-fetched from Instagram/TikTok
-- via Apify (fetch-creator-followers edge function) instead of typed by the
-- creator at application. Track when and how the last fetch went.
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS followers_fetched_at timestamptz;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS followers_fetch_status text;
