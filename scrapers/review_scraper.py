"""
Vigil Scraping Engine — Competitor Review Scraper

Scrapes reviews and social mentions from G2, Trustpilot, Capterra,
and Reddit using the ZenRows proxy and SerpAPI.
"""

import json
import logging
import re
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from clients.proxy_client import proxy_client
from config import SERPAPI_KEY

logger = logging.getLogger(__name__)


def _analyze_sentiment(text: str) -> str:
    """
    Simple keyword-based sentiment classifier.
    """
    if not text:
        return "neutral"
    words = set(text.lower().split())
    positive = {
        "great", "amazing", "excellent", "love", "best", "fantastic",
        "wonderful", "awesome", "perfect", "brilliant", "outstanding",
        "superb", "impressive", "exceptional", "incredible", "remarkable",
    }
    negative = {
        "terrible", "awful", "horrible", "worst", "bad", "poor", "hate",
        "dreadful", "disappointing", "mediocre", "useless", "frustrating",
        "pathetic", "abysmal", "atrocious", "appalling",
    }
    pos_count = len(words & positive)
    neg_count = len(words & negative)
    if pos_count > neg_count:
        return "positive"
    if neg_count > pos_count:
        return "negative"
    return "neutral"


def _build_review(
    competitor_id: str,
    source: str,
    rating: float | None,
    title: str,
    snippet: str,
    author: str,
    date: str,
    url: str,
) -> dict:
    """
    Builds a normalized review dict from parsed fields.
    """
    return {
        "competitor_id": competitor_id,
        "source": source,
        "rating": rating,
        "title": title[:500] if title else "",
        "snippet": snippet[:2000] if snippet else "",
        "sentiment": _analyze_sentiment(f"{title} {snippet}"),
        "author": author[:200] if author else "",
        "date": date,
        "url": url[:1000] if url else "",
    }


def scrape_g2_reviews(competitor_name: str, domain: str) -> list[dict]:
    """
    Scrapes G2 reviews for a competitor via the ZenRows proxy.

    Args:
        competitor_name: Name of the competitor.
        domain: G2 product slug (e.g., 'competitor-name').

    Returns:
        List of review dicts.
    """
    if not proxy_client:
        logger.warning("Proxy not available. Skipping G2 review scrape.")
        return []

    reviews = []
    try:
        url = f"https://www.g2.com/products/{domain}/reviews"
        html = proxy_client.fetch(url, js_render=True, wait_for="[class*='review']")
        soup = BeautifulSoup(html, "lxml")

        cards = soup.select("[class*='review']") or soup.select("[class*='paper']")
        if not cards:
            cards = soup.find_all("div", class_=re.compile(r"review|paper", re.I))

        for card in cards[:20]:
            try:
                text_block = card.get_text(separator=" ", strip=True)
                if len(text_block) < 20:
                    continue

                rating_el = card.select_one("[class*='star'], [class*='rating'], [class*='score']")
                rating = None
                if rating_el:
                    rating_text = rating_el.get_text(strip=True)
                    rating_match = re.search(r"([\d.]+)\s*/\s*5", rating_text)
                    if rating_match:
                        rating = float(rating_match.group(1))

                title_el = card.select_one("h2, h3, h4, [class*='title'], [class*='heading']")
                title = title_el.get_text(strip=True) if title_el else ""

                snippet_el = card.select_one("p, [class*='description'], [class*='text'], [class*='content']")
                snippet = snippet_el.get_text(strip=True) if snippet_el else ""

                author_el = card.select_one("[class*='author'], [class*='user'], [class*='name']")
                author = author_el.get_text(strip=True) if author_el else ""

                date_el = card.select_one("time, [class*='date'], [class*='time']")
                date = date_el.get("datetime", "") if date_el else ""
                if not date and date_el:
                    date = date_el.get_text(strip=True)

                reviews.append(_build_review(
                    competitor_id="",
                    source="g2",
                    rating=rating,
                    title=title,
                    snippet=snippet,
                    author=author,
                    date=date,
                    url=url,
                ))
            except Exception as e:
                logger.debug(f"Error parsing G2 review card: {e}")
                continue

        logger.info(f"Found {len(reviews)} G2 reviews for {competitor_name}")
    except Exception as e:
        logger.error(f"G2 review scrape failed for {competitor_name}: {e}")

    return reviews


