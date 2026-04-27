from __future__ import annotations

import uuid

from sqlalchemy import delete, exists, func, select

from app.config import settings
from app.db import session_scope
from app.db.models import ChatSession, Message
from app.models.schemas import ChatMessage, ChatSource, HistoryMessage, SessionListItem


# ── Session lifecycle ─────────────────────────────────────────────────────


async def create_session() -> str:
    """Create a new chat session and return its ID."""
    session_id = str(uuid.uuid4())
    async with session_scope() as db:
        db.add(ChatSession(session_id=session_id))
        await db.commit()
    return session_id


async def session_exists(session_id: str) -> bool:
    """Check if a session exists."""
    async with session_scope() as db:
        result = await db.execute(
            select(exists().where(ChatSession.session_id == session_id))
        )
        return bool(result.scalar())


async def list_sessions() -> list[SessionListItem]:
    """Return all sessions ordered by most recently updated."""
    async with session_scope() as db:
        rows = (
            await db.execute(
                select(ChatSession).order_by(ChatSession.updated_at.desc())
            )
        ).scalars().all()
    return [
        SessionListItem(
            session_id=s.session_id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in rows
    ]


async def delete_session(session_id: str) -> None:
    """Delete a session and all its messages (cascade via FK)."""
    async with session_scope() as db:
        await db.execute(
            delete(ChatSession).where(ChatSession.session_id == session_id)
        )
        await db.commit()


# ── Messages ──────────────────────────────────────────────────────────────


async def add_message(
    session_id: str,
    role: str,
    content: str,
    sources: list[ChatSource] | None = None,
    enhanced_query: str | None = None,
) -> None:
    """Persist a message and bump the session's updated_at.

    If this is the first user message, auto-set the session title.
    """
    sources_payload = [s.model_dump() for s in sources] if sources else None

    async with session_scope() as db:
        db.add(
            Message(
                session_id=session_id,
                role=role,
                content=content,
                sources=sources_payload,
                enhanced_query=enhanced_query,
            )
        )

        session = await db.get(ChatSession, session_id)
        if session is not None:
            if role == "user" and not session.title:
                title = content[:60].strip()
                if len(content) > 60:
                    title += "..."
                session.title = title
            session.updated_at = func.now()

        await db.commit()


async def get_history(session_id: str) -> list[ChatMessage]:
    """Return recent message history for LLM context (bounded by max_chat_history)."""
    max_messages = settings.max_chat_history
    async with session_scope() as db:
        rows = (
            await db.execute(
                select(Message.role, Message.content)
                .where(Message.session_id == session_id)
                .order_by(Message.id.desc())
                .limit(max_messages)
            )
        ).all()
    return [ChatMessage(role=r.role, content=r.content) for r in reversed(rows)]


async def get_full_history(session_id: str) -> list[HistoryMessage]:
    """Return the complete message history with sources and enhanced_query for the UI."""
    async with session_scope() as db:
        rows = (
            await db.execute(
                select(
                    Message.role,
                    Message.content,
                    Message.sources,
                    Message.enhanced_query,
                )
                .where(Message.session_id == session_id)
                .order_by(Message.id.asc())
            )
        ).all()

    messages: list[HistoryMessage] = []
    for r in rows:
        sources: list[ChatSource] | None = None
        if r.sources:
            try:
                sources = [ChatSource(**s) for s in r.sources]
            except (TypeError, ValueError):
                pass
        messages.append(
            HistoryMessage(
                role=r.role,
                content=r.content,
                sources=sources,
                enhanced_query=r.enhanced_query,
            )
        )
    return messages


async def get_session_title(session_id: str) -> str:
    """Return the title for a session (empty string if not found)."""
    async with session_scope() as db:
        title = (
            await db.execute(
                select(ChatSession.title).where(ChatSession.session_id == session_id)
            )
        ).scalar_one_or_none()
    return title or ""
