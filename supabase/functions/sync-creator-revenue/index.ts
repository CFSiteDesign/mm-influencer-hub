import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const API_SECRET = Deno.env.get('REVENUE_TRACKER_API_SECRET');
  if (!API_SECRET) {
    return new Response(JSON.stringify({ error: 'REVENUE_TRACKER_API_SECRET not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { code, name, creator_id } = await req.json();

    if (!code || !creator_id) {
      return new Response(JSON.stringify({ error: 'code and creator_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://jtiawsakiidtfobophyv.supabase.co/functions/v1/add-creator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': API_SECRET,
      },
      body: JSON.stringify({ code, name, creator_id }),
    });

    const data = await res.json();

    return new Response(JSON.stringify({ status: res.status, data }), {
      status: res.status === 409 ? 200 : res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error syncing creator:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
