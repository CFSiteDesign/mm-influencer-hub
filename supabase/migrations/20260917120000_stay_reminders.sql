-- Stay reminders: one week before a confirmed stay, the confirmation email is
-- re-sent ("REMINDER: ...") to the same people (creator, GM, location inbox),
-- but only for bookings confirmed at least 4 weeks ahead. A daily pg_cron job
-- calls the send-stay-reminders function; each booking is reminded once.
-- Pattern copied from the ALL IN departure reminders.

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS bookings_reminder_due_idx
  ON public.bookings (check_in)
  WHERE status = 'confirmed' AND reminder_sent_at IS NULL;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- The cron job and the function share a secret held in Supabase Vault
-- (name: CRON_SECRET). Neither side ever sees it in source.
CREATE OR REPLACE FUNCTION public.get_cron_secret()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1),
    ''
  )
$$;
REVOKE ALL ON FUNCTION public.get_cron_secret() FROM public;
REVOKE ALL ON FUNCTION public.get_cron_secret() FROM anon;
REVOKE ALL ON FUNCTION public.get_cron_secret() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_secret() TO service_role;

-- Daily at 01:00 UTC (08:00 Bangkok). Re-running the migration replaces the job.
SELECT cron.schedule(
  'creator-stay-reminders',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ravecomtupiyurjezwji.supabase.co/functions/v1/send-stay-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', public.get_cron_secret()),
    body := '{}'::jsonb
  );
  $$
);
