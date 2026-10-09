-- Creator stay emails sent by the daily send-stay-reminders job:
--   48 hours before check-in ("your stay starts in 2 days"), and
--   on check-out day (thank you).
-- Each is sent once per booking; these record when.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_48h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS thank_you_sent_at timestamptz;
