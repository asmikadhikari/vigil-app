"""
Vigil Scraping Engine — Competitor Ad Campaign Monitor

Scrapes advertising data from Google Ads Transparency Center,
Meta Ad Library, and LinkedIn Ads using the ZenRows proxy.
"""

import json
import logging
import re
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from clients.proxy_client import proxy_client

logger = logging.getLogger(__name__)


def _build_ad(competitor_id: str, platform: str, headline: str, body: str,
              cta: str, landing_url: str, launched_at: str | None = None) -> dict:
    """
    Builds a normalized ad campaign dict.
    """
    return {
        "competitor_id": competitor_id,
        "platform": platform,
        "headline": headline[:500] if headline else "",
        "body": body[:2000] if body else "",
        "cta": cta[:200] if cta else "",
        "landing_url": landing_url[:1000] if landing_url else "",
        "launched_at": launched_at or datetime.now(timezone.utc).isoformat(),
    }


def scan_google_ads(competitor_name: str, domain: str) -> list[dict]:
    """
    Scrapes Google Ads Transparency Center for competitor ad campaigns.

    Args:
        competitor_name: Name of the competitor.
        domain: The competitor's website domain.

    Returns:
        List of ad campaign dicts.
    """
    if not proxy_client:
        logger.warning("Proxy not available. Skipping Google Ads scan.")
        return []

    ads = []
    try:
        search_query = domain.replace("https://", "").replace("http://", "").split("/")[0]
        url = f"https://adstransparency.google.com/search?query={search_query}"
        html = proxy_client.fetch(url, js_render=True, wait_for="main")
        soup = BeautifulSoup(html, "lxml")

        cards = soup.select("[class*='ad'], [class*='campaign'], [role='article']")
        if not cards:
            cards = soup.find_all("div", class_=re.compile(r"ad|creative|campaign", re.I))

        for card in cards[:15]:
            try:
                text = card.get_text(separator=" ", strip=True)
                if len(text) < 30:
                    continue

                headline_el = card.select_one("h1, h2, h3, h4, [class*='headline'], [class*='title']")
                headline = headline_el.get_text(strip=True) if headline_el else ""

                body_el = card.select_one("p, [class*='body'], [class*='description'], [class*='text']")
                body = body_el.get_text(strip=True) if body_el else text[:500]

                cta_el = card.select_one("[class*='cta'], [class*='button'], a[href]")
                cta = cta_el.get_text(strip=True) if cta_el else ""

                link_el = card.select_one("a[href]")
                landing_url = ""
                if link_el:
                    landing_url = link_el.get("href", "")

                ads.append(_build_ad(
                    competitor_id="",
                    platform="google_ads",
                    headline=headline,
                    body=body,
                    cta=cta,
                    landing_url=landing_url,
                ))
            except Exception as e:
                logger.debug(f"Error parsing Google ad card: {e}")
                continue

        logger.info(f"Found {len(ads)} Google Ads for {competitor_name}")
    except Exception as e:
        logger.error(f"Google Ads scan failed for {competitor_name}: {e}")

    return ads


def scan_meta_ads(competitor_name: str) -> list[dict]:
    """
    Scrapes Meta Ad Library for competitor ad campaigns.

    Args:
        competitor_name: Name of the competitor to search.

    Returns:
        List of ad campaign dicts.
    """
    if not proxy_client:
        logger.warning("Proxy not available. Skipping Meta Ads scan.")
        return []

    ads = []
    try:
        query = competitor_name.replace(" ", "+")
        url = (
            f"https://www.facebook.com/ads/library/"
            f"?active_status=all&ad_type=all&country=ALL&q={query}"
            f"&sort_data[direction]=desc&sort_data[mode]=relevancy"
        )
        html = proxy_client.fetch(url, js_render=True, wait_for="[class*='ad']")
        soup = BeautifulSoup(html, "lxml")

        cards = soup.select("[class*='ad'], [class*='creative']")
        if not cards:
            cards = soup.find_all("div", class_=re.compile(r"ad|creative|card", re.I))

        for card in cards[:15]:
            try:
                text = card.get_text(separator=" ", strip=True)
                if len(text) < 30:
                    continue

                headline_el = card.select_one("h1, h2, h3, h4, [class*='headline'], [class*='title'], strong")
                headline = headline_el.get_text(strip=True) if headline_el else ""

                body_el = card.select_one("p, [class*='body'], [class*='description'], [class*='message']")
                body = body_el.get_text(strip=True) if body_el else ""

                cta_el = card.select_one("[class*='cta'], [class*='button'], [class*='action']")
                cta = cta_el.get_text(strip=True) if cta_el else ""

                link_el = card.select_one("a[href]")
                landing_url = link_el.get("href", "") if link_el else ""

                ads.append(_build_ad(
                    competitor_id="",
                    platform="meta_ads",
                    headline=headline,
                    body=body,
                    cta=cta,
                    landing_url=landing_url,
                ))
            except Exception as e:
                logger.debug(f"Error parsing Meta ad card: {e}")
                continue

        logger.info(f"Found {len(ads)} Meta Ads for {competitor_name}")
    except Exception as e:
        logger.error(f"Meta Ads scan failed for {competitor_name}: {e}")

    return ads


def scan_linkedin_ads(competitor_name: str) -> list[dict]:
    """
    Scrapes LinkedIn Ad Library for competitor ad campaigns.

    Args:
        competitor_name: Name of the competitor to search.

    Returns:
        List of ad campaign dicts.
    """
    if not proxy_client:
        logger.warning("Proxy not available. Skipping LinkedIn Ads scan.")
        return []

    ads = []
    try:
        query = competitor_name.replace(" ", "%20")
        url = f"https://www.linkedin.com/ad-library/search?keywords={query}"
        html = proxy_client.fetch(url, js_render=True, wait_for="main")
        soup = BeautifulSoup(html, "lxml")

        cards = soup.select("[class*='ad'], [class*='creative'], [class*='sponsored']")
        if not cards:
            cards = soup.find_all("div", class_=re.compile(r"ad|creative|sponsored|card", re.I))

        for card in cards[:15]:
            try:
                text = card.get_text(separator=" ", strip=True)
                if len(text) < 30:
                    continue

                headline_el = card.select_one("h1, h2, h3, h4, [class*='headline'], [class*='title']")
                headline = headline_el.get_text(strip=True) if headline_el else ""

                body_el = card.select_one("p, [class*='body'], [class*='description'], [class*='text']")
                body = body_el.get_text(strip=True) if body_el else ""

                cta_el = card.select_one("[class*='cta'], [class*='button'], [class*='action']")
                cta = cta_el.get_text(strip=True) if cta_el else ""

                link_el = card.select_one("a[href]")
                landing_url = link_el.get("href", "") if link_el else ""

                ads.append(_build_ad(
                    competitor_id="",
                    platform="linkedin_ads",
                    headline=headline,
                    body=body,
                    cta=cta,
                    landing_url=landing_url,
                ))
            except Exception as e:
                logger.debug(f"Error parsing LinkedIn ad card: {e}")
                continue

        logger.info(f"Found {len(ads)} LinkedIn Ads for {competitor_name}")
    except Exception as e:
        logger.error(f"LinkedIn Ads scan failed for {competitor_name}: {e}")

    return ads
