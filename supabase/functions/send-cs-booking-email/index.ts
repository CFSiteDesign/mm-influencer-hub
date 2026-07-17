import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Brief step 7b: once a booking is approved, email Customer Services with the
// details they need to enter the booking into Cloudbeds.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'RESEND_API_KEY not configured' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Override with a CS_EMAIL secret if the recipient ever changes.
  const CS_EMAIL = Deno.env.get('CS_EMAIL') || 'cs@madmonkeyhostels.com';

  try {
    const {
      creatorName, email, phone, property, checkIn, checkOut, bookingType, roomType, referenceCode,
      // Brief: the amended template must clarify dates booked/changed.
      previousCheckIn, previousCheckOut, previousProperty, previousRoomType,
    } = await req.json();

    if (!creatorName || !property || !checkIn || !checkOut) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isAmended = bookingType === 'amended';
    const label = (rt?: string | null) => rt === 'private' ? 'Private room' : rt === 'dorm' ? 'Standard dorm' : '—';
    const roomLabel = label(roomType);

    // Show "was X → now Y" for anything that actually changed, so CS can see at
    // a glance what to update on the existing Cloudbeds booking.
    const changed = (before: unknown, after: unknown) => before && after && before !== after;
    const changeRow = (label: string, before: string, after: string) => `
      <tr>
        <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td>
        <td style="padding:6px 0;font-size:15px;">
          <span style="color:#9ca3af;text-decoration:line-through;">${before}</span>
          <span style="color:#6b7280;padding:0 6px;">→</span>
          <span style="color:#b91c1c;font-weight:700;">${after}</span>
        </td>
      </tr>`;

    const datesChanged = changed(previousCheckIn, checkIn) || changed(previousCheckOut, checkOut);
    const hasPrevious = Boolean(previousCheckIn && previousCheckOut);

    const flagBanner = isAmended
      ? `<div style="background:#fef2f2;border:1px solid #ef4444;color:#b91c1c;border-radius:8px;padding:12px 16px;margin:0 0 20px;font-weight:700;">⚠️ AMENDED / CHANGED BOOKING${referenceCode ? ` — this is an amendment of booking reference ${referenceCode}. Please UPDATE that existing Cloudbeds booking; do NOT create a new one.` : ' — please action urgently'}</div>`
      : '';

    const row = (label: string, value: string) => `
      <tr>
        <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td>
        <td style="padding:6px 0;color:#111827;font-size:15px;font-weight:600;">${value || '—'}</td>
      </tr>`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        ${flagBanner}
        <h1 style="color:#000;font-size:22px;margin:0 0 16px;border-bottom:2px solid #e54fcc;padding-bottom:10px;">
          ${isAmended ? 'AMENDED CREATOR BOOKING' : 'NEW CREATOR BOOKING'}
        </h1>
        <table style="width:100%;border-collapse:collapse;">
          ${isAmended && referenceCode ? row('BOOKING REFERENCE', referenceCode) : ''}
          ${row('NAME', creatorName)}
          ${row('EMAIL', email)}
          ${row('PHONE NUMBER', phone)}
          ${isAmended && changed(previousProperty, property)
            ? changeRow('PROPERTY', String(previousProperty), property)
            : row('PROPERTY', property)}
          ${isAmended && changed(previousRoomType, roomType)
            ? changeRow('ROOM TYPE', label(previousRoomType), roomLabel)
            : row('ROOM TYPE', roomLabel)}
          ${isAmended && hasPrevious && datesChanged
            ? changeRow('DATES', `${previousCheckIn} → ${previousCheckOut}`, `${checkIn} → ${checkOut}`)
            : row('DATES', `${checkIn} → ${checkOut}`)}
        </table>
        ${isAmended && hasPrevious && !datesChanged && !changed(previousProperty, property) && !changed(previousRoomType, roomType)
          ? `<p style="color:#6b7280;font-size:13px;margin:16px 0 0;">Dates, property and room type are unchanged from the original booking.</p>`
          : ''}
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
          ${isAmended
            ? 'This is an amendment — please update the existing Cloudbeds booking under the same reference above.'
            : "Please enter this booking into Cloudbeds, then add the booking reference code to the creator's log in the dashboard."}
        </p>
      </div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Mad Monkey Creator Hub <hello@creatorhub.madmonkeyhostels.com>',
        to: [CS_EMAIL],
        reply_to: 'creatorhub@madmonkeyhostels.com',
        subject: `${isAmended ? '⚠️ AMENDED Creator Booking' : 'New Creator Booking'}: ${creatorName} — ${property}`,
        html,
      }),
    });

    const data = await res.json();
    await supabase.from('email_send_log').insert({
      recipient_email: CS_EMAIL,
      template_name: 'cs-booking-notification',
      status: res.ok ? 'sent' : 'failed',
      error_message: res.ok ? null : `Resend ${res.status}: ${JSON.stringify(data)}`.slice(0, 500),
      metadata: { creatorName, property, checkIn, checkOut, bookingType: bookingType || 'new', roomType: roomType || null, referenceCode: referenceCode || null },
    });

    return new Response(JSON.stringify({ ok: res.ok, data }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-cs-booking-email error:', error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
