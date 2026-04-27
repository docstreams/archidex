from __future__ import annotations

import json
import uuid
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import aiosqlite

from app.config import settings
from app.models.schemas import ChatMessage, ChatSource, HistoryMessage, SessionListItem


@asynccontextmanager
async def _connect() -> AsyncIterator[aiosqlite.Connection]:
    async with aiosqlite.connect(settings.sqlite_path) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON")
        yield db


# ── Session lifecycle ─────────────────────────────────────────────────────


async def create_session() -> str:
    """Create a new chat session and return its ID."""
    session_id = str(uuid.uuid4())
    async with _connect() as db:
        await db.execute(
            "INSERT INTO sessions (session_id) VALUES (?)",
            (session_id,),
        )
        await db.commit()
    return session_id


async def session_exists(session_id: str) -> bool:
    """Check if a session exists."""
    async with _connect() as db:
        cursor = await db.execute(
            "SELECT 1 FROM sessions WHERE session_id = ?",
            (session_id,),
        )
        return await cursor.fetchone() is not None


async def list_sessions() -> list[SessionListItem]:
    """Return all sessions ordered by most recently updated."""
    async with _connect() as db:
        cursor = await db.execute(
            "SELECT session_id, title, created_at, updated_at "
            "FROM sessions ORDER BY updated_at DESC"
        )
        rows = await cursor.fetchall()
    return [
        SessionListItem(
            session_id=row["session_id"],
            title=row["title"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        for row in rows
    ]


async def delete_session(session_id: str) -> None:
    """Delete a session and all its messages."""
    async with _connect() as db:
        await db.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        await db.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        await db.commit()


# ── Messages ──────────────────────────────────────────────────────────────


async def add_message(
    session_id: str,
    role: str,
    content: str,
    sources: list[ChatSource] | None = None,
    enhanced_query: str | None = None,
) -> None:
    """Persist a message and update the session timestamp.

    If this is the first user message, auto-set the session title.
    """
    sources_json = json.dumps([s.model_dump() for s in sources]) if sources else None
    async with _connect() as db:
        await db.execute(
            "INSERT INTO messages (session_id, role, content, sources, enhanced_query) "
            "VALUES (?, ?, ?, ?, ?)",
            (session_id, role, content, sources_json, enhanced_query),
        )
        await db.execute(
            "UPDATE sessions SET updated_at = datetime('now') WHERE session_id = ?",
            (session_id,),
        )

        # Auto-title from first user message
        if role == "user":
            cursor = await db.execute(
                "SELECT title FROM sessions WHERE session_id = ?",
                (session_id,),
            )
            row = await cursor.fetchone()
            if row and not row["title"]:
                title = content[:60].strip()
                if len(content) > 60:
                    title += "..."
                await db.execute(
                    "UPDATE sessions SET title = ? WHERE session_id = ?",
                    (title, session_id),
                )

        await db.commit()


async def get_history(session_id: str) -> list[ChatMessage]:
    """Return recent message history for LLM context (bounded by max_chat_history)."""
    max_messages = settings.max_chat_history
    async with _connect() as db:
        cursor = await db.execute(
            "SELECT role, content FROM ("
            "  SELECT role, content, id FROM messages "
            "  WHERE session_id = ? ORDER BY id DESC LIMIT ?"
            ") sub ORDER BY id ASC",
            (session_id, max_messages),
        )
        rows = await cursor.fetchall()
    return [ChatMessage(role=row["role"], content=row["content"]) for row in rows]


async def get_full_history(session_id: str) -> list[HistoryMessage]:
    """Return the complete message history with sources and enhanced_query for the UI."""
    async with _connect() as db:
        cursor = await db.execute(
            "SELECT role, content, sources, enhanced_query FROM messages "
            "WHERE session_id = ? ORDER BY id ASC",
            (session_id,),
        )
        rows = await cursor.fetchall()

    messages: list[HistoryMessage] = []
    for row in rows:
        sources = None
        if row["sources"]:
            try:
                sources = [ChatSource(**s) for s in json.loads(row["sources"])]
            except (json.JSONDecodeError, TypeError, ValueError):
                pass
        messages.append(
            HistoryMessage(
                role=row["role"],
                content=row["content"],
                sources=sources,
                enhanced_query=row["enhanced_query"],
            )
        )
    return messages


async def get_session_title(session_id: str) -> str:
    """Return the title for a session."""
    async with _connect() as db:
        cursor = await db.execute(
            "SELECT title FROM sessions WHERE session_id = ?",
            (session_id,),
        )
        row = await cursor.fetchone()
    return row["title"] if row else ""
