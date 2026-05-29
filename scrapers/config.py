"""
Vigil Scraping Engine — Configuration Module

Centralizes all environment variable loading, API credentials,
and scraper scheduling parameters.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


# ==========================================
# Supabase Configuration
# ==========================================
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

# ==========================================
# Scraping Proxy Configuration
# ==========================================
ZENROWS_API_KEY: str = os.getenv("ZENROWS_API_KEY", "")
ZENROWS_BASE_URL: str = "https://api.zenrows.com/v1/"

# ==========================================
# SerpAPI Configuration (Google Jobs / Reviews)
# ==========================================
SERPAPI_KEY: str = os.getenv("SERPAPI_KEY", "")

# ==========================================
# LLM Configuration (Groq — free, OpenAI-compatible)
# ==========================================
LLM_API_KEY: str = os.getenv("GROQ_API_KEY", "")
LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
LLM_MODEL: str = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
LLM_MAX_TOKENS: int = 2000

# ==========================================
# Email / Notification Configuration
# ==========================================
RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")

# ==========================================
# Scraper Scheduling Parameters
# ==========================================
# How often (in seconds) each scraper type runs per competitor
SCHEDULE_WEBSITE_MONITOR_INTERVAL: int = 86400      # Every 24 hours
SCHEDULE_JOB_SCANNER_INTERVAL: int = 604800          # Every 7 days
SCHEDULE_REVIEW_SCRAPER_INTERVAL: int = 172800        # Every 48 hours
SCHEDULE_AD_CHECKER_INTERVAL: int = 172800            # Every 48 hours

# ==========================================
# Rate Limiting & Politeness
# ==========================================
REQUEST_DELAY_SECONDS: float = 1.5  # Minimum delay between proxy API calls
MAX_CONCURRENT_SCRAPES: int = 5     # Max parallel Celery tasks per worker
