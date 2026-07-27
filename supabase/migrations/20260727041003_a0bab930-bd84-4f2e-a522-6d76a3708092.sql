ALTER TABLE public.creator_codes ADD COLUMN allin_eligible boolean NOT NULL DEFAULT false;
UPDATE public.creator_codes SET allin_eligible = true;