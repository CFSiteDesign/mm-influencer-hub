-- Partner Hub (brief PARTNER_HUB_BRIEF.md, decisions 25 Nov 2026).
-- Partners are applicants with creator_type = 'Partner'. They share the code
-- engine, CH ids, codes team email and Revenue Hub with creators, but get
-- their own fields, their own deal and no free-stay features.

-- 1. Partner details. full_name stays the organisation name so code
--    generation and every existing list keep working.
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS org_name text,
  ADD COLUMN IF NOT EXISTS partner_category text,
  ADD COLUMN IF NOT EXISTS partner_contact_name text,
  ADD COLUMN IF NOT EXISTS partner_contact_role text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS partner_regions text,
  ADD COLUMN IF NOT EXISTS promotion_channels text[],
  ADD COLUMN IF NOT EXISTS audience_size text,
  ADD COLUMN IF NOT EXISTS partner_owner text,
  -- The deal is set per partner (decision 1): commission % and guest
  -- discount %, entered by Hayley or Katrina at approval. Empty means the
  -- creator default of 10 / 10.
  ADD COLUMN IF NOT EXISTS commission_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS guest_discount_pct numeric(5,2);

DO $$ BEGIN
  ALTER TABLE public.applicants ADD CONSTRAINT applicants_commission_pct_check
    CHECK (commission_pct IS NULL OR (commission_pct >= 0 AND commission_pct <= 100));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.applicants ADD CONSTRAINT applicants_guest_discount_pct_check
    CHECK (guest_discount_pct IS NULL OR (guest_discount_pct >= 0 AND guest_discount_pct <= 100));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.applicants ADD CONSTRAINT applicants_partner_category_check
    CHECK (partner_category IS NULL OR partner_category IN ('hostel', 'travel', 'work_volunteer', 'community_media', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Existing partners: 10% commission and 10% guest discount, except the three
-- 4MADMONKEY codes (Yellow, Lylo, Code), which started as tracking only with
-- no guest discount. Only fills partners that have no deal yet.
UPDATE public.applicants
SET commission_pct = 10,
    guest_discount_pct = CASE WHEN upper(coalesce(creator_code, '')) LIKE '%4MADMONKEY' THEN 0 ELSE 10 END
WHERE creator_type = 'Partner' AND commission_pct IS NULL AND guest_discount_pct IS NULL;

-- 2. Invite links (decision 6: the partner apply page is invite only).
--    One live link at a time; making a new one revokes the old. Not readable
--    by the public: the apply page checks a link through the
--    submit-partner-application function.
CREATE TABLE IF NOT EXISTS public.partner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.partner_invites TO authenticated;
GRANT ALL ON public.partner_invites TO service_role;

ALTER TABLE public.partner_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read partner invites" ON public.partner_invites;
CREATE POLICY "Admins can read partner invites"
  ON public.partner_invites FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can create partner invites" ON public.partner_invites;
CREATE POLICY "Admins can create partner invites"
  ON public.partner_invites FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can revoke partner invites" ON public.partner_invites;
CREATE POLICY "Admins can revoke partner invites"
  ON public.partner_invites FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
