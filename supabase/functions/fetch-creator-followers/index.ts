import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phase 2 (B1): pull follower counts from the creator's Instagram / TikTok
// profiles via Apify instead of the creator typing them into the form.
// Called fire-and-forget after an application is submitted, and from the
// "Refresh followers" button on the creator page.

const IG_ACTOR = 'apify~instagram-profile-scraper';
const TT_ACTOR = 'clockworks~tiktok-profile-scraper';

function extractInstagramUsername(link: string | null): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  const m = trimmed.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (m) return m[1].replace(/\/+$/, '');
  // Bare handle like "@name" or "name" (no URL)
  if (!trimmed.includes('/') && !trimmed.includes(' ')) return trimmed.replace(/^@/, '');
  return null;
}

function extractTiktokUsername(link: string | null): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  const m = trimmed.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i);
  if (m) return m[1].replace(/\/+$/, '');
  if (!trimmed.includes('/') && !trimmed.includes(' ')) return trimmed.replace(/^@/, '');
  return null;
}

async function runApifyActor(actor: string, token: string, input: unknown, timeoutMs = 120000): Promise<any[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}&timeout=110`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Apify ${actor} HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const APIFY_TOKEN = Deno.env.get('APIFY_TOKEN');
  if (!APIFY_TOKEN) return json({ ok: false, error: 'APIFY_TOKEN not configured' });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { applicantId, email } = await req.json();
    if (!applicantId && !email) return json({ ok: false, error: 'Missing applicantId or email' });

    let query = supabase
      .from('applicants')
      .select('id, primary_social_link, tiktok_link, secondary_social_link');
    query = applicantId ? query.eq('id', applicantId) : query.eq('email', email);
    const { data: applicant, error: fetchErr } = await query
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fetchErr) return json({ ok: false, error: `Applicant lookup failed: ${fetchErr.message}` });
    if (!applicant) return json({ ok: false, error: 'Applicant not found' });

    const igUsername = extractInstagramUsername(applicant.primary_social_link);
    const ttUsername = extractTiktokUsername(applicant.tiktok_link || applicant.secondary_social_link);

    if (!igUsername && !ttUsername) {
      await supabase.from('applicants').update({
        followers_fetched_at: new Date().toISOString(),
        followers_fetch_status: 'failed — no Instagram or TikTok link on the application',
      }).eq('id', applicant.id);
      return json({ ok: false, error: 'No Instagram or TikTok link on this application' });
    }

    // Only run the scraper(s) we have a link for; both run in parallel when
    // the creator gave both platforms.
    const [igResult, ttResult] = await Promise.allSettled([
      igUsername
        ? runApifyActor(IG_ACTOR, APIFY_TOKEN, { usernames: [igUsername] })
        : Promise.resolve(null),
      ttUsername
        ? runApifyActor(TT_ACTOR, APIFY_TOKEN, {
            profiles: [ttUsername],
            resultsPerPage: 1,
            shouldDownloadVideos: false,
            shouldDownloadCovers: false,
            shouldDownloadSubtitles: false,
            shouldDownloadSlideshowImages: false,
          })
        : Promise.resolve(null),
    ]);

    let igFollowers: number | null = null;
    let igError: string | null = null;
    if (igUsername) {
      if (igResult.status === 'fulfilled') {
        const item = (igResult.value as any[] | null)?.[0];
        const count = item?.followersCount ?? item?.followers ?? null;
        if (typeof count === 'number') igFollowers = count;
        else igError = 'Instagram profile returned no follower count';
      } else {
        igError = igResult.reason?.message || 'Instagram fetch failed';
      }
    }

    let ttFollowers: number | null = null;
    let ttError: string | null = null;
    if (ttUsername) {
      if (ttResult.status === 'fulfilled') {
        const item = (ttResult.value as any[] | null)?.[0];
        const count = item?.authorMeta?.fans ?? item?.fans ?? item?.followers ?? item?.['authorMeta.fans'] ?? null;
        if (typeof count === 'number') ttFollowers = count;
        else ttError = 'TikTok profile returned no follower count';
      } else {
        ttError = ttResult.reason?.message || 'TikTok fetch failed';
      }
    }

    // A platform with no link is "skipped", never a failure.
    const failures: string[] = [];
    if (igError) failures.push(`IG: ${igError}`);
    if (ttError) failures.push(`TT: ${ttError}`);
    const skipped = !igUsername ? 'Instagram skipped — no link given' : !ttUsername ? 'TikTok skipped — no link given' : null;

    const status =
      failures.length === 0
        ? (skipped ? `ok — ${skipped}` : 'ok')
        : `${igFollowers !== null || ttFollowers !== null ? 'partial' : 'failed'} — ${failures.join(' | ')}${skipped ? ` | ${skipped}` : ''}`;

    const update: Record<string, unknown> = {
      followers_fetched_at: new Date().toISOString(),
      followers_fetch_status: status.slice(0, 500),
    };
    if (igFollowers !== null) update.instagram_followers = String(igFollowers);
    if (ttFollowers !== null) update.tiktok_followers = String(ttFollowers);

    const { error: updateErr } = await supabase.from('applicants').update(update).eq('id', applicant.id);
    if (updateErr) return json({ ok: false, error: updateErr.message });

    return json({ ok: true, instagram: igFollowers, tiktok: ttFollowers, status });
  } catch (error) {
    console.error('fetch-creator-followers error:', error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
