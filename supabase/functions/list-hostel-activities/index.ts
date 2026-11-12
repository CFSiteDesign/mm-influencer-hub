import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Activities a hostel runs, for the optional activity perk on the booking
// approval card (Creatorhub Updates brief, Nov 2026). The list lives in the
// Experience Dashboard, so this asks its hostel-activities endpoint.
//
// The Experience Dashboard key (EXPERIENCE_DB_API_KEY) stays on the server;
// the browser only ever sees the activity titles.
//
//   POST { property: "Koh Rong" } -> { ok, configured, activities: [{ id, title, category }] }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const ENDPOINT = 'https://avftyexxqyykppzmrjxn.supabase.co/functions/v1/hostel-activities';
// Hub property name -> Experience Dashboard hostel name, where they differ.
const ALIASES: Record<string, string> = { 'Nacpan Beach': 'Nacpan' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { property } = await req.json().catch(() => ({}));
    if (!property || typeof property !== 'string') return json({ ok: false, error: 'Missing property' });

    const key = Deno.env.get('EXPERIENCE_DB_API_KEY');
    if (!key) return json({ ok: false, configured: false, activities: [], error: 'Activity list not connected yet' });

    const location = ALIASES[property] || property;
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({ location }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ ok: false, configured: true, activities: [], error: data?.error || `Experience Dashboard ${res.status}` });
    return json({ ok: true, configured: true, activities: Array.isArray(data?.activities) ? data.activities : [] });
  } catch (e) {
    console.error('list-hostel-activities error:', e);
    return json({ ok: false, activities: [], error: e instanceof Error ? e.message : 'Unknown error' });
  }
});
