"""
Vigil Scraping Engine — FastAPI REST API

Exposes scraping endpoints for the Vigil web application.
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from clients import get_supabase
from scheduler import start_scheduler, stop_scheduler

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Vigil Scraping Engine API",
    version="1.0.0",
    description="REST API for triggering and monitoring competitive intelligence scrapes.",
)

ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",")
if not ALLOWED_ORIGINS or ALLOWED_ORIGINS == [""]:
    ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    logger.info("Starting APScheduler...")
    start_scheduler()


@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down APScheduler...")
    stop_scheduler()


# ==========================================
# Request / Response Models
# ==========================================

class DiscoverRequest(BaseModel):
    company_url: str
    description: str


class DiscoverResponse(BaseModel):
    suggestions: list[dict]


class TriggerRequest(BaseModel):
    competitor_id: str


class TriggerResponse(BaseModel):
    status: str


class StatusResponse(BaseModel):
    healthy: bool
    scrapers: dict
    last_runs: dict


# ==========================================
# Endpoints
# ==========================================

@app.get("/health")
async def health():
    """Simple health check endpoint."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.post("/api/discover", response_model=DiscoverResponse)
async def discover_competitors(request: DiscoverRequest):
    """
    Uses AI to suggest competitor companies based on the user's
    company URL and description.
    """
    if not LLM_API_KEY:
        raise HTTPException(status_code=503, detail="LLM not configured")

    def _call_llm():
        from openai import OpenAI
        client = OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)

        prompt = (
            f"Based on the following company profile, suggest 5-10 direct "
            f"competitors in the same market space.\n\n"
            f"Company URL: {request.company_url}\n"
            f"Company Description: {request.description}\n\n"
            f"Return a JSON array of objects, each with keys: "
            f"'name' (competitor company name), "
            f"'domain' (their website domain without protocol), "
            f"'reason' (why they are a competitor)."
        )

        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are a market research analyst. Always respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=2000,
            temperature=0.5,
            response_format={"type": "json_object"},
        )

        return json.loads(response.choices[0].message.content)

    try:
        result = await asyncio.to_thread(_call_llm)
        suggestions = result if isinstance(result, list) else result.get("competitors", result.get("suggestions", []))

        return DiscoverResponse(suggestions=suggestions)

    except Exception as e:
        logger.error(f"Competitor discovery failed: {e}")
        raise HTTPException(status_code=500, detail=f"Discovery failed: {str(e)}")


@app.post("/api/scrape/trigger", response_model=TriggerResponse)
async def trigger_scrape(request: TriggerRequest):
    """
    Triggers an immediate scrape for all competitors.
    Runs synchronously in the same process (no Celery needed).
    """
    from tasks import scrape_competitor_websites

    competitor_id = request.competitor_id

    comp_response = get_supabase().table("competitors") \
        .select("id") \
        .eq("id", competitor_id) \
        .execute()

    if not comp_response.data:
        raise HTTPException(status_code=404, detail="Competitor not found")

    def _run():
        return scrape_competitor_websites()

    result = await asyncio.to_thread(_run)
    logger.info(f"Manual scrape completed for competitor {competitor_id}: {result}")
    return TriggerResponse(status="completed")


@app.get("/api/status", response_model=StatusResponse)
async def get_status():
    """
    Returns the current health status of the scraping engine.
    """
    from scheduler import scheduler

    scrapers = {
        "website_monitor": {"active": True},
        "job_scanner": {"active": True},
        "review_scraper": {"active": True},
        "ad_scanner": {"active": True},
        "pricing_extractor": {"active": True},
    }

    jobs = scheduler.get_jobs()
    last_runs = {
        "scheduled_jobs": len(jobs),
        "job_ids": [j.id for j in jobs],
    }

    return StatusResponse(
        healthy=True,
        scrapers=scrapers,
        last_runs=last_runs,
    )
