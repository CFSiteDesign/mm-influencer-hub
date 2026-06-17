import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Days between two yyyy-mm-dd dates (UTC midnight), independent of timezone.
function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const b = Date.parse(`${checkOut}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysFromToday(date: string): number {
  return nightsBetween(todayUTC(), date);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = await req.json();
    const { token, action } = body || {};

    if (!token) return json({ ok: false, error: 'Missing token' }, 200);

    // Resolve the creator from the magic-link token.
    const { data: applicant, error: lookupErr } = await supabase
      .from('applicants')
      .select('id, full_name, email, whatsapp_number, creator_id, creator_code, status')
      .eq('booking_token', token)
      .maybeSingle();

    if (lookupErr || !applicant) {
      return json({ ok: false, error: 'invalid_token' }, 200);
    }

    // --- context: return creator info + existing bookings for the page ------
    if (action === 'context') {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, property, check_in, check_out, nights, status, type, reference_code, submitted_at')
        .eq('applicant_id', applicant.id)
        .order('submitted_at', { ascending: false });

      return json({
        ok: true,
        creator: {
          name: applicant.full_name,
          creatorId: applicant.creator_id,
          email: applicant.email,
        },
        bookings: bookings || [],
      });
    }

    // --- submit: validate and insert a booking -----------------------------
    if (action === 'submit') {
      const { property, checkIn, checkOut, otherRequests, type } = body;
      const bookingType = type === 'amended' ? 'amended' : 'new';

      if (!property || !checkIn || !checkOut) {
        return json({ ok: false, error: 'Missing property or dates' }, 200);
      }

      // Property must exist and be bookable (AUS / inactive excluded).
      const { data: prop } = await supabase
        .from('properties')
        .select('location, is_active, excluded_from_booking')
        .eq('location', property)
        .maybeSingle();

      if (!prop || !prop.is_active || prop.excluded_from_booking) {
        return json({ ok: false, error: 'Invalid destination' }, 200);
      }

      // Server-side mirror of the calendar rules.
      const lead = daysFromToday(checkIn);
      if (lead < 2) {
        return json({ ok: false, error: 'Check-in must be at least 2 days from today' }, 200);
      }

      const nights = nightsBetween(checkIn, checkOut);
      if (nights < 1) {
        return json({ ok: false, error: 'Check-out must be after check-in' }, 200);
      }
      if (nights > 5) {
        return json({ ok: false, error: 'Maximum stay is 5 nights' }, 200);
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('bookings')
        .insert({
          applicant_id: applicant.id,
          creator_id: applicant.creator_id,
          creator_name: applicant.full_name,
          creator_email: applicant.email,
          property,
          check_in: checkIn,
          check_out: checkOut,
          nights,
          other_requests: otherRequests || null,
          type: bookingType,
          status: 'submitted',
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('Booking insert failed:', insertErr);
        return json({ ok: false, error: 'Could not save booking' }, 200);
      }

      return json({ ok: true, bookingId: inserted.id, type: bookingType });
    }

    return json({ ok: false, error: 'Unknown action' }, 200);
  } catch (error) {
    console.error('submit-booking error:', error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, 200);
  }
});
