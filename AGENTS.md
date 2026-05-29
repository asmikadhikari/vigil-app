<!-- BEGIN:deployment-guide -->
# Vigil — Free Deployment Guide

## 1. Supabase (Database + Auth)
1. Go to https://supabase.com and create a free account
2. Create a new project (choose a region close to you)
3. Go to SQL Editor, paste and run:
   - `supabase/20260529_init_schema.sql`
   - `supabase/20260529_scraper_snapshot_upgrade.sql`
4. Go to Project Settings → API → copy your project URL, anon key, service role key
5. Go to Authentication → Settings → enable email/password auth

## 2. Netlify (Web Dashboard)
1. Push `web/` to a GitHub repo
2. Go to https://app.netlify.com → Add new site → Import from Git
3. Select repo, build settings auto-detect from `netlify.toml`
4. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key
5. Deploy

## 3. Groq (Free LLM)
1. Go to https://console.groq.com and create a free account
2. Generate an API key (free, 14,400 requests/day)
3. Use this key for `GROQ_API_KEY`

## 4. Render (Scrapers)
1. Go to https://render.com and create a free account
2. Push `scrapers/` to a GitHub repo
3. Go to Dashboard → New → Web Service
4. Connect repo, select `vigil-scrapers` from render.yaml
5. Set environment variables:
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_SERVICE_KEY` = your Supabase service role key
   - `GROQ_API_KEY` = your Groq API key
   - `SERPAPI_KEY` = your SerpAPI key (optional, free tier)
6. Deploy
7. Copy the URL (e.g., https://vigil-scrapers.onrender.com)

## 5. cron-job.org (Keep Render awake)
1. Go to https://cron-job.org and create a free account
2. Create a cron job:
   - URL: `https://vigil-scrapers.onrender.com/health`
   - Schedule: Every 10 minutes
3. This prevents Render's free tier from spinning down

## 6. Optional Services
- **Resend** (email): https://resend.com — free tier, 3,000 emails/month
- **SerpAPI** (job search): https://serpapi.com — free tier, 250 searches/month
- **ZenRows** (scraping proxy): Only if needed for protected sites
<!-- END:deployment-guide -->
