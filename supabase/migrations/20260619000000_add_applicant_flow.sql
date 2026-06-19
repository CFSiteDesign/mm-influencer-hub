-- Isolate the test flow from production at the data level.
-- Applicants created via /apply-test are tagged flow='test'; everything that
-- existed (and everything from production /apply) is 'prod'. The two admin
-- dashboards filter on this so a test approval can never touch a real applicant.
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS flow text NOT NULL DEFAULT 'prod';

CREATE INDEX IF NOT EXISTS applicants_flow_idx ON public.applicants (flow);
