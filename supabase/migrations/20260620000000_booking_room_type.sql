-- A1: room type the admin picks before sending the booking to Customer Services.
-- 'dorm' (standard dorm) | 'private' (private room).
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS room_type text;
