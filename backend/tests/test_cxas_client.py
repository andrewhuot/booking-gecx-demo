"""Unit tests for backend.cxas_client pure helpers (no network, no SDK calls).

Run: backend/.venv/bin/python -m pytest backend/tests/test_cxas_client.py -q

These cover the rate-limit detection, the friendly error messaging, and the
agent-text de-duplication that the live bridge applies to CES responses.
"""
from __future__ import annotations

from backend.cxas_client import (
    _dedupe_agent_text,
    _humanize_error,
    _is_rate_limit,
)


# --------------------------------------------------------------------------- #
# _is_rate_limit
# --------------------------------------------------------------------------- #
def test_is_rate_limit_detects_429_and_quota():
    assert _is_rate_limit(RuntimeError("429 Resource has been exhausted (e.g. check quota).")) is True
    assert _is_rate_limit(RuntimeError("RESOURCE_EXHAUSTED")) is True
    assert _is_rate_limit(RuntimeError("quota exceeded")) is True


def test_is_rate_limit_false_for_other_errors():
    assert _is_rate_limit(RuntimeError("connection refused")) is False
    assert _is_rate_limit(RuntimeError("403 permission denied")) is False


# --------------------------------------------------------------------------- #
# _humanize_error
# --------------------------------------------------------------------------- #
def test_humanize_error_rate_limit_is_friendly_and_mentions_quota():
    msg = _humanize_error(RuntimeError("429 Resource has been exhausted (e.g. check quota)."))
    assert "rate-limited" in msg.lower()
    assert "quota" in msg.lower()
    # Must NOT claim billing is disabled (that was the old, stale message).
    assert "billing" not in msg.lower()


def test_humanize_error_permission_points_at_provisioning():
    msg = _humanize_error(RuntimeError("403 permission denied"))
    assert "provision" in msg.lower() or "cxas_app_name" in msg.lower()
    assert "billing" not in msg.lower()


def test_humanize_error_importerror_mentions_sdk():
    msg = _humanize_error(ImportError("No module named 'cxas_scrapi'"))
    assert "cxas-scrapi" in msg.lower() or "sdk" in msg.lower()


def test_humanize_error_connection_is_passed_through():
    msg = _humanize_error(RuntimeError("connection timeout"))
    assert "connection" in msg.lower() or "transport" in msg.lower()


# --------------------------------------------------------------------------- #
# _dedupe_agent_text
# --------------------------------------------------------------------------- #
def test_dedupe_collapses_exact_doubled_text():
    half = "Absolutely, I can help with that!"
    doubled = f"{half} {half}"
    assert _dedupe_agent_text(doubled) == half


def test_dedupe_leaves_normal_text_untouched():
    normal = "Sedona is a wonderful choice for a relaxing getaway."
    assert _dedupe_agent_text(normal) == normal
    # A sentence that merely repeats a word is not exact-half duplication.
    tricky = "I can help help you book a room."
    assert _dedupe_agent_text(tricky) == tricky


def test_dedupe_handles_empty_and_whitespace():
    assert _dedupe_agent_text("") == ""
    # Two identical multi-word halves.
    assert _dedupe_agent_text("hello world hello world") == "hello world"
