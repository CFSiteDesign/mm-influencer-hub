import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const API_SECRET = Deno.env.get('CREATOR_HUB_API_SECRET');
  if (!API_SECRET) {
    return new Response(JSON.stringify({ error: 'CREATOR_HUB_API_SECRET not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();

    // Accept either a single object or an array
    const items = Array.isArray(body) ? body : [body];
    for (const item of items) {
      if (!item?.code || typeof item.eligible !== 'boolean') {
        return new Response(JSON.stringify({ error: 'each item requires code and eligible' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const res = await fetch('https://bilhhkzcmicygufsdfxi.supabase.co/functions/v1/creator-eligibility', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': API_SECRET,
      },
      body: JSON.stringify(Array.isArray(body) ? body : body),
    });

    const data = await res.json().catch(() => ({}));

    const conflicts = Array.isArray(data?.conflicts) ? data.conflicts : [];
    const failures = Array.isArray(data?.failures) ? data.failures : [];
    const hasProblem = conflicts.length > 0 || failures.length > 0;

    return new Response(JSON.stringify({
      status: res.status,
      ok: res.ok && !hasProblem,
      data,
      conflicts,
      failures,
    }), {
      status: res.ok ? 200 : res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error syncing ALL IN eligibility:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
