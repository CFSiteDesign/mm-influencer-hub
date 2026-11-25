import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PARTNER_CATEGORIES } from "../_shared/partners.ts";

// Partner Hub apply page (/partners?invite=...). The page is invite only
// (decision 6), so every call carries the invite token, checked here against
// public.partner_invites, which the public cannot read.
//
//   { action: 'check',  invite }            -> { ok, valid }
//   { action: 'submit', invite, ...fields } -> { ok } or { ok: false, error }
//
// A submitted partner lands in the normal approval queue as a pending
// applicant with creator_type 'Partner'. full_name holds the organisation
// name, so code generation and every existing list keep working.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

export const CHANNELS = ['front_desk', 'newsletter', 'website', 'social', 'group_trips', 'other'];
export const AUDIENCE = ['under_1k', '1k_10k', '10k_50k', '50k_plus'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (v: unknown, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Normalises and checks the form. Returns the row to insert, or an error a person can act on. */
export function validatePartnerForm(body: any): { row?: Record<string, unknown>; error?: string } {
  const orgName = clean(body.orgName, 120);
  const contactName = clean(body.contactName, 120);
  const email = clean(body.email, 200).toLowerCase();
  const category = clean(body.category, 40);
  let website = clean(body.website, 300);
  const channels = Array.isArray(body.channels)
    ? [...new Set(body.channels.map((c: unknown) => clean(c, 40)).filter((c: string) => CHANNELS.includes(c)))]
    : [];
  const audience = clean(body.audience, 20);

  if (!orgName) return { error: 'Please enter your organisation name.' };
  if (!contactName) return { error: 'Please enter your name.' };
  if (!EMAIL_RE.test(email)) return { error: 'Please enter a valid email address.' };
  if (!(category in PARTNER_CATEGORIES)) return { error: 'Please choose what kind of partner you are.' };
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  if (website && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(website)) return { error: 'Please check your website address.' };
  if (!channels.length) return { error: 'Please tell us how you will share your code.' };
  if (audience && !AUDIENCE.includes(audience)) return { error: 'Please choose a rough audience size.' };
  if (body.agreed !== true) return { error: 'Please agree to the Commission Agreement.' };

  const regions = clean(body.regions, 200);
  return {
    row: {
      full_name: orgName,
      org_name: orgName,
      email,
      whatsapp_number: clean(body.phone, 40),
      partner_contact_name: contactName,
      partner_contact_role: clean(body.contactRole, 120) || null,
      partner_category: category,
      website: website || null,
      primary_social_link: website || '',
      city_country: regions || null,
      partner_regions: regions || null,
      promotion_channels: channels,
      audience_size: audience || null,
      creator_type: 'Partner',
      visiting_hostel: false,
      flow: 'prod',
      status: 'pending',
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action === 'submit' ? 'submit' : 'check';
    const invite = clean(body.invite, 100);

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    let valid = false;
    if (invite.length >= 16) {
      const { data } = await sb.from('partner_invites').select('id').eq('token', invite).is('revoked_at', null).maybeSingle();
      valid = !!data;
    }
    if (action === 'check') return json({ ok: true, valid });
    if (!valid) return json({ ok: false, error: 'invalid_invite' });

    const { row, error } = validatePartnerForm(body);
    if (error || !row) return json({ ok: false, error });

    const { data: existing } = await sb.from('applicants').select('id')
      .ilike('email', row.email as string).is('deleted_at', null).limit(1);
    if (existing?.length) return json({ ok: false, error: 'This email has already applied. We will be in touch soon.' });

    const { error: insertErr } = await sb.from('applicants').insert([row]);
    if (insertErr) throw insertErr;
    return json({ ok: true });
  } catch (e) {
    console.error('submit-partner-application error:', e);
    return json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
});
