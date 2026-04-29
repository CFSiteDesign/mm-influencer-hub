
-- 1. Track when an applicant is approved
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Backfill: anything already past 'pending' that we consider approved
UPDATE public.applicants
SET approved_at = COALESCE(approved_at, submitted_at)
WHERE status IN ('approved', 'code_generated', 'done')
  AND approved_at IS NULL;

-- 2. Public read-only view for the Staff Discount App
CREATE OR REPLACE VIEW public.approved_creators_for_discount
WITH (security_invoker = true)
AS
SELECT
  email,
  full_name,
  creator_id,
  approved_at,
  'approved'::text AS status
FROM public.applicants
WHERE status IN ('approved', 'code_generated', 'done')
  AND email IS NOT NULL;

-- Allow anonymous + authenticated reads of the view
GRANT SELECT ON public.approved_creators_for_discount TO anon, authenticated;

-- The view is security_invoker, so callers also need SELECT on the base
-- table for the rows the view exposes. Add a permissive RLS policy that
-- only exposes approved rows to anon.
DROP POLICY IF EXISTS "Anon can read approved applicants for discount view"
  ON public.applicants;
CREATE POLICY "Anon can read approved applicants for discount view"
ON public.applicants
FOR SELECT
TO anon
USING (status IN ('approved', 'code_generated', 'done'));

-- 3. Trigger: set approved_at + notify edge function on approval
CREATE OR REPLACE FUNCTION public.handle_applicant_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_url text := 'https://ravecomtupiyurjezwji.supabase.co';
  service_key text;
BEGIN
  -- Stamp approved_at the first time we see an approved status
  IF NEW.status IN ('approved', 'code_generated', 'done')
     AND NEW.approved_at IS NULL THEN
    NEW.approved_at := now();
  END IF;

  -- Only fire the webhook when transitioning INTO 'approved'
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'approved'
     AND COALESCE(OLD.status, '') <> 'approved' THEN

    PERFORM net.http_post(
      url := project_url || '/functions/v1/notify-discount-app',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'email', NEW.email,
        'full_name', NEW.full_name,
        'creator_id', NEW.creator_id,
        'approved_at', NEW.approved_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_applicants_approved ON public.applicants;
CREATE TRIGGER trg_applicants_approved
BEFORE UPDATE ON public.applicants
FOR EACH ROW
EXECUTE FUNCTION public.handle_applicant_approved();

-- Make sure pg_net is available for outbound HTTP from the trigger
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
