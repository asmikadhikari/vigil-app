"""
Vigil Scraping Engine — AI Analysis Pipeline (Map-Reduce)

This module contains the LLM prompt orchestration logic.

MAP STEP (Daily):
  - Takes raw scraped delta data for a SINGLE competitor.
  - Produces a structured JSON summary of impactful events.

REDUCE STEP (Weekly):
  - Takes all daily Map summaries for a user's competitors.
  - Produces the executive weekly brief and SWOT analysis.

PRICING EXTRACTION:
  - Takes raw pricing page text.
  - Extracts structured pricing tier JSON via schema-constrained output.
"""

import json
import logging
from openai import OpenAI
from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_MAX_TOKENS

logger = logging.getLogger(__name__)

# Initialize LLM client (Groq — free, OpenAI-compatible API)
client = OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL) if LLM_API_KEY else None


def summarize_website_change(
    competitor_name: str,
    page_type: str,
    diff_text: str,
    user_description: str,
) -> dict:
    """
    MAP STEP: Summarizes a single website change diff into a structured
    impact assessment using GPT-4o-mini.

    Args:
        competitor_name: Name of the competitor.
        page_type: Type of page that changed ('pricing', 'homepage', etc.).
        diff_text: The unified diff markdown showing what changed.
        user_description: The user's company description for contextual analysis.

    Returns:
        Parsed JSON dict with keys: has_impact, severity, category, summary, explanation.
    """
    if not client:
        logger.warning("OpenAI client not initialized. Skipping analysis.")
        return {"has_impact": False, "events": []}

    prompt = f"""You are a competitive intelligence analyst. Below is a detected content change on competitor "{competitor_name}"'s {page_type} page.

Our Company Context: {user_description}

Content Diff:
{diff_text}

Analyze this change and determine if it has strategic impact on our company. 
Respond ONLY in the following JSON format (no markdown, no explanation outside JSON):
{{
  "has_impact": true or false,
  "events": [
    {{
      "category": "pricing" | "product" | "hiring" | "marketing" | "reputation",
      "severity": "info" | "medium" | "high" | "critical",
      "summary": "Short 1-sentence description of the change",
      "explanation": "Why this matters to our company and what it signals about their strategy."
    }}
  ]
}}

If the change is trivial (e.g., copyright year update, minor text fix), set has_impact to false and return an empty events array."""

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are a competitive intelligence analyst. Always respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=LLM_MAX_TOKENS,
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)
        return result

    except Exception as e:
        logger.error(f"OpenAI analysis failed for {competitor_name}: {e}")
        return {"has_impact": False, "events": []}


def extract_pricing_tiers(
    competitor_name: str,
    raw_pricing_text: str,
) -> list[dict]:
    """
    PRICING EXTRACTION: Parses unstructured pricing page text into
    a clean JSON array of pricing tiers using LLM structured output.

    Args:
        competitor_name: Name of the competitor.
        raw_pricing_text: Normalized text extracted from the pricing page.

    Returns:
        List of dicts, each with keys: tier_name, price_monthly, price_yearly, description.
    """
    if not client:
        logger.warning("OpenAI client not initialized. Skipping pricing extraction.")
        return []

    prompt = f"""Extract all pricing tiers from the following {competitor_name} pricing page text.

Pricing Page Content:
{raw_pricing_text[:4000]}

Respond ONLY in the following JSON format (no markdown, no explanation outside JSON):
{{
  "tiers": [
    {{
      "tier_name": "Free",
      "price_monthly": 0,
      "price_yearly": 0,
      "description": "Basic features included"
    }},
    {{
      "tier_name": "Pro",
      "price_monthly": 29.99,
      "price_yearly": 24.99,
      "description": "Advanced features for growing teams"
    }}
  ]
}}

If no pricing information is found, return {{"tiers": []}}."""

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are a data extraction specialist. Always respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=LLM_MAX_TOKENS,
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)
        return result.get("tiers", [])

    except Exception as e:
        logger.error(f"Pricing extraction failed for {competitor_name}: {e}")
        return []


def generate_weekly_brief(
    user_company_name: str,
    user_description: str,
    competitor_list: list[str],
    weekly_events: list[dict],
) -> dict:
    """
    REDUCE STEP: Compiles all daily Map summaries from the past week
    into a single executive intelligence brief and SWOT analysis.

    Args:
        user_company_name: The user's company name.
        user_description: The user's company value proposition.
        competitor_list: List of tracked competitor names.
        weekly_events: List of daily Map summary event dicts.

    Returns:
        Dict with keys: bullets (list), swot_analysis (dict).
    """
    if not client:
        logger.warning("OpenAI client not initialized. Skipping brief generation.")
        return {"bullets": [], "swot_analysis": {}}

    events_text = json.dumps(weekly_events, indent=2)

    prompt = f"""You are an executive competitive intelligence analyst. Review the summarized competitor events collected over the past 7 days.

Company Profile: {user_company_name} — {user_description}
Competitors Monitored: {', '.join(competitor_list)}

Weekly Summarized Events:
{events_text[:6000]}

Generate the weekly intelligence brief. Provide exactly 3 to 5 highly actionable bulletin points, classified by impact, plus a SWOT analysis relative to our positioning.

Respond ONLY in the following JSON format (no markdown, no explanation outside JSON):
{{
  "bullets": [
    {{
      "competitor": "Competitor X",
      "category": "product",
      "summary": "Launched a new native API integration module.",
      "impact": "high",
      "actionable": "Highlight our superior custom webhook features in sales materials."
    }}
  ],
  "swot_analysis": {{
    "strengths": ["We maintain feature X which competitor lacks"],
    "weaknesses": ["Competitor reduced pricing below our entry tier"],
    "opportunities": ["Market complaints reveal integration gaps in competitor's platform"],
    "threats": ["Competitor is aggressively hiring AI researchers, signaling feature drop"]
  }}
}}"""

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are an executive competitive intelligence analyst. Always respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=LLM_MAX_TOKENS,
            temperature=0.4,
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)
        return result

    except Exception as e:
        logger.error(f"Weekly brief generation failed: {e}")
        return {"bullets": [], "swot_analysis": {}}
