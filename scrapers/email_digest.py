"""
Vigil Scraping Engine — Weekly Email Digest Generator

Generates beautiful HTML email digests using Jinja2 templates
and sends them via the Resend API.
"""

import logging
from jinja2 import Environment, select_autoescape
import httpx
from config import RESEND_API_KEY

logger = logging.getLogger(__name__)

_env = Environment(autoescape=select_autoescape(["html"]))
DIGEST_TEMPLATE = _env.from_string("""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{{ company_name }} — Weekly Intelligence Brief</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr>
    <td style="padding:32px 40px;background:linear-gradient(135deg,#1a1a2e,#16213e);">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">{{ company_name }} — Weekly Intelligence Brief</h1>
      <p style="margin:8px 0 0;color:#a0aec0;font-size:14px;">Week of {{ week_start }} &middot; Powered by Vigil</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 40px;">
      <h2 style="margin:0 0 20px;color:#1a202c;font-size:18px;font-weight:600;">Executive Summary</h2>
      {% if bullets %}
        {% for bullet in bullets %}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border-radius:8px;border-left:4px solid {{ '#e53e3e' if bullet.impact == 'critical' else '#dd6b20' if bullet.impact == 'high' else '#d69e2e' if bullet.impact == 'medium' else '#38a169' }};background:#f7fafc;">
        <tr><td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;background:{{ '#fed7d7' if bullet.impact == 'critical' else '#feebc8' if bullet.impact == 'high' else '#fefcbf' if bullet.impact == 'medium' else '#c6f6d5' }};color:{{ '#c53030' if bullet.impact == 'critical' else '#c05621' if bullet.impact == 'high' else '#975a16' if bullet.impact == 'medium' else '#276749' }};">{{ bullet.impact }}</span></td>
              <td align="right"><span style="font-size:12px;color:#718096;">{{ bullet.category }}</span></td>
            </tr>
          </table>
          <p style="margin:8px 0 4px;font-size:14px;font-weight:600;color:#2d3748;">{{ bullet.competitor }}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#4a5568;line-height:1.5;">{{ bullet.summary }}</p>
          <p style="margin:0;font-size:13px;color:#718096;"><strong>Action:</strong> {{ bullet.actionable }}</p>
        </td></tr>
      </table>
        {% endfor %}
      {% else %}
      <p style="color:#718096;font-size:14px;">No significant competitor events detected this week.</p>
      {% endif %}
    </td>
  </tr>
  {% if swot %}
  <tr>
    <td style="padding:0 40px 32px;">
      <h2 style="margin:0 0 20px;color:#1a202c;font-size:18px;font-weight:600;">SWOT Analysis</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%" style="padding:0 8px 16px 0;vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;background:#f0fff4;border:1px solid #c6f6d5;">
              <tr><td style="padding:14px 16px;">
                <h3 style="margin:0 0 8px;font-size:13px;font-weight:600;color:#276749;text-transform:uppercase;">Strengths</h3>
                <ul style="margin:0;padding:0 0 0 16px;font-size:13px;color:#4a5568;">
                {% for s in swot.strengths %}
                  <li style="margin-bottom:4px;">{{ s }}</li>
                {% endfor %}
                </ul>
              </td></tr>
            </table>
          </td>
          <td width="50%" style="padding:0 0 16px 8px;vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;background:#fffaf0;border:1px solid #feebc8;">
              <tr><td style="padding:14px 16px;">
                <h3 style="margin:0 0 8px;font-size:13px;font-weight:600;color:#c05621;text-transform:uppercase;">Weaknesses</h3>
                <ul style="margin:0;padding:0 0 0 16px;font-size:13px;color:#4a5568;">
                {% for w in swot.weaknesses %}
                  <li style="margin-bottom:4px;">{{ w }}</li>
                {% endfor %}
                </ul>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:8px 8px 0 0;vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;background:#eef2ff;border:1px solid #c3dafe;">
              <tr><td style="padding:14px 16px;">
                <h3 style="margin:0 0 8px;font-size:13px;font-weight:600;color:#434190;text-transform:uppercase;">Opportunities</h3>
                <ul style="margin:0;padding:0 0 0 16px;font-size:13px;color:#4a5568;">
                {% for o in swot.opportunities %}
                  <li style="margin-bottom:4px;">{{ o }}</li>
                {% endfor %}
                </ul>
              </td></tr>
            </table>
          </td>
          <td width="50%" style="padding:8px 0 0 8px;vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;background:#fff5f5;border:1px solid #fed7d7;">
              <tr><td style="padding:14px 16px;">
                <h3 style="margin:0 0 8px;font-size:13px;font-weight:600;color:#c53030;text-transform:uppercase;">Threats</h3>
                <ul style="margin:0;padding:0 0 0 16px;font-size:13px;color:#4a5568;">
                {% for t in swot.threats %}
                  <li style="margin-bottom:4px;">{{ t }}</li>
                {% endfor %}
                </ul>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  {% endif %}
  <tr>
    <td style="padding:20px 40px;background:#f7fafc;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#a0aec0;text-align:center;">
        This brief was automatically generated by <strong>Vigil</strong> — your AI competitive intelligence engine.<br>
        <a href="#" style="color:#4299e1;text-decoration:none;">Configure your monitoring preferences</a>
      </p>
    </td>
  </tr>
</table>
</td></tr></table>
</body>
</html>""")


def generate_digest_html(brief: dict, user: dict) -> str:
    """
    Generates a beautiful HTML email digest from a weekly brief.

    Args:
        brief: Dict with 'bullets' list and 'swot_analysis' dict.
        user: User dict with 'company_name', 'email', etc.

    Returns:
        Rendered HTML string.
    """
    from datetime import datetime, timezone
    week_start = datetime.now(timezone.utc).date().strftime("%B %d, %Y")

    bullets = brief.get("bullets", [])
    swot = brief.get("swot_analysis", {})

    return DIGEST_TEMPLATE.render(
        company_name=user.get("company_name", "Your Company"),
        week_start=week_start,
        bullets=bullets,
        swot=swot,
    )


def send_digest(user_email: str, html_content: str) -> bool:
    """
    Sends an HTML email digest via the Resend API.

    Args:
        user_email: Recipient email address.
        html_content: Rendered HTML email body.

    Returns:
        True if sent successfully, False otherwise.
    """
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set. Skipping email send.")
        return False

    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": "Vigil <intelligence@vigil.ai>",
                "to": [user_email],
                "subject": "Your Weekly Competitive Intelligence Brief",
                "html": html_content,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        logger.info(f"Digest email sent to {user_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send digest to {user_email}: {e}")
        return False
