from __future__ import annotations

import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite
from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.config import settings
from app.database import get_db
from app.models.schemas import (
    DocumentListItem,
    DocumentStatusResponse,
    DocumentUploadResponse,
)
from app.services import converter, chunker, embeddings, vector_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx"}

# Lazy-initialised semaphore (must be created inside the event loop)
_processing_sem: asyncio.Semaphore | None = None


def _get_semaphore() -> asyncio.Semaphore:
    global _processing_sem
    if _processing_sem is None:
        _processing_sem = asyncio.Semaphore(settings.max_concurrent_processing)
    return _processing_sem


async def _process_document(
    document_id: str,
    document_name: str,
    version: int,
    file_path: str,
    old_document_id: str | None,
) -> None:
    """Background task: convert → chunk → embed → store in Qdrant."""
    async with _get_semaphore():
        await _process_document_inner(
            document_id, document_name, version, file_path, old_document_id
        )


async def _process_document_inner(
    document_id: str,
    document_name: str,
    version: int,
    file_path: str,
    old_document_id: str | None,
) -> None:
    """Actual processing logic, runs under the concurrency semaphore."""
    db: aiosqlite.Connection | None = None
    try:
        # 1. Convert document to markdown
        markdown = await converter.to_markdown(file_path)

        # 2. Chunk the markdown
        chunks = chunker.chunk_markdown(
            markdown=markdown,
            document_id=document_id,
            document_name=document_name,
            version=version,
        )

        if not chunks:
            raise ValueError("Document produced no chunks after processing")

        # 3. Embed all chunks
        texts = [c.content for c in chunks]
        vectors = await embeddings.embed_texts(texts)

        # 4. Delete old version chunks from Qdrant (if re-upload)
        if old_document_id:
            await vector_store.delete_by_document(old_document_id)

        # 5. Upsert new chunks into Qdrant
        chunk_dicts = [c.to_dict() for c in chunks]
        await vector_store.upsert_chunks(chunk_dicts, vectors)

        # 6. Update database status → ready
        db = await get_db()
        await db.execute(
            "UPDATE documents SET status = 'ready', chunk_count = ? WHERE document_id = ?",
            (len(chunks), document_id),
        )
        await db.commit()
        logger.info(
            "Document '%s' v%d processed successfully (%d chunks)",
            document_name,
            version,
            len(chunks),
        )

    except Exception as exc:
        logger.exception("Failed to process document '%s' v%d", document_name, version)
        try:
            db = db or await get_db()
            await db.execute(
                "UPDATE documents SET status = 'failed', error_message = ? WHERE document_id = ?",
                (str(exc)[:500], document_id),
            )
            await db.commit()
        except Exception:
            logger.exception("Failed to update document status to 'failed'")
    finally:
        if db:
            await db.close()


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile) -> DocumentUploadResponse:
    """Upload a PDF or DOCX document for processing."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    document_name = file.filename
    document_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    db = await get_db()
    try:
        # Determine version (check for existing uploads with same name)
        cursor = await db.execute(
            "SELECT MAX(version) as max_ver, document_id FROM documents WHERE document_name = ?",
            (document_name,),
        )
        row = await cursor.fetchone()

        old_document_id: str | None = None
        if row and row["max_ver"] is not None:
            version = row["max_ver"] + 1
            old_document_id = row["document_id"]
        else:
            version = 1

        # Save uploaded file to disk (with size check)
        file_path = os.path.join(settings.upload_dir, f"{document_id}{ext}")
        os.makedirs(settings.upload_dir, exist_ok=True)

        max_bytes = settings.upload_max_size_mb * 1024 * 1024
        content = await file.read(max_bytes + 1)
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"Файл перевищує ліміт {settings.upload_max_size_mb} МБ",
            )

        with open(file_path, "wb") as f:
            f.write(content)

        # Insert document record
        await db.execute(
            """INSERT INTO documents (document_id, document_name, version, status, created_at)
               VALUES (?, ?, ?, 'processing', ?)""",
            (document_id, document_name, version, now),
        )
        await db.commit()
    finally:
        await db.close()

    # Launch background processing
    asyncio.create_task(
        _process_document(
            document_id, document_name, version, file_path, old_document_id
        )
    )

    return DocumentUploadResponse(
        document_id=document_id,
        document_name=document_name,
        version=version,
        status="processing",
    )


@router.get("", response_model=list[DocumentListItem])
async def list_documents() -> list[DocumentListItem]:
    """List all uploaded documents (latest version of each)."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT d.document_id, d.document_name, d.version, d.status,
                      d.chunk_count, d.created_at
               FROM documents d
               INNER JOIN (
                   SELECT document_name, MAX(version) as max_ver
                   FROM documents
                   GROUP BY document_name
               ) latest ON d.document_name = latest.document_name
                       AND d.version = latest.max_ver
               ORDER BY d.created_at DESC"""
        )
        rows = await cursor.fetchall()
        return [
            DocumentListItem(
                document_id=row["document_id"],
                document_name=row["document_name"],
                version=row["version"],
                status=row["status"],
                chunk_count=row["chunk_count"],
                created_at=row["created_at"],
            )
            for row in rows
        ]
    finally:
        await db.close()


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(document_id: str) -> DocumentStatusResponse:
    """Get the processing status of a specific document."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM documents WHERE document_id = ?", (document_id,)
        )
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

        return DocumentStatusResponse(
            document_id=row["document_id"],
            document_name=row["document_name"],
            version=row["version"],
            status=row["status"],
            chunk_count=row["chunk_count"],
            error_message=row["error_message"],
            created_at=row["created_at"],
        )
    finally:
        await db.close()


@router.delete("/{document_id}")
async def delete_document(document_id: str) -> dict[str, str]:
    """Delete a document and its vectors from Qdrant."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM documents WHERE document_id = ?", (document_id,)
        )
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

        # Delete vectors from Qdrant
        await vector_store.delete_by_document(document_id)

        # Delete from database
        await db.execute("DELETE FROM documents WHERE document_id = ?", (document_id,))
        await db.commit()

        # Remove uploaded file
        upload_dir = settings.upload_dir
        for ext in ALLOWED_EXTENSIONS:
            path = os.path.join(upload_dir, f"{document_id}{ext}")
            if os.path.exists(path):
                os.remove(path)
                break

        return {"detail": "Document deleted"}
    finally:
        await db.close()


@router.get("/{document_id}/download")
async def download_document(document_id: str) -> FileResponse:
    """Serve an uploaded document file for preview or download."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT document_name FROM documents WHERE document_id = ?",
            (document_id,),
        )
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

        document_name: str = row["document_name"]
        ext = Path(document_name).suffix.lower()
        file_path = os.path.join(settings.upload_dir, f"{document_id}{ext}")

        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on disk")

        # PDFs open inline in the browser; everything else downloads
        media_type = "application/pdf" if ext == ".pdf" else "application/octet-stream"
        disposition = "inline" if ext == ".pdf" else "attachment"

        return FileResponse(
            path=file_path,
            filename=document_name,
            media_type=media_type,
            content_disposition_type=disposition,
        )
    finally:
        await db.close()
