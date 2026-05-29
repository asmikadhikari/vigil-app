"""
Vigil Scraping Engine — CLI Entry Point

Provides a command-line interface to manually trigger individual
scraping tasks for testing and debugging.

Usage:
    python run.py --task website     # Run website monitor once
    python run.py --task jobs        # Run job scanner once
    python run.py --task brief       # Generate weekly brief
    python run.py --task reviews     # Scrape competitor reviews
    python run.py --task ads         # Scan ad campaigns
    python run.py --task pricing     # Extract pricing tiers
    python run.py --task email       # Send email digests
    python run.py --task slack       # Send Slack alerts
    python run.py --task all         # Run all tasks sequentially
"""

import argparse
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("vigil.runner")


def main():
    parser = argparse.ArgumentParser(description="Vigil Scraping Engine CLI")
    parser.add_argument(
        "--task",
        type=str,
        choices=["website", "jobs", "brief", "reviews", "ads", "pricing", "email", "slack", "all"],
        default="all",
        help="Which task to run (default: all)",
    )
    args = parser.parse_args()

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

    logger.info("=" * 60)
    logger.info("  VIGIL SCRAPING ENGINE — Manual Run")
    logger.info("=" * 60)

    task_num = 0
    selected = [t for t in ["website", "jobs", "brief", "reviews", "ads", "pricing", "email", "slack"]
                if args.task in (t, "all")]
    total_tasks = len(selected)

    if args.task in ("website", "all"):
        task_num += 1
        logger.info(f"\n[{task_num}/{total_tasks}] Running website change monitor...")
        result = scrape_competitor_websites()
        logger.info(f"  Result: {result}")

    if args.task in ("jobs", "all"):
        task_num += 1
        logger.info(f"\n[{task_num}/{total_tasks}] Running job posting scanner...")
        result = scan_competitor_jobs()
        logger.info(f"  Result: {result}")

    if args.task in ("brief", "all"):
        task_num += 1
        logger.info(f"\n[{task_num}/{total_tasks}] Running weekly brief generator...")
        result = run_weekly_brief()
        logger.info(f"  Result: {result}")

    if args.task in ("reviews", "all"):
        task_num += 1
        logger.info(f"\n[{task_num}/{total_tasks}] Running review scraper...")
        result = scrape_competitor_reviews()
        logger.info(f"  Result: {result}")

    if args.task in ("ads", "all"):
        task_num += 1
        logger.info(f"\n[{task_num}/{total_tasks}] Running ad campaign scanner...")
        result = scan_competitor_ads()
        logger.info(f"  Result: {result}")

    if args.task in ("pricing", "all"):
        task_num += 1
        logger.info(f"\n[{task_num}/{total_tasks}] Running pricing extractor...")
        result = extract_competitor_pricing()
        logger.info(f"  Result: {result}")

    if args.task in ("email", "all"):
        task_num += 1
        logger.info(f"\n[{task_num}/{total_tasks}] Sending weekly email digests...")
        result = send_weekly_email_digests()
        logger.info(f"  Result: {result}")

    if args.task in ("slack", "all"):
        task_num += 1
        logger.info(f"\n[{task_num}/{total_tasks}] Sending Slack alerts...")
        result = send_slack_alerts()
        logger.info(f"  Result: {result}")

    logger.info("\n" + "=" * 60)
    logger.info("  Run complete.")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
