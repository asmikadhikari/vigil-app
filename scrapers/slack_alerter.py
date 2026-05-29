"""
Vigil Scraping Engine — Slack Alert Notifier

Sends real-time high-severity alerts and weekly intelligence briefs
to Slack via Incoming Webhooks using Slack's Block Kit.
"""

import logging
import httpx

logger = logging.getLogger(__name__)

SEVERITY_COLORS = {
    "critical": "#e53e3e",
    "high": "#dd6b20",
    "medium": "#d69e2e",
    "info": "#3182ce",
    "low": "#718096",
}


def _to_unix_ts(iso_str: str) -> str:
    """Convert an ISO datetime string to a Unix timestamp string for Slack."""
    if not iso_str:
        return ""
    try:
        from datetime import datetime, timezone
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return str(int(dt.timestamp()))
    except Exception:
        return ""


def send_slack_alert(webhook_url: str, alert: dict, competitor_name: str) -> bool:
    """
    Sends a single high-severity alert to Slack as a formatted message block.

    Args:
        webhook_url: Slack Incoming Webhook URL.
        alert: Alert dict with keys: title, body, severity, category, source_type.
        competitor_name: Name of the competitor the alert is about.

    Returns:
        True if sent successfully, False otherwise.
    """
    severity = alert.get("severity", "info")
    color = SEVERITY_COLORS.get(severity, "#718096")

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"🚨 {competitor_name} — {alert.get('title', 'Alert')}",
            },
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Severity:*\n{severity.upper()}"},
                {"type": "mrkdwn", "text": f"*Category:*\n{alert.get('category', 'N/A')}"},
            ],
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": alert.get("body", "No details provided."),
            },
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"Source: {alert.get('source_type', 'unknown')}",
                }
            ],
        },
    ]

    payload = {
        "attachments": [
            {
                "color": color,
                "blocks": blocks,
                "ts": _to_unix_ts(alert.get("detected_at", "")),
            }
        ]
    }

    try:
        response = httpx.post(webhook_url, json=payload, timeout=15.0)
        response.raise_for_status()
        logger.info(f"Slack alert sent for {competitor_name} ({severity})")
        return True

    except Exception as e:
        logger.error(f"Failed to send Slack alert for {competitor_name}: {e}")
        return False


def send_slack_weekly_brief(webhook_url: str, brief: dict, user_company: str) -> bool:
    """
    Sends a formatted weekly intelligence brief to Slack.

    Args:
        webhook_url: Slack Incoming Webhook URL.
        brief: Brief dict with 'bullets' list and 'swot_analysis' dict.
        user_company: The user's company name.

    Returns:
        True if sent successfully, False otherwise.
    """
    bullets = brief.get("bullets", [])
    swot = brief.get("swot_analysis", {})

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"📊 Weekly Intelligence Brief — {user_company}",
            },
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Executive Summary*",
            },
        },
    ]

    if bullets:
        for bullet in bullets[:5]:
            impact_icon = {
                "critical": "🔴",
                "high": "🟠",
                "medium": "🟡",
                "low": "🟢",
            }.get(bullet.get("impact", "low"), "⚪")
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"{impact_icon} *{bullet.get('competitor', 'Unknown')}* — "
                        f"{bullet.get('summary', '')}\n"
                        f"   _Action: {bullet.get('actionable', 'N/A')}_"
                    ),
                },
            })
    else:
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "No significant competitor events detected this week.",
            },
        })

    if any(swot.get(k) for k in ("strengths", "weaknesses", "opportunities", "threats")):
        blocks.append({"type": "divider"})
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": "*SWOT Analysis*"},
        })
        swot_text = ""
        for label, key in [("Strengths", "strengths"), ("Weaknesses", "weaknesses"),
                           ("Opportunities", "opportunities"), ("Threats", "threats")]:
            items = swot.get(key, [])
            if items:
                swot_text += f"*{label}:*\n"
                for item in items[:3]:
                    swot_text += f"• {item}\n"
                swot_text += "\n"
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": swot_text.strip()},
        })

    blocks.append({"type": "divider"})
    blocks.append({
        "type": "context",
        "elements": [
            {
                "type": "mrkdwn",
                "text": "Automatically generated by *Vigil* — your AI competitive intelligence engine.",
            }
        ],
    })

    payload = {"blocks": blocks}

    try:
        response = httpx.post(webhook_url, json=payload, timeout=15.0)
        response.raise_for_status()
        logger.info(f"Slack weekly brief sent to {user_company}")
        return True

    except Exception as e:
        logger.error(f"Failed to send Slack weekly brief: {e}")
        return False
