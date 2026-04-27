from __future__ import annotations

import logging

from fastapi import HTTPException
from sqlalchemy import select, update

from app.config import settings
from app.db import session_scope
from app.db.models import Usage

logger = logging.getLogger(__name__)


class UsageLimitExceeded(HTTPException):
    """Raised when a usage limit is hit."""

    def __init__(self, resource: str, used: int, limit: int) -> None:
        super().__init__(
            status_code=429,
            detail=(
                f"Ліміт використання вичерпано: {resource} "
                f"({used}/{limit}). Зверніться до адміністратора."
            ),
        )


_ZERO_USAGE: dict[str, int] = {
    "ocr_pages": 0,
    "embedding_tokens": 0,
    "llm_prompt_tokens": 0,
    "llm_completion_tokens": 0,
}


async def get_usage() -> dict[str, int]:
    """Return current usage counters as a flat dict."""
    async with session_scope() as db:
        row = (await db.execute(select(Usage).where(Usage.id == 1))).scalar_one_or_none()
        if row is None:
            return dict(_ZERO_USAGE)
        return {
            "ocr_pages": row.ocr_pages,
            "embedding_tokens": row.embedding_tokens,
            "llm_prompt_tokens": row.llm_prompt_tokens,
            "llm_completion_tokens": row.llm_completion_tokens,
        }


async def _ensure_singleton(db) -> None:
    """Insert the singleton usage row if it doesn't exist (idempotent)."""
    exists = (
        await db.execute(select(Usage.id).where(Usage.id == 1))
    ).scalar_one_or_none()
    if exists is None:
        db.add(Usage(id=1))
        await db.flush()


async def increment_ocr_pages(count: int) -> None:
    """Atomically add *count* OCR pages to the running total."""
    async with session_scope() as db:
        await _ensure_singleton(db)
        await db.execute(
            update(Usage)
            .where(Usage.id == 1)
            .values(ocr_pages=Usage.ocr_pages + count)
        )
        await db.commit()
        logger.info("Usage: +%d OCR pages", count)


async def increment_embedding_tokens(count: int) -> None:
    """Atomically add *count* embedding tokens to the running total."""
    async with session_scope() as db:
        await _ensure_singleton(db)
        await db.execute(
            update(Usage)
            .where(Usage.id == 1)
            .values(embedding_tokens=Usage.embedding_tokens + count)
        )
        await db.commit()
        logger.info("Usage: +%d embedding tokens", count)


async def increment_llm_tokens(prompt_tokens: int, completion_tokens: int) -> None:
    """Atomically add LLM token counts to the running totals."""
    async with session_scope() as db:
        await _ensure_singleton(db)
        await db.execute(
            update(Usage)
            .where(Usage.id == 1)
            .values(
                llm_prompt_tokens=Usage.llm_prompt_tokens + prompt_tokens,
                llm_completion_tokens=Usage.llm_completion_tokens + completion_tokens,
            )
        )
        await db.commit()
        logger.info(
            "Usage: +%d prompt / +%d completion LLM tokens",
            prompt_tokens,
            completion_tokens,
        )


# ── Limit checks ──────────────────────────────────────────────────────────


async def check_ocr_limit(pages_needed: int = 1) -> None:
    """Raise 429 if adding *pages_needed* would exceed the OCR page limit."""
    usage = await get_usage()
    if usage["ocr_pages"] + pages_needed > settings.limit_ocr_pages:
        raise UsageLimitExceeded(
            "OCR-сторінки", usage["ocr_pages"], settings.limit_ocr_pages
        )


async def check_embedding_limit() -> None:
    """Raise 429 if the embedding token budget is already exhausted."""
    usage = await get_usage()
    if usage["embedding_tokens"] >= settings.limit_embedding_tokens:
        raise UsageLimitExceeded(
            "токени ембедингів",
            usage["embedding_tokens"],
            settings.limit_embedding_tokens,
        )


async def check_llm_limit() -> None:
    """Raise 429 if the LLM token budget is already exhausted."""
    usage = await get_usage()
    total = usage["llm_prompt_tokens"] + usage["llm_completion_tokens"]
    if total >= settings.limit_llm_tokens:
        raise UsageLimitExceeded("токени LLM", total, settings.limit_llm_tokens)
