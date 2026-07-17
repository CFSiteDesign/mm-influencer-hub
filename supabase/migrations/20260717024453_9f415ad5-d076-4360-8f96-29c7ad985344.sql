-- Phase 2 A4: email chat log.
CREATE TABLE IF NOT EXISTS public.inbound_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id uuid REFERENCES public.applicants(id) ON DELETE SET NULL,
  from_email text NOT NULL,
  from_name text,
  to_email text,
  subject text,
  body_text text,
  body_html text,
  message_id text,
  in_reply_to text,
  resend_email_id text UNIQUE,
  received_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb
);

CREATE INDEX IF NOT EXISTS inbound_emails_applicant_idx ON public.inbound_emails (applicant_id);
CREATE INDEX IF NOT EXISTS inbound_emails_from_idx ON public.inbound_emails (lower(from_email));
CREATE INDEX IF NOT EXISTS inbound_emails_received_idx ON public.inbound_emails (received_at DESC);

GRANT SELECT ON public.inbound_emails TO authenticated;
GRANT ALL ON public.inbound_emails TO service_role;

ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read inbound_emails"
  ON public.inbound_emails
  FOR SELECT
  TO authenticated
  USING (true);