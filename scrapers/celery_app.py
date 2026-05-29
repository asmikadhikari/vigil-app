"""
Vigil Scraping Engine — Celery Application & Task Definitions

This module defines the Celery app instance, all background scraping tasks,
and the Celery Beat schedule for automated daily/weekly execution.

Tasks:
  1. scrape_competitor_websites — Fetches, normalizes, diffs, and analyzes website pages.
  2. scan_competitor_jobs — Queries SerpAPI for new job postings.
  3. run_weekly_brief — Compiles the Map-Reduce weekly intelligence brief.
"""

import logging
from datetime import datetime, timezone, timedelta

from celery import Celery
from celery.schedules import crontab

from config import (
    REDIS_URL,
    SERPAPI_KEY,
)

logger = logging.getLogger(__name__)

# ==========================================
# Celery App Initialization
# ==========================================
app = Celery("vigil_scrapers", broker=REDIS_URL, backend=REDIS_URL)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_concurrency=4,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)


# ==========================================
# TASK 1: Website Change Monitor
# ==========================================
@app.task(name="scrape_competitor_websites", bind=True, max_retries=3, time_limit=3600, soft_time_limit=3500)
def scrape_competitor_websites(self):
    """
    Fetches all actively tracked competitor sites, scrapes them through
    the ZenRows proxy, normalizes the HTML, detects semantic changes,
    and triggers AI analysis on detected diffs.
    """
    from clients import get_all_active_competitors, get_competitor_sites
    from clients import (
        upsert_website_change,
        update_site_snapshot,
        record_site_scrape_error,
        insert_alert,
    )
    from clients.proxy_client import get_proxy_client
    from parser import clean_and_normalize_html, compute_content_hash, detect_changes
    from pipeline import summarize_website_change

    proxy_client = get_proxy_client()
    if not proxy_client:
        logger.error("ProxyClient not initialized. Set ZENROWS_API_KEY in .env")
        return {"status": "error", "reason": "No proxy client"}

    competitors = get_all_active_competitors()
    results = {"scraped": 0, "changes_detected": 0, "errors": 0}

    for competitor in competitors:
        competitor_id = competitor["id"]
        competitor_name = competitor["name"]
        user_desc = competitor.get("users", {}).get("description", "")
        sites = get_competitor_sites(competitor_id)

        for site in sites:
            try:
                site_id = site["id"]
                url = site["url"]
                page_type = site.get("page_type", "homepage")
                previous_hash = site.get("last_hash", "")
                previous_text = site.get("last_normalized_text") or ""
                scrape_config = site.get("scrape_config") or {}

                # Fetch HTML through ZenRows proxy
                raw_html = proxy_client.fetch(
                    url=url,
                    js_render=scrape_config.get("js_render", True),
                    premium_proxy=scrape_config.get("premium_proxy", False),
                    wait_for=scrape_config.get("wait_for"),
                    css_extractor=scrape_config.get("css_extractor"),
                )

                # Normalize and strip noise
                normalized_text = clean_and_normalize_html(raw_html, page_type)

                if not normalized_text.strip():
                    logger.warning(f"Empty content after normalization: {url}")
                    record_site_scrape_error(site_id, "Empty content after normalization")
                    continue

                min_content_length = scrape_config.get("min_content_length", 80)
                if len(normalized_text) < min_content_length:
                    message = (
                        f"Normalized content too short "
                        f"({len(normalized_text)} chars < {min_content_length})"
                    )
                    logger.warning(f"{message}: {url}")
                    record_site_scrape_error(site_id, message)
                    continue

                # First scrape or pre-upgrade row: store baseline snapshot, no diff.
                if not previous_hash or not previous_text:
                    # First scrape — store baseline hash, no diff
                    new_hash = compute_content_hash(normalized_text)
                    update_site_snapshot(site_id, new_hash, normalized_text)
                    results["scraped"] += 1
                    continue

                has_changed, current_hash, diff_text = detect_changes(
                    previous_text,
                    normalized_text,
                )

                if not has_changed:
                    update_site_snapshot(site_id, current_hash, normalized_text)
                    results["scraped"] += 1
                    continue

                if len(diff_text) > 12000:
                    diff_text = diff_text[:12000] + "\n\n[Diff truncated for analysis]"

                # Run AI Map analysis on the change
                analysis = summarize_website_change(
                    competitor_name=competitor_name,
                    page_type=page_type,
                    diff_text=diff_text,
                    user_description=user_desc,
                )

                # Determine severity from AI analysis
                severity = "low"
                if analysis.get("has_impact") and analysis.get("events"):
                    severities = [e.get("severity", "info") for e in analysis["events"]]
                    if "critical" in severities:
                        severity = "high"
                    elif "high" in severities:
                        severity = "high"
                    elif "medium" in severities:
                        severity = "medium"

                # Store the change record
                change_summary = ""
                if analysis.get("events"):
                    change_summary = "; ".join(
                        e.get("summary", "") for e in analysis["events"]
                    )

                upsert_website_change({
                    "competitor_id": competitor_id,
                    "site_id": site_id,
                    "change_summary": change_summary or "Content change detected",
                    "diff_text": diff_text[:5000],
                    "severity": severity,
                })

                # Store the new baseline after processing the change.
                update_site_snapshot(site_id, current_hash, normalized_text)

                # Create alert if high severity
                if severity in ("medium", "high"):
                    user_id = competitor.get("user_id")
                    if user_id and analysis.get("events"):
                        event = analysis["events"][0]
                        insert_alert({
                            "user_id": user_id,
                            "competitor_id": competitor_id,
                            "severity": event.get("severity", "medium"),
                            "category": event.get("category", "product"),
                            "title": event.get("summary", "Change detected"),
                            "body": event.get("explanation", ""),
                            "source_type": "website_changes",
                        })

                results["changes_detected"] += 1
                results["scraped"] += 1

            except Exception as e:
                logger.error(f"Error scraping {site.get('url', 'unknown')}: {e}")
                site_id = site.get("id")
                if site_id:
                    record_site_scrape_error(site_id, str(e))
                results["errors"] += 1

    logger.info(f"Website scrape completed: {results}")
    return results


