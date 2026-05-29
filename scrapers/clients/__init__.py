"""
Vigil Scraping Engine — Supabase Client Wrapper

Provides a singleton Supabase admin client using the Service Role key.
This bypasses Row-Level Security (RLS) because background scraper workers
are trusted system operations that need to write data across all tenants.
"""

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY


def get_supabase_client() -> Client:
    """
    Returns a Supabase admin client using the Service Role key.
    
    IMPORTANT: The Service Role key bypasses RLS. This is intentional —
    background workers need to insert scraped data into any user's
    competitor tables without being authenticated as that user.
    
    Never expose this key in client-side code or public repositories.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. "
            "Please check your .env file."
        )
    
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# Lazy-initialized singleton — avoids crashing all imports if env vars are missing
_supabase: Client | None = None


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = get_supabase_client()
    return _supabase


def _get_supabase():
    return get_supabase()


# ==========================================
# Helper Query Functions
# ==========================================

def get_all_active_competitors() -> list[dict]:
    """
    Fetches all competitors with status='tracking' across all users.
    Used by the Celery Beat scheduler to determine which competitors
    need to be scraped in the current cycle.
    """
    response = get_supabase().table("competitors") \
        .select("*, users!inner(company_name, company_url, description)") \
        .eq("status", "tracking") \
        .execute()
    return response.data


def get_competitor_sites(competitor_id: str) -> list[dict]:
    """
    Fetches all tracked page URLs for a given competitor.
    """
    response = get_supabase().table("competitor_sites") \
        .select("*") \
        .eq("competitor_id", competitor_id) \
        .execute()
    return response.data


def upsert_website_change(change_data: dict) -> dict:
    """
    Inserts a new website_changes row when a semantic diff is detected.
    """
    response = get_supabase().table("website_changes") \
        .insert(change_data) \
        .execute()
    return response.data


def update_site_hash(site_id: str, new_hash: str) -> None:
    """
    Updates the last_hash and last_checked_at for a competitor_sites row
    after a successful scrape cycle.
    """
    from datetime import datetime, timezone
    get_supabase().table("competitor_sites") \
        .update({
            "last_hash": new_hash,
            "last_checked_at": datetime.now(timezone.utc).isoformat()
        }) \
        .eq("id", site_id) \
        .execute()


def update_site_snapshot(site_id: str, new_hash: str, normalized_text: str) -> None:
    """
    Stores the latest normalized page snapshot after a successful scrape.

    Keeping the normalized text lets future scrape cycles generate real
    before/after diffs instead of only knowing that a hash changed.
    """
    from datetime import datetime, timezone
    get_supabase().table("competitor_sites") \
        .update({
            "last_hash": new_hash,
            "last_normalized_text": normalized_text,
            "last_checked_at": datetime.now(timezone.utc).isoformat(),
            "last_error": None,
            "consecutive_failures": 0,
        }) \
        .eq("id", site_id) \
        .execute()


def record_site_scrape_error(site_id: str, error_message: str) -> None:
    """
    Records the last scrape failure for dashboard/debug visibility.
    """
    current = get_supabase().table("competitor_sites") \
        .select("consecutive_failures") \
        .eq("id", site_id) \
        .execute()

    failures = 0
    rows = current.data or []
    if rows:
        failures = rows[0].get("consecutive_failures") or 0

    get_supabase().table("competitor_sites") \
        .update({
            "last_error": error_message[:1000],
            "consecutive_failures": failures + 1,
        }) \
        .eq("id", site_id) \
        .execute()


def insert_job_postings(jobs: list[dict]) -> list[dict]:
    """
    Bulk-inserts new job postings discovered via SerpAPI.
    """
    if not jobs:
        return []
    response = get_supabase().table("job_postings") \
        .insert(jobs) \
        .execute()
    return response.data


def insert_alert(alert_data: dict) -> dict:
    """
    Inserts a real-time alert into the alerts table.
    """
    response = get_supabase().table("alerts") \
        .insert(alert_data) \
        .execute()
    return response.data


def get_existing_job_urls(competitor_id: str) -> set[str]:
    """
    Returns a set of already-tracked job posting URLs for deduplication.
    """
    response = get_supabase().table("job_postings") \
        .select("url") \
        .eq("competitor_id", competitor_id) \
        .execute()
    return {row["url"] for row in response.data if row.get("url")}


# ==========================================
# Reviews
# ==========================================

def upsert_reviews(reviews: list[dict]) -> list[dict]:
    """
    Bulk-inserts reviews with dedup by competitor_id + url.
    """
    if not reviews:
        return []
    response = get_supabase().table("reviews") \
        .upsert(reviews, on_conflict="competitor_id,url") \
        .execute()
    return response.data


# ==========================================
# Ad Campaigns
# ==========================================

def upsert_ad_campaigns(ads: list[dict]) -> list[dict]:
    """
    Bulk-inserts ad campaigns with dedup by competitor_id + headline.
    """
    if not ads:
        return []
    response = get_supabase().table("ad_campaigns") \
        .upsert(ads, on_conflict="competitor_id,headline") \
        .execute()
    return response.data


# ==========================================
# Pricing Tiers
# ==========================================

def upsert_pricing_tiers(competitor_id: str, tiers: list[dict]) -> None:
    """
    Replaces all pricing tiers for a competitor.
    Inserts new tiers first, then deletes old rows to prevent data loss on failure.
    """
    new_tiers = [dict(t, competitor_id=competitor_id) for t in tiers]

    inserted_ids = []
    if new_tiers:
        result = get_supabase().table("competitor_pricing") \
            .insert(new_tiers) \
            .execute()
        inserted_ids = [row["id"] for row in (result.data or [])]

    # Delete old rows that aren't the ones we just inserted
    delete_query = get_supabase().table("competitor_pricing") \
        .delete() \
        .eq("competitor_id", competitor_id)
    if inserted_ids:
        delete_query = delete_query.not_.in_("id", inserted_ids)
    delete_query.execute()


# ==========================================
# User Notification Queries
# ==========================================

def get_user_slack_webhooks() -> list[dict]:
    """
    Returns users who have a slack_webhook_url configured.
    """
    response = get_supabase().table("users") \
        .select("id, email, company_name, slack_webhook_url") \
        .not_.is_("slack_webhook_url", "null") \
        .neq("slack_webhook_url", "") \
        .execute()
    return response.data


def get_users_with_email_digest() -> list[dict]:
    """
    Returns users who have email digests enabled.
    """
    response = get_supabase().table("users") \
        .select("id, email, company_name") \
        .eq("email_digest_enabled", True) \
        .execute()
    return response.data
