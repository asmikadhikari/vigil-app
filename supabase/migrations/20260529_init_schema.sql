-- Vigil Database Initialization Schema
-- Designed for Supabase Cloud (Free Tier)
-- Includes: Extensions, Tables, Indexes, RLS Policies, and Auth Synchronization Triggers

-- ==========================================
-- 0. EXTENSIONS & PREREQUISITES
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLE DEFINITIONS
-- ==========================================

-- A. Users Profile Table (synced with auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    company_name TEXT,
    company_url TEXT,
    description TEXT,
    plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'business', 'enterprise')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- B. Competitors Table
CREATE TABLE public.competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'discovered' CHECK (status IN ('tracking', 'paused', 'discovered')),
    discovered_by TEXT NOT NULL DEFAULT 'ai' CHECK (discovered_by IN ('ai', 'manual')),
    ai_confidence FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- C. Competitor Sites / Tracked Pages
CREATE TABLE public.competitor_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    page_type TEXT NOT NULL DEFAULT 'homepage' CHECK (page_type IN ('homepage', 'pricing', 'product', 'careers', 'blog')),
    last_hash TEXT,
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- D. Website Content Changes Table
CREATE TABLE public.website_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES public.competitor_sites(id) ON DELETE CASCADE,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_summary TEXT,
    diff_text TEXT,
    severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E. Job Postings Table (SerpAPI / Careers scraper)
CREATE TABLE public.job_postings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'Other',
    url TEXT,
    posted_at DATE,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_new BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- F. Customer Reviews Table
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('g2', 'trustpilot', 'capterra', 'reddit', 'google')),
    rating FLOAT NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
    title TEXT,
    snippet TEXT,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    author TEXT,
    date DATE,
    url TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- G. Ad Campaigns Table
CREATE TABLE public.ad_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('google', 'meta', 'linkedin')),
    headline TEXT,
    body TEXT,
    cta TEXT,
    landing_url TEXT,
    launched_at DATE,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- H. Competitor Pricing Tier Cache
CREATE TABLE public.competitor_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
    tier_name TEXT NOT NULL,
    price_monthly DECIMAL(10, 2),
    price_yearly DECIMAL(10, 2),
    description TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- I. User Alerts Feed
CREATE TABLE public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'medium', 'high', 'critical')),
    category TEXT NOT NULL CHECK (category IN ('pricing', 'product', 'hiring', 'marketing', 'reputation')),
    title TEXT NOT NULL,
    body TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    source_type TEXT NOT NULL,
    source_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- J. Weekly Intelligence Briefs Table
CREATE TABLE public.weekly_briefs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    bullets JSONB NOT NULL,
    swot_analysis JSONB NOT NULL,
    raw_analysis TEXT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 2. INDEX OPTIMIZATIONS
-- ==========================================
-- Performance indexes for tenant segregation queries and timeline renders
CREATE INDEX idx_competitors_user ON public.competitors(user_id);
CREATE INDEX idx_competitor_sites_competitor ON public.competitor_sites(competitor_id);
CREATE INDEX idx_website_changes_competitor ON public.website_changes(competitor_id);
CREATE INDEX idx_website_changes_detected ON public.website_changes(detected_at DESC);
CREATE INDEX idx_job_postings_competitor ON public.job_postings(competitor_id);
CREATE INDEX idx_reviews_competitor ON public.reviews(competitor_id);
CREATE INDEX idx_ad_campaigns_competitor ON public.ad_campaigns(competitor_id);
CREATE INDEX idx_alerts_user ON public.alerts(user_id);
CREATE INDEX idx_alerts_is_read ON public.alerts(user_id, is_read);
CREATE INDEX idx_weekly_briefs_user ON public.weekly_briefs(user_id, week_start DESC);

-- ==========================================
-- 3. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- Enable RLS across all schema entities
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_briefs ENABLE ROW LEVEL SECURITY;

-- Create Policies

-- 1. Users policies (read/write own profile)
CREATE POLICY users_isolation ON public.users 
    FOR ALL USING (auth.uid() = id);

-- 2. Competitors policies (read/write own monitored list)
CREATE POLICY competitors_isolation ON public.competitors 
    FOR ALL USING (auth.uid() = user_id);

-- 3. Competitor Sites policies (verified via competitors table relationship)
CREATE POLICY competitor_sites_isolation ON public.competitor_sites 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.competitors 
            WHERE competitors.id = competitor_id AND competitors.user_id = auth.uid()
        )
    );

-- 4. Website Changes policies
CREATE POLICY website_changes_isolation ON public.website_changes 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.competitors 
            WHERE competitors.id = competitor_id AND competitors.user_id = auth.uid()
        )
    );

-- 5. Job Postings policies
CREATE POLICY job_postings_isolation ON public.job_postings 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.competitors 
            WHERE competitors.id = competitor_id AND competitors.user_id = auth.uid()
        )
    );

-- 6. Reviews policies
CREATE POLICY reviews_isolation ON public.reviews 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.competitors 
            WHERE competitors.id = competitor_id AND competitors.user_id = auth.uid()
        )
    );

-- 7. Ad Campaigns policies
CREATE POLICY ad_campaigns_isolation ON public.ad_campaigns 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.competitors 
            WHERE competitors.id = competitor_id AND competitors.user_id = auth.uid()
        )
    );

-- 8. Competitor Pricing policies
CREATE POLICY competitor_pricing_isolation ON public.competitor_pricing 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.competitors 
            WHERE competitors.id = competitor_id AND competitors.user_id = auth.uid()
        )
    );

-- 9. Alerts policies
CREATE POLICY alerts_isolation ON public.alerts 
    FOR ALL USING (auth.uid() = user_id);

-- 10. Weekly Briefs policies
CREATE POLICY weekly_briefs_isolation ON public.weekly_briefs 
    FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 4. AUTH SYNCHRONIZATION TRIGGERS
-- ==========================================
-- Create trigger function to automatically populate public.users on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, plan_tier)
    VALUES (
        new.id,
        new.email,
        'free'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the sync trigger function to the auth.users table
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
