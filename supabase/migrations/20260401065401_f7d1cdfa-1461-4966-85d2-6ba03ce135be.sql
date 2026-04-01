ALTER TABLE public.creator_codes ADD COLUMN IF NOT EXISTS social_handle text;
ALTER TABLE public.creator_codes ADD COLUMN IF NOT EXISTS creator_id text;