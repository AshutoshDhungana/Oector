"""Slack webhook sender — used to route review requests / notifications.

Reads SLACK_WEBHOOK_URL from env at call time (so a live demo can toggle the
webhook without a restart). Non-blocking: any failure is logged and swallowed.
"""

from __future__ import annotations

import os
from typing import Optional

import httpx

from app.logging_config import get_logger

log = get_logger(__name__)


def is_configured() -> bool:
    return bool(os.getenv("SLACK_WEBHOOK_URL"))


def send(text: str, *, blocks: Optional[list] = None) -> bool:
    """Fire a message to the configured Slack webhook. Returns True on success."""
    url = os.getenv("SLACK_WEBHOOK_URL")
    if not url:
        return False
    payload: dict = {"text": text}
    if blocks is not None:
        payload["blocks"] = blocks
    try:
        resp = httpx.post(url, json=payload, timeout=8)
        ok = 200 <= resp.status_code < 300
        if not ok:
            log.warning("slack_webhook_non2xx", status=resp.status_code, body=resp.text[:200])
        return ok
    except Exception as e:
        log.warning("slack_webhook_failed", err=str(e))
        return False


def notify_review_needed(
    questionnaire_name: str,
    customer: Optional[str],
    total_items: int,
    gap_items: int,
    url: str,
) -> bool:
    text = (
        f"New questionnaire ready for review: *{questionnaire_name}*"
        + (f" (customer: {customer})" if customer else "")
    )
    blocks = [
        {"type": "header", "text": {"type": "plain_text", "text": "🛡️ Trust Copilot — Review needed"}},
        {"type": "section", "text": {"type": "mrkdwn", "text": text}},
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Total questions:*\n{total_items}"},
                {"type": "mrkdwn", "text": f"*Needs analyst attention:*\n{gap_items}"},
            ],
        },
        {
            "type": "actions",
            "elements": [
                {"type": "button", "text": {"type": "plain_text", "text": "Open in Trust Copilot"},
                 "url": url, "style": "primary"},
            ],
        },
    ]
    return send(text, blocks=blocks)


def notify_conflict_detected(count: int, sample_explanation: str, url: str) -> bool:
    text = f"⚠️ {count} potential library contradictions detected"
    blocks = [
        {"type": "header", "text": {"type": "plain_text", "text": "Library Health alert"}},
        {"type": "section", "text": {"type": "mrkdwn", "text": text}},
        {"type": "section", "text": {"type": "mrkdwn", "text": f"_Example:_ {sample_explanation}"}},
        {
            "type": "actions",
            "elements": [
                {"type": "button", "text": {"type": "plain_text", "text": "View conflicts"},
                 "url": url, "style": "danger"},
            ],
        },
    ]
    return send(text, blocks=blocks)
