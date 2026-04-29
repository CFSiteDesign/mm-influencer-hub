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

  const webhookUrl = Deno.env.get('STAFF_DISCOUNT_WEBHOOK_URL');
  if (!webhookUrl) {
    return new Response(
      JSON.stringify({ error: 'STAFF_DISCOUNT_WEBHOOK_URL not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = await req.json();
    const { email, full_name, creator_id, approved_at } = body || {};

    if (!email || !full_name) {
      return new Response(
        JSON.stringify({ error: 'email and full_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = {
      email,
      full_name,
      creator_id: creator_id ?? null,
      approved_at: approved_at ?? new Date().toISOString(),
      status: 'approved',
      source: 'mad-monkey-creator-hub',
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();

    await supabase.from('email_send_log').insert({
      recipient_email: email,
      template_name: 'notify-discount-app',
      status: res.ok ? 'sent' : 'failed',
      error_message: res.ok ? null : `Webhook ${res.status}: ${responseText}`.slice(0, 500),
      metadata: { full_name, creator_id, webhook_status: res.status },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'Webhook delivery failed', status: res.status, body: responseText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, forwarded: payload }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('notify-discount-app error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
