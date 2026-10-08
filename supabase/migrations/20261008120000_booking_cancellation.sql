-- Admin can cancel an approved or confirmed creator stay. status becomes
-- 'cancelled' (no check constraint on status, so no change needed there);
-- these record who cancelled, when, and the optional note sent to the creator.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by text,
  ADD COLUMN IF NOT EXISTS cancel_reason text;
