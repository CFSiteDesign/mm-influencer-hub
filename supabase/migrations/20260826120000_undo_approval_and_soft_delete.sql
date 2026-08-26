-- Phase 3 (item 7): recovering from an accidental approval, and removing junk
-- applications, without emailing the creator.
--
-- Two distinct actions:
--   Undo approval  -> applicant back to 'pending', their promo code deactivated
--   Delete         -> applicant hidden from the dashboard (soft, recoverable)

-- Codes can now be switched off. Existing codes stay active.
ALTER TABLE public.creator_codes
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_reason text;

CREATE INDEX IF NOT EXISTS creator_codes_active_idx ON public.creator_codes (active) WHERE NOT active;

-- Soft delete: the row stays so bookings, emails and codes never orphan.
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text,
  ADD COLUMN IF NOT EXISTS deleted_reason text;

CREATE INDEX IF NOT EXISTS applicants_not_deleted_idx ON public.applicants (submitted_at DESC) WHERE deleted_at IS NULL;
