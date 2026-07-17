import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phase 2 (B3): "Monthly summary of views, likes, comments on posts that have
// mentioned @madmonkeyhostels in range <this month> on IG AND TT."
//
// We scrape the posts of creators we already know rather than searching all of
// Instagram/TikTok for the mention — more accurate and far cheaper. Each post is
// cached in creator_posts and flagged if the caption mentions the brand.

const IG_ACTOR = 'apify~instagram-post-scraper';
const TT_ACTOR = 'clockworks~tiktok-scraper';

// Handles that count as a brand mention. Override with BRAND_HANDLES
// (comma-separated) if the brand adds accounts.
const DEFAULT_HANDLES = '@madmonkeyhostels,@madmonkeycreators';

function extractInstagramUsername(link: string | null): string | null {
  if (!link) return null;
  const t = link.trim();
  const m = t.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (m) return m[1].replace(/\/+$/, '');
  if (t && !t.includes('/') && !t.includes(' ')) return t.replace(/^@/, '');
  return null;
}

function extractTiktokUsername(link: string | null): string | null {
  if (!link) return null;
  const t = link.trim();
  const m = t.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i);
  if (m) return m[1].replace(/\/+$/, '');
  if (t && !t.includes('/') && !t.includes(' ')) return t.replace(/^@/, '');
  return null;
}

async function runApifyActor(actor: string, token: string, input: unknown, timeoutMs = 120000): Promise<any[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}&timeout=110`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: controller.signal },
    );
    if (!res.ok) throw new Error(`Apify ${actor} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// A mention counts whether written @madmonkeyhostels, #madmonkeyhostels, or as
