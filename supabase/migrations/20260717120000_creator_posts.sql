-- Phase 2 B3: monthly summary of views/likes/comments on posts that mention
-- @madmonkeyhostels, on Instagram and TikTok.
--
-- Rather than searching all of Instagram/TikTok for the mention (unreliable and
-- expensive), we scrape the posts of creators we already know and flag the ones
-- that mention the brand. Posts are cached here so the report is instant and we
-- only pay Apify for new scrapes.

CREATE TABLE IF NOT EXISTS public.creator_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id uuid REFERENCES public.applicants(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  -- Platform's own id, so re-scraping updates counts instead of duplicating.
  post_id text NOT NULL,
  post_url text,
  caption text,
  posted_at timestamptz,
  views int,
  likes int,
  comments int,
  -- True when the caption mentions the brand (the thing the brief reports on).
  mentions_brand boolean NOT NULL DEFAULT false,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_posts_platform_post_unique UNIQUE (platform, post_id)
);

CREATE INDEX IF NOT EXISTS creator_posts_applicant_idx ON public.creator_posts (applicant_id);
CREATE INDEX IF NOT EXISTS creator_posts_posted_idx ON public.creator_posts (posted_at DESC);
CREATE INDEX IF NOT EXISTS creator_posts_brand_idx ON public.creator_posts (mentions_brand) WHERE mentions_brand;

ALTER TABLE public.creator_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read creator_posts"
  ON public.creator_posts FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.creator_posts TO authenticated;
GRANT ALL ON public.creator_posts TO service_role;

-- When we last scraped a creator's posts, so the UI can show staleness.
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS posts_fetched_at timestamptz;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS posts_fetch_status text;
