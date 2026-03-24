import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

  try {
    const { applicantName, creatorCode, codeMethod, email, primarySocial, secondarySocial } = await req.json();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #000; font-size: 24px; margin-bottom: 20px;">New Creator Code to Create</h1>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">Creator Name</p>
          <p style="margin: 0 0 16px; color: #000; font-size: 18px; font-weight: bold;">${applicantName}</p>
          
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">Creator Code</p>
          <p style="margin: 0 0 16px; color: #000; font-size: 28px; font-weight: bold; font-family: monospace; letter-spacing: 2px;">${creatorCode}</p>
          
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">Generation Method</p>
          <p style="margin: 0 0 16px; color: #000; font-size: 14px;">${codeMethod}</p>

          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">Email</p>
          <p style="margin: 0 0 16px; color: #000; font-size: 14px;">${email}</p>

          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">Primary Social</p>
          <p style="margin: 0 0 16px;"><a href="${primarySocial}" style="color: #2563eb;">${primarySocial}</a></p>

          ${secondarySocial ? `
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">Secondary Social</p>
          <p style="margin: 0;"><a href="${secondarySocial}" style="color: #2563eb;">${secondarySocial}</a></p>
          ` : ''}
        </div>
        <p style="color: #999; font-size: 12px;">This is an automated notification from the Mad Monkey Influencer Hub.</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Codes To Create <codes@verify.theorox.com>',
        to: ['cfsitedesign@gmail.com'],
        subject: `New Code to Create: ${creatorCode} for ${applicantName}`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending approval email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