// plain text — creators are inconsistent, and the brief cares about the brand
// being named at all.
function mentionsBrand(caption: string | null | undefined, handles: string[]): boolean {
  if (!caption) return false;
  const text = caption.toLowerCase();
  return handles.some(h => {
    const bare = h.replace(/^[@#]/, '').toLowerCase();
    return text.includes(`@${bare}`) || text.includes(`#${bare}`) || text.includes(bare);
  });
}

const monthRange = (month: string) => {
  // month is YYYY-MM
  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const APIFY_TOKEN = Deno.env.get('APIFY_TOKEN');
  if (!APIFY_TOKEN) return json({ ok: false, error: 'APIFY_TOKEN not configured' });

  const handles = (Deno.env.get('BRAND_HANDLES') || DEFAULT_HANDLES).split(',').map(s => s.trim()).filter(Boolean);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const { applicantId, email, month } = await req.json();
    if (!applicantId && !email) return json({ ok: false, error: 'Missing applicantId or email' });
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return json({ ok: false, error: 'Missing or invalid month (expected YYYY-MM)' });

    let query = supabase.from('applicants').select('id, primary_social_link, tiktok_link, secondary_social_link');
    query = applicantId ? query.eq('id', applicantId) : query.eq('email', email);
    const { data: applicant, error: fetchErr } = await query
      .order('submitted_at', { ascending: false }).limit(1).maybeSingle();
    if (fetchErr) return json({ ok: false, error: `Applicant lookup failed: ${fetchErr.message}` });
    if (!applicant) return json({ ok: false, error: 'Applicant not found' });

    const igUsername = extractInstagramUsername(applicant.primary_social_link);
    const ttUsername = extractTiktokUsername(applicant.tiktok_link || applicant.secondary_social_link);
    if (!igUsername && !ttUsername) {
      await supabase.from('applicants').update({
        posts_fetched_at: new Date().toISOString(),
        posts_fetch_status: 'failed — no Instagram or TikTok link on the application',
      }).eq('id', applicant.id);
      return json({ ok: false, error: 'No Instagram or TikTok link on this application' });
    }

    const { start, end } = monthRange(month);
    const since = start.toISOString().slice(0, 10);

    // Only scrape the platforms this creator actually gave us (same rule as B1).
    const [igRes, ttRes] = await Promise.allSettled([
      igUsername
        ? runApifyActor(IG_ACTOR, APIFY_TOKEN, {
            username: [igUsername],
            resultsLimit: 50,
            onlyPostsNewerThan: since,
          })
        : Promise.resolve(null),
      ttUsername
        ? runApifyActor(TT_ACTOR, APIFY_TOKEN, {
            profiles: [ttUsername],
            resultsPerPage: 50,
            profileSorting: 'latest',
            oldestPostDateUnified: since,
            shouldDownloadVideos: false,
            shouldDownloadCovers: false,
            shouldDownloadSubtitles: false,
            shouldDownloadSlideshowImages: false,
          })
        : Promise.resolve(null),
    ]);

    const rows: any[] = [];
    const errors: string[] = [];

    // --- Instagram ---
    if (igUsername) {
      if (igRes.status === 'fulfilled' && igRes.value) {
        for (const p of igRes.value as any[]) {
          const postedAt = p.timestamp ? new Date(p.timestamp) : null;
          if (!postedAt || postedAt < start || postedAt >= end) continue;
          const likes = typeof p.likesCount === 'number' && p.likesCount >= 0 ? p.likesCount : null;
          rows.push({
            applicant_id: applicant.id,
            platform: 'instagram',
            post_id: String(p.id ?? p.shortCode ?? p.url),
            post_url: p.url ?? null,
            caption: p.caption ?? null,
            posted_at: postedAt.toISOString(),
            views: p.videoPlayCount ?? p.videoViewCount ?? null,
            likes,
            comments: typeof p.commentsCount === 'number' ? p.commentsCount : null,
            mentions_brand: mentionsBrand(p.caption, handles),
          });
        }
      } else if (igRes.status === 'rejected') {
        errors.push(`IG: ${igRes.reason?.message || 'fetch failed'}`);
      }
    }

    // --- TikTok ---
    if (ttUsername) {
      if (ttRes.status === 'fulfilled' && ttRes.value) {
        for (const v of ttRes.value as any[]) {
          const postedAt = v.createTimeISO ? new Date(v.createTimeISO)
            : v.createTime ? new Date(v.createTime * 1000) : null;
          if (!postedAt || postedAt < start || postedAt >= end) continue;
          rows.push({
            applicant_id: applicant.id,
            platform: 'tiktok',
            post_id: String(v.id ?? v.webVideoUrl),
            post_url: v.webVideoUrl ?? null,
            caption: v.text ?? null,
            posted_at: postedAt.toISOString(),
            views: typeof v.playCount === 'number' ? v.playCount : null,
            likes: typeof v.diggCount === 'number' ? v.diggCount : null,
            comments: typeof v.commentCount === 'number' ? v.commentCount : null,
            mentions_brand: mentionsBrand(v.text, handles),
          });
        }
      } else if (ttRes.status === 'rejected') {
        errors.push(`TT: ${ttRes.reason?.message || 'fetch failed'}`);
      }
    }

    if (rows.length) {
      const { error: upsertErr } = await supabase
        .from('creator_posts')
        .upsert(rows, { onConflict: 'platform,post_id' });
      if (upsertErr) return json({ ok: false, error: `Saving posts failed: ${upsertErr.message}` });
    }

    const branded = rows.filter(r => r.mentions_brand);
    const skipped = !igUsername ? 'Instagram skipped — no link given' : !ttUsername ? 'TikTok skipped — no link given' : null;
    const status = errors.length === 0
      ? (skipped ? `ok — ${skipped}` : 'ok')
      : `${rows.length ? 'partial' : 'failed'} — ${errors.join(' | ')}${skipped ? ` | ${skipped}` : ''}`;

    await supabase.from('applicants').update({
      posts_fetched_at: new Date().toISOString(),
      posts_fetch_status: status,
    }).eq('id', applicant.id);

    return json({
      ok: errors.length === 0 || rows.length > 0,
      month,
      postsFound: rows.length,
      brandPosts: branded.length,
      views: branded.reduce((s, r) => s + (r.views ?? 0), 0),
      likes: branded.reduce((s, r) => s + (r.likes ?? 0), 0),
      comments: branded.reduce((s, r) => s + (r.comments ?? 0), 0),
      status,
    });
  } catch (error) {
    console.error('fetch-creator-engagement error:', error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
