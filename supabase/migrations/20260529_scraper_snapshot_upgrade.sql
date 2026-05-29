-- Scraper reliability upgrade
-- Stores normalized page snapshots for real before/after diffs and tracks failures.

ALTER TABLE public.competitor_sites
ADD COLUMN IF NOT EXISTS last_normalized_text TEXT,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS scrape_config JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_competitor_sites_last_checked
ON public.competitor_sites(last_checked_at DESC);
