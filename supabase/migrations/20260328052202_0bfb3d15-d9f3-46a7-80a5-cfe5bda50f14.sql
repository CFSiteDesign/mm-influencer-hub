
-- Add creator_id column
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS creator_id text;

-- Create a sequence for creator IDs
CREATE SEQUENCE IF NOT EXISTS creator_id_seq START WITH 1;

-- Create function to generate next creator ID
CREATE OR REPLACE FUNCTION public.next_creator_id()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'CH' || LPAD(nextval('creator_id_seq')::text, 3, '0');
$$;
