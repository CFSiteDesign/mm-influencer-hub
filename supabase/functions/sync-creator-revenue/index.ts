import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { isAdminRequest } from "../_shared/partners.ts";

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
    // Only the dashboard calls this. It sets what a code earns in the Revenue
    // Hub, so the public key is not enough: the caller must be an admin.
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (!(await isAdminRequest(sb, req))) {
      return new Response(JSON.stringify({ error: 'Admins only' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { code, name, creator_id, is_partner, commission_pct } = await req.json();
    // Partner Hub: partners are flagged in the Revenue Hub (Partner ID wording,
    // own leaderboard) and carry their own commission % (decision 1). Only
    // sent when the caller knows them, so creator calls are unchanged.
    const partnerFields: Record<string, unknown> = {};
    if (typeof is_partner === 'boolean') partnerFields.is_partner = is_partner;
    if (commission_pct === null || (typeof commission_pct === 'number' && commission_pct >= 0 && commission_pct <= 100)) {
      partnerFields.commission_pct = commission_pct;
    }

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
      body: JSON.stringify({ code, name, creator_id, ...partnerFields }),
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