# ==========================================
# TASK 2: Job Posting Scanner (SerpAPI)
# ==========================================
@app.task(name="scan_competitor_jobs", bind=True, max_retries=2)
def scan_competitor_jobs(self):
    """
    Queries SerpAPI's Google Jobs engine for each tracked competitor
    to discover new job postings and hiring signals.
    """
    from clients import (
        get_all_active_competitors,
        insert_job_postings,
        get_existing_job_urls,
    )

    if not SERPAPI_KEY:
        logger.error("SERPAPI_KEY not set. Skipping job scan.")
        return {"status": "error", "reason": "No SerpAPI key"}

    import httpx

    competitors = get_all_active_competitors()
    results = {"scanned": 0, "new_jobs": 0}

    for competitor in competitors:
        competitor_id = competitor["id"]
        competitor_name = competitor["name"]

        try:
            # Query SerpAPI Google Jobs
            response = httpx.get(
                "https://serpapi.com/search.json",
                params={
                    "engine": "google_jobs",
                    "q": f"{competitor_name} jobs",
                    "api_key": SERPAPI_KEY,
                },
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            jobs_results = data.get("jobs_results", [])
            existing_urls = get_existing_job_urls(competitor_id)
            new_jobs = []

            for job in jobs_results:
                job_url = job.get("share_link", "") or job.get("job_id", "")
                if job_url in existing_urls:
                    continue

                # Classify department from title
                title = job.get("title", "")
                department = classify_department(title)

                new_jobs.append({
                    "competitor_id": competitor_id,
                    "role": title,
                    "department": department,
                    "url": job_url,
                    "posted_at": None,  # SerpAPI doesn't always provide exact date
                    "is_new": True,
                })

            if new_jobs:
                insert_job_postings(new_jobs)
                results["new_jobs"] += len(new_jobs)

            results["scanned"] += 1

        except Exception as e:
            logger.error(f"Job scan failed for {competitor_name}: {e}")

    logger.info(f"Job scan completed: {results}")
    return results


def classify_department(job_title: str) -> str:
    """
    Simple keyword-based classifier to map job titles to departments.
    """
    title_lower = job_title.lower()
    
    if any(kw in title_lower for kw in ["engineer", "developer", "devops", "sre", "architect", "backend", "frontend", "fullstack", "data scientist", "ml ", "ai ", "machine learning", "deep learning", "nlp", "mlops", "platform engineer"]):
        return "Engineering"
    elif any(kw in title_lower for kw in ["sales", "account executive", "business development", "sdr", "bdr", "revenue"]):
        return "Sales"
    elif any(kw in title_lower for kw in ["marketing", "growth", "content", "seo", "brand", "social media", "copywriter", "demand generation"]):
        return "Marketing"
    elif any(kw in title_lower for kw in ["product manager", "product owner", "ux", "ui", "designer", "design", "product designer", "user experience"]):
        return "Product"
    elif any(kw in title_lower for kw in ["support", "customer success", "cx", "help desk", "technical support"]):
        return "Customer Success"
    elif any(kw in title_lower for kw in ["finance", "accounting", "controller", "cfo", "fp&a"]):
        return "Finance"
    elif any(kw in title_lower for kw in ["hr", "people", "recruiter", "talent", "human resources"]):
        return "People"
    else:
        return "Other"


# ==========================================
# TASK 3: Weekly Brief Generator (Reduce Step)
# ==========================================
@app.task(name="run_weekly_brief", bind=True, max_retries=2)
def run_weekly_brief(self):
    """
    Compiles all changes and alerts from the past 7 days per user
    and runs the Reduce LLM step to generate the weekly intelligence
    brief and SWOT analysis.
    """
    from clients import get_supabase
    from pipeline import generate_weekly_brief

    supabase = get_supabase()
    # Get all users who have active tracking
    users_response = supabase.table("users").select("*").execute()
    users = users_response.data
    results = {"briefs_generated": 0}

    week_start = (datetime.now(timezone.utc) - timedelta(days=7)).date()

    for user in users:
        user_id = user["id"]
        user_name = user.get("company_name", "Unknown")
        user_desc = user.get("description", "")

        try:
            # Fetch this user's competitors
            comp_response = supabase.table("competitors") \
                .select("id, name") \
                .eq("user_id", user_id) \
                .eq("status", "tracking") \
                .execute()
            competitors = comp_response.data

            if not competitors:
                continue

            competitor_ids = [c["id"] for c in competitors]
            competitor_names = [c["name"] for c in competitors]

            # Gather all website changes from the past 7 days
            changes_response = supabase.table("website_changes") \
                .select("*") \
                .in_("competitor_id", competitor_ids) \
                .gte("detected_at", week_start.isoformat()) \
                .execute()

            # Gather all new job postings from the past 7 days
            jobs_response = supabase.table("job_postings") \
                .select("*") \
                .in_("competitor_id", competitor_ids) \
                .eq("is_new", True) \
                .execute()

            # Compile weekly events for the Reduce prompt
            weekly_events = []
            for change in changes_response.data:
                comp_name = next(
                    (c["name"] for c in competitors if c["id"] == change["competitor_id"]),
                    "Unknown",
                )
                weekly_events.append({
                    "competitor": comp_name,
                    "type": "website_change",
                    "severity": change.get("severity", "low"),
                    "summary": change.get("change_summary", ""),
                })

            for job in jobs_response.data:
                comp_name = next(
                    (c["name"] for c in competitors if c["id"] == job["competitor_id"]),
                    "Unknown",
                )
                weekly_events.append({
                    "competitor": comp_name,
                    "type": "new_job_posting",
                    "role": job.get("role", ""),
                    "department": job.get("department", ""),
                })

            if not weekly_events:
                continue

            # Run the Reduce LLM step
            brief = generate_weekly_brief(
                user_company_name=user_name,
                user_description=user_desc,
                competitor_list=competitor_names,
                weekly_events=weekly_events,
            )

            # Store the weekly brief
            supabase.table("weekly_briefs").insert({
                "user_id": user_id,
                "week_start": week_start.isoformat(),
                "bullets": brief.get("bullets", []),
                "swot_analysis": brief.get("swot_analysis", {}),
                "raw_analysis": brief,
            }).execute()

            # Mark jobs as no longer new
            for job in jobs_response.data:
                supabase.table("job_postings") \
                    .update({"is_new": False}) \
                    .eq("id", job["id"]) \
                    .execute()

            results["briefs_generated"] += 1

        except Exception as e:
            logger.error(f"Weekly brief failed for user {user_id}: {e}")

    logger.info(f"Weekly brief generation completed: {results}")
    return results


# ==========================================
# TASK 4: Review Scraper (G2, Trustpilot, Capterra, Reddit)
# ==========================================
@app.task(name="scrape_competitor_reviews", bind=True, max_retries=2, time_limit=3600, soft_time_limit=3500)
def scrape_competitor_reviews(self):
    """
    Scrapes competitor reviews from G2, Trustpilot, Capterra,
    and Reddit mentions for all active competitors.
    """
    from clients import get_all_active_competitors, upsert_reviews
    from review_scraper import (
        scrape_g2_reviews,
        scrape_trustpilot_reviews,
        scrape_capterra_reviews,
        scrape_reddit_mentions,
    )

    competitors = get_all_active_competitors()
    results = {"scraped": 0, "reviews_found": 0, "errors": 0}

    for competitor in competitors:
        competitor_id = competitor["id"]
        competitor_name = competitor["name"]
        domain = competitor.get("domain", "")

        try:
            all_reviews = []
            all_reviews.extend(scrape_g2_reviews(competitor_name, domain))
            all_reviews.extend(scrape_trustpilot_reviews(competitor_name, domain))
            all_reviews.extend(scrape_capterra_reviews(competitor_name))
            all_reviews.extend(scrape_reddit_mentions(competitor_name))

            if all_reviews:
                for r in all_reviews:
                    r["competitor_id"] = competitor_id
                upsert_reviews(all_reviews)
                results["reviews_found"] += len(all_reviews)

            results["scraped"] += 1

        except Exception as e:
            logger.error(f"Review scrape failed for {competitor_name}: {e}")
            results["errors"] += 1

    logger.info(f"Review scrape completed: {results}")
    return results


# ==========================================
# TASK 5: Ad Campaign Scanner
# ==========================================
@app.task(name="scan_competitor_ads", bind=True, max_retries=2, time_limit=1800, soft_time_limit=1700)
def scan_competitor_ads(self):
    """
    Scans Google/Meta/LinkedIn ad libraries for all active competitors.
    """
    from clients import get_all_active_competitors, upsert_ad_campaigns
    from ad_scraper import scan_google_ads, scan_meta_ads, scan_linkedin_ads

    competitors = get_all_active_competitors()
    results = {"scraped": 0, "ads_found": 0, "errors": 0}

    for competitor in competitors:
        competitor_id = competitor["id"]
        competitor_name = competitor["name"]
        domain = competitor.get("domain", "")

        try:
            all_ads = []
            all_ads.extend(scan_google_ads(competitor_name, domain))
            all_ads.extend(scan_meta_ads(competitor_name))
            all_ads.extend(scan_linkedin_ads(competitor_name))

            if all_ads:
                for ad in all_ads:
                    ad["competitor_id"] = competitor_id
                upsert_ad_campaigns(all_ads)
                results["ads_found"] += len(all_ads)

            results["scraped"] += 1

        except Exception as e:
            logger.error(f"Ad scan failed for {competitor_name}: {e}")
            results["errors"] += 1

    logger.info(f"Ad scan completed: {results}")
    return results


# ==========================================
# TASK 6: Pricing Extractor
# ==========================================
@app.task(name="extract_competitor_pricing", bind=True, max_retries=2)
def extract_competitor_pricing(self):
    """
    Fetches pricing pages for all active competitors and runs
    AI pricing extraction to identify pricing tiers.
    """
    from clients import get_all_active_competitors, get_competitor_sites, upsert_pricing_tiers
    from clients.proxy_client import get_proxy_client
    from parser import clean_and_normalize_html
    from pipeline import extract_pricing_tiers

    proxy_client = get_proxy_client()
    if not proxy_client:
        logger.error("ProxyClient not initialized. Skipping pricing extraction.")
        return {"status": "error", "reason": "No proxy client"}

    competitors = get_all_active_competitors()
    results = {"extracted": 0, "errors": 0}

    for competitor in competitors:
        competitor_id = competitor["id"]
        competitor_name = competitor["name"]
        sites = get_competitor_sites(competitor_id)

        pricing_url = None
        for site in sites:
            if site.get("page_type") == "pricing" or "pricing" in site.get("url", "").lower():
                pricing_url = site["url"]
                break

        if not pricing_url:
            logger.debug(f"No pricing URL found for {competitor_name}, skipping")
            continue

        try:
            raw_html = proxy_client.fetch(
                url=pricing_url,
                js_render=True,
                wait_for="[class*='pricing'], table",
            )
            text = clean_and_normalize_html(raw_html, page_type="pricing")
            tiers = extract_pricing_tiers(competitor_name, text)

            if tiers:
                upsert_pricing_tiers(competitor_id, tiers)
                results["extracted"] += 1
                logger.info(f"Extracted {len(tiers)} pricing tiers for {competitor_name}")

        except Exception as e:
            logger.error(f"Pricing extraction failed for {competitor_name}: {e}")
            results["errors"] += 1

    logger.info(f"Pricing extraction completed: {results}")
    return results


# ==========================================
# TASK 7: Weekly Email Digests
# ==========================================
@app.task(name="send_weekly_email_digests", bind=True, max_retries=2)
def send_weekly_email_digests(self):
    """
    Generates and sends HTML email digests to all users who have
    email digests enabled.
    """
    import json
    from clients import get_users_with_email_digest, get_supabase
    from email_digest import generate_digest_html, send_digest

    supabase = get_supabase()
    users = get_users_with_email_digest()
    results = {"sent": 0, "errors": 0}

    for user in users:
        user_id = user["id"]
        user_email = user.get("email", "")

        if not user_email:
            continue

        try:
            brief_resp = supabase.table("weekly_briefs") \
                .select("*") \
                .eq("user_id", user_id) \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()

            if not brief_resp.data:
                logger.debug(f"No brief found for user {user_id}, skipping")
                continue

            brief_data = brief_resp.data[0]
            brief = {
                "bullets": json.loads(brief_data.get("bullets", "[]")),
                "swot_analysis": json.loads(brief_data.get("swot_analysis", "{}")),
            }

            html = generate_digest_html(brief, user)
            success = send_digest(user_email, html)

            if success:
                results["sent"] += 1
            else:
                results["errors"] += 1

        except Exception as e:
            logger.error(f"Email digest failed for user {user_id}: {e}")
            results["errors"] += 1

    logger.info(f"Weekly email digests completed: {results}")
    return results


# ==========================================
# TASK 8: Slack Alert Dispatcher
# ==========================================
@app.task(name="send_slack_alerts", bind=True, max_retries=2)
def send_slack_alerts(self):
    """
    Checks for unread high-severity alerts and sends Slack
    notifications to users who have a slack_webhook_url configured.
    """
    from clients import get_user_slack_webhooks, get_supabase
    from slack_alerter import send_slack_alert

    supabase = get_supabase()
    users = get_user_slack_webhooks()
    results = {"notified": 0, "errors": 0}

    for user in users:
        webhook_url = user.get("slack_webhook_url", "")
        user_id = user["id"]

        if not webhook_url:
            continue

        try:
            alerts_resp = supabase.table("alerts") \
                .select("*, competitors!inner(name)") \
                .eq("user_id", user_id) \
                .eq("read", False) \
                .in_("severity", ["high", "critical"]) \
                .execute()

            for alert in alerts_resp.data:
                competitor_name = alert.get("competitors", {}).get("name", "Unknown")
                success = send_slack_alert(webhook_url, alert, competitor_name)

                if success:
                    supabase.table("alerts") \
                        .update({"read": True}) \
                        .eq("id", alert["id"]) \
                        .execute()
                    results["notified"] += 1

        except Exception as e:
            logger.error(f"Slack alert failed for user {user_id}: {e}")
            results["errors"] += 1

    logger.info(f"Slack alert dispatch completed: {results}")
    return results


# ==========================================
# CELERY BEAT SCHEDULE
# ==========================================
app.conf.beat_schedule = {
    "daily-website-scrape": {
        "task": "scrape_competitor_websites",
        "schedule": crontab(hour=2, minute=0),  # Every day at 2:00 AM UTC
        "args": (),
    },
    "weekly-job-scan": {
        "task": "scan_competitor_jobs",
        "schedule": crontab(hour=3, minute=0, day_of_week=1),  # Every Monday at 3:00 AM UTC
        "args": (),
    },
    "weekly-brief-generation": {
        "task": "run_weekly_brief",
        "schedule": crontab(hour=5, minute=0, day_of_week=0),  # Every Sunday at 5:00 AM UTC
        "args": (),
    },
    "scrape-competitor-reviews": {
        "task": "scrape_competitor_reviews",
        "schedule": crontab(hour=4, minute=0, day_of_week="1,3,5"),  # Mon/Wed/Fri at 4:00 AM UTC
        "args": (),
    },
    "scan-competitor-ads": {
        "task": "scan_competitor_ads",
        "schedule": crontab(hour=4, minute=30, day_of_week="1,3,5"),  # Mon/Wed/Fri at 4:30 AM UTC
        "args": (),
    },
    "extract-competitor-pricing": {
        "task": "extract_competitor_pricing",
        "schedule": crontab(hour=2, minute=30),  # Daily at 2:30 AM UTC
        "args": (),
    },
    "send-weekly-email-digests": {
        "task": "send_weekly_email_digests",
        "schedule": crontab(hour=6, minute=0, day_of_week=1),  # Monday at 6:00 AM UTC
        "args": (),
    },
    "send-slack-alerts": {
        "task": "send_slack_alerts",
        "schedule": crontab(hour="*/2", minute=0),  # Every 2 hours
        "args": (),
    },
}
