from __future__ import annotations

import logging

import aiosqlite
from fastapi import HTTPException

from app.config import settings
from app.database import get_db

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


async def get_usage() -> dict[str, int]:
    """Return current usage counters as a flat dict."""
    db: aiosqlite.Connection = await get_db()
    try:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT ocr_pages, embedding_tokens, "
            "llm_prompt_tokens, llm_completion_tokens FROM usage WHERE id = 1"
        )
        row = await cursor.fetchone()
        if row is None:
            return {
                "ocr_pages": 0,
                "embedding_tokens": 0,
                "llm_prompt_tokens": 0,
                "llm_completion_tokens": 0,
            }
        return dict(row)
    finally:
        await db.close()


async def increment_ocr_pages(count: int) -> None:
    """Atomically add *count* OCR pages to the running total."""
    db: aiosqlite.Connection = await get_db()
    try:
        await db.execute(
            "UPDATE usage SET ocr_pages = ocr_pages + ?, "
            "updated_at = datetime('now') WHERE id = 1",
            (count,),
        )
        await db.commit()
        logger.info("Usage: +%d OCR pages", count)
    finally:
        await db.close()


async def increment_embedding_tokens(count: int) -> None:
    """Atomically add *count* embedding tokens to the running total."""
    db: aiosqlite.Connection = await get_db()
    try:
        await db.execute(
            "UPDATE usage SET embedding_tokens = embedding_tokens + ?, "
            "updated_at = datetime('now') WHERE id = 1",
            (count,),
        )
        await db.commit()
        logger.info("Usage: +%d embedding tokens", count)
    finally:
        await db.close()


async def increment_llm_tokens(prompt_tokens: int, completion_tokens: int) -> None:
    """Atomically add LLM token counts to the running totals."""
    db: aiosqlite.Connection = await get_db()
    try:
        await db.execute(
            "UPDATE usage SET "
            "llm_prompt_tokens = llm_prompt_tokens + ?, "
            "llm_completion_tokens = llm_completion_tokens + ?, "
            "updated_at = datetime('now') WHERE id = 1",
            (prompt_tokens, completion_tokens),
        )
        await db.commit()
        logger.info(
            "Usage: +%d prompt / +%d completion LLM tokens",
            prompt_tokens,
            completion_tokens,
        )
    finally:
        await db.close()


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
