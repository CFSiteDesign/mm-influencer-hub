ALTER TABLE public.applicants ADD COLUMN primary_social_link text NOT NULL DEFAULT '';
ALTER TABLE public.applicants ADD COLUMN secondary_social_link text;