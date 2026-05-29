"""
Vigil Scraping Engine — HTML DOM Normalizer & Semantic Change Detector

This module is the core noise-filtration layer. It processes raw HTML
returned by the proxy client and strips out all non-essential dynamic
elements (footers, headers, chatbots, cookie banners, scripts, styles)
to extract only the meaningful structural content of a page.

The normalized text is then hashed (MD5) for fast comparison against
the previously stored hash. If a change is detected, a clean unified
diff is generated for the LLM summarization pipeline.
"""

import difflib
import hashlib
import re
from bs4 import BeautifulSoup


# CSS selectors for common dynamic noise elements to strip
NOISE_SELECTORS = [
    # Cookie consent & privacy
    ".cookie-banner", "#cookie-consent", ".cookie-notice",
    "[class*='cookie']", "[id*='cookie']", "[class*='consent']",
    # Chat widgets
    ".chatbot", "[class*='chat-widget']", "[id*='intercom']",
    "[id*='drift']", "[id*='hubspot']", "[class*='livechat']",
    # Modals & popups
    ".modal", ".popup", "[class*='modal']", "[class*='popup']",
    "[class*='overlay']",
    # Advertising containers
    ".ad-container", "[class*='advertisement']", "[id*='google_ads']",
    # Social proof / dynamic counters
    "[class*='social-proof']", "[class*='visitor-count']",
    # Newsletter signup widgets
    "[class*='newsletter']", "[class*='subscribe']",
    # Often volatile personalization or A/B testing wrappers
    "[class*='ab-test']", "[id*='ab-test']", "[class*='personalized']",
]

# HTML tags that are purely structural noise
NOISE_TAGS = [
    "script", "style", "noscript", "iframe", "svg",
    "header", "footer", "nav", "aside",
]

# Page-type-specific content selectors
PAGE_TYPE_SELECTORS = {
    "pricing": [
        "[class*='pricing']", "[id*='pricing']",
        "[class*='plan']", "[id*='plan']",
        "table", ".price-card", ".tier",
    ],
    "careers": [
        "[class*='job']", "[id*='job']",
        "[class*='career']", "[id*='career']",
        "[class*='opening']", "[class*='position']",
        ".role", ".listing",
    ],
    "homepage": [
        "main", "article", "[role='main']",
        ".hero", "[class*='hero']",
        "[class*='feature']", "[class*='benefit']",
    ],
    "blog": [
        "article", "main", ".post", ".blog-post",
        "[class*='article']", "[class*='post']",
    ],
    "product": [
        "main", "[class*='product']", "[class*='feature']",
        "[class*='integration']", "[class*='solution']",
    ],
}


def _stable_text_lines(text: str) -> list[str]:
    """
    Converts extracted text into stable lines for useful diffs.
    """
    lines = []
    for line in text.splitlines():
        cleaned = " ".join(line.split())
        if not cleaned:
            continue

        # Reduce common volatile values without hiding strategic content.
        cleaned = re.sub(r"\b\d{1,2}:\d{2}\s?(AM|PM|am|pm)?\b", "<time>", cleaned)
        cleaned = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", "<date>", cleaned)
        lines.append(cleaned)
    return lines


def clean_and_normalize_html(raw_html: str, page_type: str = "homepage") -> str:
    """
    Strips noise from raw HTML and extracts normalized plain text
    from the semantically meaningful portions of the page.

    Args:
        raw_html: Full HTML string returned by the proxy scraper.
        page_type: One of 'homepage', 'pricing', 'careers', 'blog', 'product'.
                   Determines which DOM selectors to prioritize.

    Returns:
        Normalized, whitespace-collapsed plain text string.
    """
    soup = BeautifulSoup(raw_html, "lxml")

    # Step 1: Remove all noise HTML tags entirely
    for tag in NOISE_TAGS:
        for element in soup.find_all(tag):
            element.decompose()

    # Step 2: Remove dynamic widget blocks by CSS selector
    for selector in NOISE_SELECTORS:
        for element in soup.select(selector):
            element.decompose()

    # Step 3: Attempt to extract page-type-specific content blocks
    primary_lines: list[str] = []
    selectors = PAGE_TYPE_SELECTORS.get(page_type, PAGE_TYPE_SELECTORS["homepage"])

    for selector in selectors:
        blocks = soup.select(selector)
        if blocks:
            primary_lines = []
            for block in blocks:
                text = block.get_text(separator="\n", strip=True)
                primary_lines.extend(_stable_text_lines(text))
            if primary_lines:
                break

    # Step 4: Fallback to generic main content extraction
    if not primary_lines:
        main_tag = (
            soup.find("main")
            or soup.find("article")
            or soup.select_one("[role='main']")
            or soup.find("body")
        )
        if main_tag:
            primary_lines = _stable_text_lines(main_tag.get_text(separator="\n", strip=True))

    # Step 5: De-duplicate adjacent repeated lines from nested selectors.
    normalized_lines = []
    for line in primary_lines:
        if normalized_lines and normalized_lines[-1] == line:
            continue
        normalized_lines.append(line)

    return "\n".join(normalized_lines)


def compute_content_hash(text: str) -> str:
    """
    Generates an MD5 hash of normalized text for fast equality comparison.
    """
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def detect_changes(
    previous_text: str,
    current_text: str,
) -> tuple[bool, str, str]:
    """
    Compares two normalized text snapshots and determines if a
    meaningful change has occurred.

    Args:
        previous_text: The last stored normalized text snapshot.
        current_text: The freshly scraped and normalized text.

    Returns:
        A tuple of (has_changed, new_hash, diff_markdown):
        - has_changed: Boolean indicating if content differs.
        - new_hash: MD5 hash of the current text.
        - diff_markdown: A clean unified diff string (empty if no change).
    """
    prev_hash = compute_content_hash(previous_text)
    curr_hash = compute_content_hash(current_text)

    if prev_hash == curr_hash:
        return False, curr_hash, ""

    # Generate a clean unified diff for the LLM to summarize
    diff_lines = difflib.unified_diff(
        previous_text.splitlines(),
        current_text.splitlines(),
        fromfile="previous_snapshot",
        tofile="current_snapshot",
        lineterm="",
        n=3,  # 3 lines of context around changes
    )
    diff_markdown = "\n".join(diff_lines)

    return True, curr_hash, diff_markdown


def extract_text_by_selector(raw_html: str, css_selector: str) -> str:
    """
    Utility: Extract text from specific CSS selectors in raw HTML.
    Useful for targeted extraction (e.g., pricing tables only).
    """
    soup = BeautifulSoup(raw_html, "lxml")
    blocks = soup.select(css_selector)
    if not blocks:
        return ""
    return "\n".join(
        block.get_text(separator=" ", strip=True) for block in blocks
    )
