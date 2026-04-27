from __future__ import annotations

from pydantic import BaseModel, Field


# ── Documents ──────────────────────────────────────────────────────────────


class DocumentUploadResponse(BaseModel):
    document_id: str
    document_name: str
    version: int
    status: str = "processing"


class DocumentStatusResponse(BaseModel):
    document_id: str
    document_name: str
    version: int
    status: str
    chunk_count: int = 0
    error_message: str | None = None
    created_at: str


class DocumentListItem(BaseModel):
    document_id: str
    document_name: str
    version: int
    status: str
    chunk_count: int = 0
    created_at: str


# ── Chat ───────────────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    session_id: str
    message: str = Field(..., min_length=1, max_length=4000)


class ChatSource(BaseModel):
    document_id: str
    document_name: str
    section_title: str
    chunk_index: int
    snippet: str


class ChatResponse(BaseModel):
    response: str
    sources: list[ChatSource] = []


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class HistoryMessage(BaseModel):
    """A message with optional enrichment data for loading persisted history."""

    role: str
    content: str
    sources: list[ChatSource] | None = None
    enhanced_query: str | None = None


class SessionResponse(BaseModel):
    session_id: str


class SessionListItem(BaseModel):
    session_id: str
    title: str
    created_at: str
    updated_at: str


class SessionHistoryResponse(BaseModel):
    session_id: str
    title: str
    messages: list[HistoryMessage]


# ── Usage ──────────────────────────────────────────────────────────────────


class UsageMetric(BaseModel):
    used: int
    limit: int


class UsageResponse(BaseModel):
    ocr_pages: UsageMetric
    embedding_tokens: UsageMetric
    llm_tokens: UsageMetric


# ── Health ─────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    qdrant: str
    database: str
