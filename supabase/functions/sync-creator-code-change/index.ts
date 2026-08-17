import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REVENUE_BASE = 'https://jtiawsakiidtfobophyv.supabase.co/functions/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const API_SECRET = Deno.env.get('REVENUE_TRACKER_API_SECRET');
  if (!API_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: 'REVENUE_TRACKER_API_SECRET not configured' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { old_code, new_code, name, creator_id } = await req.json();

    if (!new_code || !creator_id) {
      return new Response(JSON.stringify({ ok: false, error: 'new_code and creator_id are required' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = { 'Content-Type': 'application/json', 'x-api-secret': API_SECRET };
    const attempts: any[] = [];

    // Preferred: dedicated update endpoint on the revenue dashboard
    let ok = false;
    try {
      const res = await fetch(`${REVENUE_BASE}/update-creator`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ creator_id, code: new_code, old_code, name }),
      });
      const body = await res.text();
      attempts.push({ endpoint: 'update-creator', status: res.status, body: body.slice(0, 300) });
      ok = res.ok;
    } catch (e) {
      attempts.push({ endpoint: 'update-creator', error: String(e) });
    }

    // Fallback: add-creator (revenue side upserts on creator_id in most versions)
    if (!ok) {
      try {
        const res = await fetch(`${REVENUE_BASE}/add-creator`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ code: new_code, name, creator_id }),
        });
        const body = await res.text();
        attempts.push({ endpoint: 'add-creator', status: res.status, body: body.slice(0, 300) });
        ok = res.ok;
      } catch (e) {
        attempts.push({ endpoint: 'add-creator', error: String(e) });
      }
    }

    return new Response(JSON.stringify({ ok, attempts }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
