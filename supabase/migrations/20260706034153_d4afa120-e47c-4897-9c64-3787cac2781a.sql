-- Add room_type column to bookings (used by BookingsPage approval flow)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_type text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;