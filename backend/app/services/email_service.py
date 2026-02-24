"""
Email service for sending overlap alert notifications.
Uses aiosmtplib + Jinja2. Designed to run as a FastAPI BackgroundTask.
"""
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import List

import aiosmtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings
from app.models.holiday import Holiday
from app.models.user import User

logger = logging.getLogger(__name__)

_TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "email"
_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=select_autoescape(["html"]),
)


async def send_overlap_alert_email(
    manager: User,
    requester: User,
    holiday: Holiday,
    overlapping_names: List[str],
    business_unit_name: str,
) -> None:
    """Send an overlap alert email to the BU manager.

    Silently skips if SMTP is disabled or the manager has no email.
    Never raises — email failures must not break the API response.
    """
    if not settings.smtp_enabled:
        logger.debug("SMTP disabled — skipping overlap alert email to %s", manager.email)
        return

    try:
        template = _jinja_env.get_template("overlap_alert.html")
        html_body = template.render(
            manager_name=manager.display_name,
            requester_name=requester.display_name,
            business_unit_name=business_unit_name,
            holiday_title=holiday.title,
            start_date=str(holiday.start_date),
            end_date=str(holiday.end_date),
            overlapping_names=overlapping_names,
            app_url=settings.frontend_url,
            app_name=settings.app_name,
        )

        msg = MIMEMultipart("alternative")
        msg["Subject"] = (
            f"[{settings.app_name}] Leave Overlap Alert — {requester.display_name}"
        )
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_address}>"
        msg["To"] = manager.email
        msg.attach(MIMEText(html_body, "html"))

        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            use_tls=settings.smtp_use_tls,
        )
        logger.info("Overlap alert email sent to %s", manager.email)

    except Exception as exc:
        logger.error(
            "Failed to send overlap alert email to %s: %s",
            manager.email,
            exc,
        )