def scrape_trustpilot_reviews(competitor_name: str, domain: str) -> list[dict]:
    """
    Scrapes Trustpilot reviews for a competitor via ZenRows proxy.

    Args:
        competitor_name: Name of the competitor.
        domain: Website domain (e.g., 'competitor.com').

    Returns:
        List of review dicts.
    """
    if not proxy_client:
        logger.warning("Proxy not available. Skipping Trustpilot review scrape.")
        return []

    reviews = []
    try:
        url = f"https://www.trustpilot.com/review/{domain}"
        html = proxy_client.fetch(url, js_render=True, wait_for="[class*='review']")
        soup = BeautifulSoup(html, "lxml")

        cards = soup.select("[class*='reviewCard']") or soup.select("[class*='paper']")
        if not cards:
            cards = soup.find_all("div", class_=re.compile(r"review|card", re.I))

        for card in cards[:20]:
            try:
                text_block = card.get_text(separator=" ", strip=True)
                if len(text_block) < 20:
                    continue

                rating_el = card.select_one("[class*='star'], [class*='rating']")
                rating = None
                if rating_el:
                    rating_text = rating_el.get("alt", "") or rating_el.get("title", "") or rating_el.get_text(strip=True)
                    rating_match = re.search(r"([\d.]+)", rating_text)
                    if rating_match:
                        rating = float(rating_match.group(1))

                title_el = card.select_one("h2, h3, h4, [class*='title']")
                title = title_el.get_text(strip=True) if title_el else ""

                snippet_el = card.select_one("p, [class*='content'], [class*='text']")
                snippet = snippet_el.get_text(strip=True) if snippet_el else ""

                author_el = card.select_one("[class*='author'], [class*='user'], [class*='name']")
                author = author_el.get_text(strip=True) if author_el else ""

                date_el = card.select_one("time, [class*='date']")
                date = date_el.get("datetime", "") if date_el else ""
                if not date and date_el:
                    date = date_el.get_text(strip=True)

                reviews.append(_build_review(
                    competitor_id="",
                    source="trustpilot",
                    rating=rating,
                    title=title,
                    snippet=snippet,
                    author=author,
                    date=date,
                    url=url,
                ))
            except Exception as e:
                logger.debug(f"Error parsing Trustpilot review card: {e}")
                continue

        logger.info(f"Found {len(reviews)} Trustpilot reviews for {competitor_name}")
    except Exception as e:
        logger.error(f"Trustpilot review scrape failed for {competitor_name}: {e}")

    return reviews


def scrape_capterra_reviews(competitor_name: str) -> list[dict]:
    """
    Scrapes Capterra reviews for a competitor via ZenRows proxy.

    Args:
        competitor_name: Name of the competitor (used to construct slug).

    Returns:
        List of review dicts.
    """
    if not proxy_client:
        logger.warning("Proxy not available. Skipping Capterra review scrape.")
        return []

    reviews = []
    slug = competitor_name.lower().replace(" ", "-").replace("'", "")
    try:
        url = f"https://www.capterra.com/p/{slug}/reviews"
        html = proxy_client.fetch(url, js_render=True)
        soup = BeautifulSoup(html, "lxml")

        cards = soup.select("[class*='review'], [class*='testimonial']")
        if not cards:
            cards = soup.find_all("div", class_=re.compile(r"review|testimonial", re.I))

        for card in cards[:20]:
            try:
                text_block = card.get_text(separator=" ", strip=True)
                if len(text_block) < 20:
                    continue

                rating_el = card.select_one("[class*='star'], [class*='rating']")
                rating = None
                if rating_el:
                    rating_match = re.search(r"([\d.]+)", rating_el.get_text(strip=True))
                    if rating_match:
                        rating = float(rating_match.group(1))

                title_el = card.select_one("h2, h3, h4, [class*='title'], [class*='heading']")
                title = title_el.get_text(strip=True) if title_el else ""

                snippet_el = card.select_one("p, [class*='description'], [class*='text']")
                snippet = snippet_el.get_text(strip=True) if snippet_el else ""

                author_el = card.select_one("[class*='author'], [class*='user'], [class*='name']")
                author = author_el.get_text(strip=True) if author_el else ""

                date_el = card.select_one("time, [class*='date']")
                date = date_el.get("datetime", "") if date_el else ""
                if not date and date_el:
                    date = date_el.get_text(strip=True)

                reviews.append(_build_review(
                    competitor_id="",
                    source="capterra",
                    rating=rating,
                    title=title,
                    snippet=snippet,
                    author=author,
                    date=date,
                    url=url,
                ))
            except Exception as e:
                logger.debug(f"Error parsing Capterra review card: {e}")
                continue

        logger.info(f"Found {len(reviews)} Capterra reviews for {competitor_name}")
    except Exception as e:
        logger.debug(f"Capterra scrape failed for {competitor_name} (may not exist): {e}")

    return reviews


def scrape_reddit_mentions(competitor_name: str) -> list[dict]:
    """
    Searches Reddit for competitor mentions via SerpAPI.

    Args:
        competitor_name: Name of the competitor to search for.

    Returns:
        List of mention dicts.
    """
    if not SERPAPI_KEY:
        logger.warning("SERPAPI_KEY not set. Skipping Reddit mention scrape.")
        return []

    import httpx
    mentions = []
    try:
        response = httpx.get(
            "https://serpapi.com/search.json",
            params={
                "engine": "google",
                "q": f"site:reddit.com {competitor_name} review",
                "api_key": SERPAPI_KEY,
                "num": 20,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()

        organic = data.get("organic_results", [])
        for result in organic:
            title = result.get("title", "")
            snippet = result.get("snippet", "")
            link = result.get("link", "")

            if not title and not snippet:
                continue

            mentions.append(_build_review(
                competitor_id="",
                source="reddit",
                rating=None,
                title=title,
                snippet=snippet,
                author="",
                date="",
                url=link,
            ))

        logger.info(f"Found {len(mentions)} Reddit mentions for {competitor_name}")
    except Exception as e:
        logger.error(f"Reddit mention scrape failed for {competitor_name}: {e}")

    return mentions
