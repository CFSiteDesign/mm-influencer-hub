-- How many beds (dorm) or rooms (private) CS should book, chosen by the admin
-- alongside the room type before the booking is sent to Customer Services.
-- Existing bookings were all single-creator stays, so they default to 1.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS room_quantity integer NOT NULL DEFAULT 1;

DO $$ BEGIN
  ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_room_quantity_range CHECK (room_quantity BETWEEN 1 AND 10);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
