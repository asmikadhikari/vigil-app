"""
Vigil Scraping Engine — APScheduler Scheduler

Replaces Celery Beat. Runs inside the same process as the FastAPI server.
All 8 tasks from tasks.py are scheduled via APScheduler.
"""

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from tasks import (
    scrape_competitor_websites,
    scan_competitor_jobs,
    run_weekly_brief,
    scrape_competitor_reviews,
    scan_competitor_ads,
    extract_competitor_pricing,
    send_weekly_email_digests,
    send_slack_alerts,
)

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(daemon=True)


def start_scheduler():
    if scheduler.running:
        return

    # TASK 1: Daily website scrape at 2:00 AM UTC
    scheduler.add_job(
        scrape_competitor_websites,
        CronTrigger(hour=2, minute=0),
        id="daily_website_scrape",
        name="Daily website scrape",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # TASK 2: Weekly job scan — Monday 3:00 AM UTC
    scheduler.add_job(
        scan_competitor_jobs,
        CronTrigger(hour=3, minute=0, day_of_week=1),
        id="weekly_job_scan",
        name="Weekly job scan",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # TASK 3: Weekly brief generation — Sunday 5:00 AM UTC
    scheduler.add_job(
        run_weekly_brief,
        CronTrigger(hour=5, minute=0, day_of_week=0),
        id="weekly_brief_generation",
        name="Weekly brief generation",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # TASK 4: Review scraper — Mon/Wed/Fri 4:00 AM UTC
    scheduler.add_job(
        scrape_competitor_reviews,
        CronTrigger(hour=4, minute=0, day_of_week="1,3,5"),
        id="scrape_competitor_reviews",
        name="Scrape competitor reviews",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # TASK 5: Ad scanner — Mon/Wed/Fri 4:30 AM UTC
    scheduler.add_job(
        scan_competitor_ads,
        CronTrigger(hour=4, minute=30, day_of_week="1,3,5"),
        id="scan_competitor_ads",
        name="Scan competitor ads",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # TASK 6: Pricing extraction — Daily 2:30 AM UTC
    scheduler.add_job(
        extract_competitor_pricing,
        CronTrigger(hour=2, minute=30),
        id="extract_competitor_pricing",
        name="Extract competitor pricing",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # TASK 7: Weekly email digests — Monday 6:00 AM UTC
    scheduler.add_job(
        send_weekly_email_digests,
        CronTrigger(hour=6, minute=0, day_of_week=1),
        id="send_weekly_email_digests",
        name="Send weekly email digests",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # TASK 8: Slack alerts — Every 2 hours
    scheduler.add_job(
        send_slack_alerts,
        CronTrigger(hour="*/2", minute=0),
        id="send_slack_alerts",
        name="Send Slack alerts",
        replace_existing=True,
        misfire_grace_time=1800,
    )

    scheduler.start()
    logger.info("APScheduler started with all 8 scheduled tasks")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler shut down")
