"""
Vigil Scraping Engine — Task Functions

All 8 scraping tasks as plain async/sync functions.
Scheduled by APScheduler in scheduler.py.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta

import httpx
from config import SERPAPI_KEY

logger = logging.getLogger(__name__)


# ==========================================
# TASK 1: Website Change Monitor
# ==========================================
def scrape_competitor_websites():
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

                if proxy_client:
                    raw_html = proxy_client.fetch(
                        url=url,
                        js_render=scrape_config.get("js_render", True),
                        premium_proxy=scrape_config.get("premium_proxy", False),
                        wait_for=scrape_config.get("wait_for"),
                        css_extractor=scrape_config.get("css_extractor"),
                    )
                else:
                    response = httpx.get(url, timeout=30.0, follow_redirects=True)
                    response.raise_for_status()
                    raw_html = response.text

                normalized_text = clean_and_normalize_html(raw_html, page_type)

                if not normalized_text.strip():
                    logger.warning(f"Empty content after normalization: {url}")
                    record_site_scrape_error(site_id, "Empty content after normalization")
                    continue

                if len(normalized_text) < scrape_config.get("min_content_length", 80):
                    message = f"Normalized content too short ({len(normalized_text)} chars)"
                    logger.warning(f"{message}: {url}")
                    record_site_scrape_error(site_id, message)
                    continue

                if not previous_hash or not previous_text:
                    new_hash = compute_content_hash(normalized_text)
                    update_site_snapshot(site_id, new_hash, normalized_text)
                    results["scraped"] += 1
                    continue

                has_changed, current_hash, diff_text = detect_changes(
                    previous_text, normalized_text,
                )

                if not has_changed:
                    update_site_snapshot(site_id, current_hash, normalized_text)
                    results["scraped"] += 1
                    continue

                if len(diff_text) > 12000:
                    diff_text = diff_text[:12000] + "\n\n[Diff truncated]"

                analysis = summarize_website_change(
                    competitor_name=competitor_name,
                    page_type=page_type,
                    diff_text=diff_text,
                    user_description=user_desc,
                )

                severity = "low"
                if analysis.get("has_impact") and analysis.get("events"):
                    severities = [e.get("severity", "info") for e in analysis["events"]]
                    if "critical" in severities or "high" in severities:
                        severity = "high"
                    elif "medium" in severities:
                        severity = "medium"

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

                update_site_snapshot(site_id, current_hash, normalized_text)

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
def scan_competitor_jobs():
    from clients import get_all_active_competitors, insert_job_postings, get_existing_job_urls

    if not SERPAPI_KEY:
        logger.error("SERPAPI_KEY not set. Skipping job scan.")
        return {"status": "error", "reason": "No SerpAPI key"}

    competitors = get_all_active_competitors()
    results = {"scanned": 0, "new_jobs": 0}

    for competitor in competitors:
        competitor_id = competitor["id"]
        competitor_name = competitor["name"]

        try:
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

                title = job.get("title", "")
                department = _classify_department(title)

                new_jobs.append({
                    "competitor_id": competitor_id,
                    "role": title,
                    "department": department,
                    "url": job_url,
                    "posted_at": None,
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


def _classify_department(job_title: str) -> str:
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
def run_weekly_brief():
    from clients import get_supabase
    from pipeline import generate_weekly_brief

    supabase = get_supabase()
    users_response = supabase.table("users").select("*").execute()
    users = users_response.data
    results = {"briefs_generated": 0}

    week_start = (datetime.now(timezone.utc) - timedelta(days=7)).date()

    for user in users:
        user_id = user["id"]
        user_name = user.get("company_name", "Unknown")
        user_desc = user.get("description", "")

        try:
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

            changes_response = supabase.table("website_changes") \
                .select("*") \
                .in_("competitor_id", competitor_ids) \
                .gte("detected_at", week_start.isoformat()) \
                .execute()

            jobs_response = supabase.table("job_postings") \
                .select("*") \
                .in_("competitor_id", competitor_ids) \
                .eq("is_new", True) \
                .execute()

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

            brief = generate_weekly_brief(
                user_company_name=user_name,
                user_description=user_desc,
                competitor_list=competitor_names,
                weekly_events=weekly_events,
            )

            supabase.table("weekly_briefs").insert({
                "user_id": user_id,
                "week_start": week_start.isoformat(),
                "bullets": brief.get("bullets", []),
                "swot_analysis": brief.get("swot_analysis", {}),
                "raw_analysis": brief,
            }).execute()

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
# TASK 4: Review Scraper
# ==========================================
def scrape_competitor_reviews():
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
def scan_competitor_ads():
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
def extract_competitor_pricing():
    from clients import get_all_active_competitors, get_competitor_sites, upsert_pricing_tiers
    from clients.proxy_client import get_proxy_client
    from parser import clean_and_normalize_html
    from pipeline import extract_pricing_tiers

    proxy_client = get_proxy_client()
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
            continue

        try:
            if proxy_client:
                raw_html = proxy_client.fetch(
                    url=pricing_url, js_render=True,
                    wait_for="[class*='pricing'], table",
                )
            else:
                response = httpx.get(pricing_url, timeout=30.0, follow_redirects=True)
                response.raise_for_status()
                raw_html = response.text

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
def send_weekly_email_digests():
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
def send_slack_alerts():
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
