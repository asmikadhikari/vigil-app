"""
Vigil Scraping Engine — ZenRows Proxy Client

Provides a clean interface to fetch fully-rendered HTML from any URL
through the ZenRows rotating residential proxy network.

ZenRows handles:
  - Cloudflare / Akamai / PerimeterX / Datadome bypass
  - Residential IP rotation
  - Browser fingerprint spoofing
  - CAPTCHA solving
  - JavaScript rendering (optional)

This means our Celery workers never make direct HTTP requests
to competitor websites — all traffic is routed through ZenRows.
"""

import time
import httpx
from config import ZENROWS_API_KEY, ZENROWS_BASE_URL, REQUEST_DELAY_SECONDS


class ProxyClient:
    """
    Wrapper around the ZenRows scraping proxy API.
    
    Usage:
        client = ProxyClient()
        html = client.fetch("https://competitor.com/pricing", js_render=True)
    """

    def __init__(self):
        if not ZENROWS_API_KEY:
            raise ValueError(
                "Missing ZENROWS_API_KEY. Register at https://zenrows.com "
                "and add your key to the .env file."
            )
        self.api_key = ZENROWS_API_KEY
        self.base_url = ZENROWS_BASE_URL
        self._http = httpx.Client(timeout=60.0)

    def fetch(
        self,
        url: str,
        js_render: bool = True,
        premium_proxy: bool = False,
        wait_for: str | None = None,
        css_extractor: str | None = None,
    ) -> str:
        """
        Fetch the full HTML of a target URL through ZenRows.

        Args:
            url: The target competitor page URL to scrape.
            js_render: If True, ZenRows will execute JavaScript and return
                       the fully rendered DOM. Required for React/Vue/Angular sites.
            premium_proxy: If True, uses premium residential proxies for
                           heavily protected sites (costs more credits).
            wait_for: Optional CSS selector to wait for before returning HTML.
                      Example: "table.pricing" to wait for pricing table to load.
            css_extractor: Optional CSS selector to extract only specific elements.
                           Example: "main, article" to return only main content.

        Returns:
            The raw HTML string of the target page.

        Raises:
            httpx.HTTPStatusError: If ZenRows returns a non-200 status.
        """
        params: dict = {
            "apikey": self.api_key,
            "url": url,
            "js_render": str(js_render).lower(),
        }

        if premium_proxy:
            params["premium_proxy"] = "true"

        if wait_for:
            params["wait_for"] = wait_for

        if css_extractor:
            params["css_extractor"] = css_extractor

        # Politeness delay to avoid hammering the proxy API
        time.sleep(REQUEST_DELAY_SECONDS)

        response = self._http.get(self.base_url, params=params)
        response.raise_for_status()

        return response.text

    def fetch_pricing_page(self, domain: str) -> str:
        """
        Convenience method: fetches the /pricing page of a competitor domain.
        Waits for common pricing table selectors to fully render.
        """
        url = f"https://{domain}/pricing"
        return self.fetch(
            url=url,
            js_render=True,
            wait_for="[class*='pricing'], [id*='pricing'], table",
        )

    def fetch_careers_page(self, domain: str) -> str:
        """
        Convenience method: fetches the /careers or /jobs page of a competitor.
        """
        # Try /careers first, fallback to /jobs
        for path in ["/careers", "/jobs", "/careers/openings"]:
            try:
                url = f"https://{domain}{path}"
                return self.fetch(url=url, js_render=True)
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    continue
                raise
        
        # If no careers page found, return empty
        return ""

    def close(self):
        """Closes the underlying HTTP client."""
        self._http.close()

    def __del__(self):
        self.close()


# Lazy-initialized singleton — avoids crashing imports if ZENROWS_API_KEY is missing
_proxy_client: ProxyClient | None = None


def get_proxy_client() -> ProxyClient | None:
    global _proxy_client
    if _proxy_client is None and ZENROWS_API_KEY:
        _proxy_client = ProxyClient()
    return _proxy_client
