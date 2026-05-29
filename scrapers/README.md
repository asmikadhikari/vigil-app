# Vigil Scraping Engine

Python-based competitive intelligence data pipeline using Celery workers, ZenRows proxy evasion, and SerpAPI structured search.

## Setup

```bash
cd scrapers
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
ZENROWS_API_KEY=your-zenrows-key
SERPAPI_KEY=your-serpapi-key
OPENAI_API_KEY=your-openai-key
REDIS_URL=redis://localhost:6379/0
```

## Running

```bash
# Start Redis (required for Celery)
# Use Docker: docker run -d -p 6379:6379 redis:alpine

# Start Celery worker
celery -A celery_app worker --loglevel=info

# Start Celery Beat scheduler
celery -A celery_app beat --loglevel=info

# Run a single test scrape
python run.py --test --competitor "example.com"
```
