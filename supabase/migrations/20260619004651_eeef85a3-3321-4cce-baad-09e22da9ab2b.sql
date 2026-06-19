ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS flow text NOT NULL DEFAULT 'prod';
CREATE INDEX IF NOT EXISTS applicants_flow_idx ON public.applicants (flow);