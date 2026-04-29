import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const {
      fullName, email, whatsapp, creatorType, cityCountry,
      instagramLink, instagramFollowers,
      tiktokLink, tiktokFollowers,
      visitingHostel, plannedHostels, arrivalDate,
    } = await req.json();

    const field = (label: string, value: string | null | undefined) => {
      if (!value) return '';
      return `
        <p style="margin: 0 0 4px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">${label}</p>
        <p style="margin: 0 0 16px; color: #111; font-size: 15px;">${value}</p>
      `;
    };

    const linkField = (label: string, url: string | null | undefined) => {
      if (!url) return '';
      return `
        <p style="margin: 0 0 4px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">${label}</p>
        <p style="margin: 0 0 16px;"><a href="${url}" style="color: #2563eb; font-size: 15px;">${url}</a></p>
      `;
    };

    const hostelsHtml = plannedHostels && plannedHostels.length > 0
      ? `
        <p style="margin: 0 0 4px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Planned Hostels</p>
        <p style="margin: 0 0 16px; color: #111; font-size: 15px;">${plannedHostels.join(', ')}</p>
      `
      : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #000; font-size: 22px; margin-bottom: 20px; border-bottom: 2px solid #f97316; padding-bottom: 12px;">🐒 New Creator Application</h1>
        <div style="background: #f9fafb; border-radius: 10px; padding: 24px; margin-bottom: 20px;">
          ${field('Name', fullName)}
          ${field('Email', email)}
          ${field('WhatsApp', whatsapp)}
          ${field('City / Country', cityCountry)}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          ${linkField('Instagram Link', instagramLink)}
          ${field('Instagram Followers', instagramFollowers)}
          ${linkField('TikTok Link', tiktokLink)}
          ${field('TikTok Followers', tiktokFollowers)}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          ${field('Planning to visit a hostel?', visitingHostel ? 'Yes' : 'No')}
          ${hostelsHtml}
          ${field('Planned Arrival Date', arrivalDate)}
        </div>
        <p style="color: #999; font-size: 11px;">Automated notification from the Mad Monkey Creator Hub.</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Creator Hub <codes@verify.theorox.com>',
        to: ['creatorhub@madmonkeyhostels.com'],
        ...(email ? { reply_to: email } : {}),
        subject: `New Creator Application: ${fullName}`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      await supabase.from('email_send_log').insert({
        recipient_email: email || 'unknown',
        template_name: 'submission-notification',
        status: 'failed',
        error_message: `Resend API error [${res.status}]: ${JSON.stringify(data)}`,
        metadata: { fullName },
      });
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    await supabase.from('email_send_log').insert({
      recipient_email: email || 'unknown',
      template_name: 'submission-notification',
      status: 'sent',
      metadata: { fullName, resendId: data?.id },
    });

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending submission email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
