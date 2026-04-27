from __future__ import annotations

import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    SessionHistoryResponse,
    SessionListItem,
    SessionResponse,
)
from app.services import rag_pipeline
from app.services.input_guard import REFUSAL_MESSAGE, check_message
from app.store import session_store

router = APIRouter(prefix="/chat", tags=["chat"])


# ── Sessions ──────────────────────────────────────────────────────────────


@router.post("/sessions", response_model=SessionResponse)
async def create_session() -> SessionResponse:
    """Create a new chat session."""
    session_id = await session_store.create_session()
    return SessionResponse(session_id=session_id)


@router.get("/sessions", response_model=list[SessionListItem])
async def list_sessions() -> list[SessionListItem]:
    """List all chat sessions, newest first."""
    return await session_store.list_sessions()


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str) -> None:
    """Delete a chat session and its messages."""
    if not await session_store.session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    await session_store.delete_session(session_id)


@router.get("/sessions/{session_id}/history", response_model=SessionHistoryResponse)
async def get_session_history(session_id: str) -> SessionHistoryResponse:
    """Get the full chat history for a session (with sources & enhanced queries)."""
    if not await session_store.session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    title = await session_store.get_session_title(session_id)
    messages = await session_store.get_full_history(session_id)
    return SessionHistoryResponse(
        session_id=session_id,
        title=title,
        messages=messages,
    )


# ── Chat (non-streaming) ─────────────────────────────────────────────────


@router.post("", response_model=ChatResponse)
async def send_message(request: ChatRequest) -> ChatResponse:
    """Send a message and get a RAG-powered response (non-streaming)."""
    if not await session_store.session_exists(request.session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    # Layer 3: Input guard — block prompt-injection attempts
    is_safe, reason = check_message(request.message)
    if not is_safe:
        return ChatResponse(response=REFUSAL_MESSAGE, sources=[])

    history = await session_store.get_history(request.session_id)

    response_text, sources = await rag_pipeline.process_query(
        question=request.message,
        history=history,
    )

    # Persist both messages
    await session_store.add_message(request.session_id, "user", request.message)
    await session_store.add_message(
        request.session_id, "assistant", response_text, sources=sources
    )

    return ChatResponse(response=response_text, sources=sources)


# ── Chat (streaming) ─────────────────────────────────────────────────────


@router.post("/stream")
async def stream_message(request: ChatRequest) -> StreamingResponse:
    """Send a message and stream the RAG-powered response as SSE events.

    Events:
        ``enhanced_query`` – the reformulated standalone question
        ``sources``        – retrieved document sources
        ``chunk``          – text fragment from the LLM
        ``done``           – completion signal (includes ``full_text``)
        ``error``          – if something goes wrong
    """
    if not await session_store.session_exists(request.session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    # Layer 3: Input guard — block prompt-injection attempts
    is_safe, reason = check_message(request.message)
    if not is_safe:
        refusal_payload = json.dumps({"text": REFUSAL_MESSAGE}, ensure_ascii=False)
        done_payload = json.dumps({"full_text": REFUSAL_MESSAGE}, ensure_ascii=False)

        async def refusal_stream() -> AsyncIterator[str]:
            yield f"event: sources\ndata: []\n\n"
            yield f"event: chunk\ndata: {refusal_payload}\n\n"
            yield f"event: done\ndata: {done_payload}\n\n"

        return StreamingResponse(
            refusal_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    history = await session_store.get_history(request.session_id)

    async def event_generator() -> AsyncIterator[str]:
        full_text = ""
        enhanced_query = ""
        sources_data: list[dict] = []

        async for event in rag_pipeline.process_query_stream(
            question=request.message,
            history=history,
        ):
            # Capture enrichment data from events for persistence
            if event.startswith("event: enhanced_query"):
                try:
                    data_line = event.split("data: ", 1)[1].strip()
                    parsed = json.loads(data_line)
                    enhanced_query = parsed.get("query", "")
                except (IndexError, json.JSONDecodeError):
                    pass

            elif event.startswith("event: sources"):
                try:
                    data_line = event.split("data: ", 1)[1].strip()
                    sources_data = json.loads(data_line)
                except (IndexError, json.JSONDecodeError):
                    pass

            elif event.startswith("event: done"):
                try:
                    data_line = event.split("data: ", 1)[1].strip()
                    done_data = json.loads(data_line)
                    full_text = done_data.get("full_text", "")
                except (IndexError, json.JSONDecodeError):
                    pass

            yield event

        # Persist to SQLite after streaming completes
        if full_text:
            await session_store.add_message(request.session_id, "user", request.message)

            from app.models.schemas import ChatSource

            sources = [ChatSource(**s) for s in sources_data] if sources_data else None
            await session_store.add_message(
                request.session_id,
                "assistant",
                full_text,
                sources=sources,
                enhanced_query=enhanced_query or None,
            )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
