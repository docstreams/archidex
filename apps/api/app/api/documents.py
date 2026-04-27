from __future__ import annotations

import asyncio
import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import and_, delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_session, session_scope
from app.db.models import Document
from app.models.schemas import (
    DocumentListItem,
    DocumentStatusResponse,
    DocumentUploadResponse,
)
from app.services import chunker, converter, embeddings, vector_store

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
        async with session_scope() as db:
            await db.execute(
                update(Document)
                .where(Document.document_id == document_id)
                .values(status="ready", chunk_count=len(chunks))
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
            async with session_scope() as db:
                await db.execute(
                    update(Document)
                    .where(Document.document_id == document_id)
                    .values(status="failed", error_message=str(exc)[:500])
                )
                await db.commit()
        except Exception:
            logger.exception("Failed to update document status to 'failed'")


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile,
    db: AsyncSession = Depends(get_session),
) -> DocumentUploadResponse:
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

    # Determine version (check for existing uploads with same name)
    latest = (
        await db.execute(
            select(Document.version, Document.document_id)
            .where(Document.document_name == document_name)
            .order_by(Document.version.desc())
            .limit(1)
        )
    ).first()

    if latest is not None:
        version = latest.version + 1
        old_document_id: str | None = latest.document_id
    else:
        version = 1
        old_document_id = None

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
    db.add(
        Document(
            document_id=document_id,
            document_name=document_name,
            version=version,
            status="processing",
        )
    )
    await db.commit()

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
async def list_documents(
    db: AsyncSession = Depends(get_session),
) -> list[DocumentListItem]:
    """List all uploaded documents (latest version of each)."""
    latest = (
        select(
            Document.document_name,
            func.max(Document.version).label("max_ver"),
        )
        .group_by(Document.document_name)
        .subquery()
    )

    stmt = (
        select(Document)
        .join(
            latest,
            and_(
                Document.document_name == latest.c.document_name,
                Document.version == latest.c.max_ver,
            ),
        )
        .order_by(Document.created_at.desc())
    )

    rows = (await db.execute(stmt)).scalars().all()
    return [
        DocumentListItem(
            document_id=d.document_id,
            document_name=d.document_name,
            version=d.version,
            status=d.status,
            chunk_count=d.chunk_count,
            created_at=d.created_at,
        )
        for d in rows
    ]


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: str,
    db: AsyncSession = Depends(get_session),
) -> DocumentStatusResponse:
    """Get the processing status of a specific document."""
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentStatusResponse(
        document_id=doc.document_id,
        document_name=doc.document_name,
        version=doc.version,
        status=doc.status,
        chunk_count=doc.chunk_count,
        error_message=doc.error_message,
        created_at=doc.created_at,
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Delete a document and its vectors from Qdrant."""
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete vectors from Qdrant
    await vector_store.delete_by_document(document_id)

    # Delete from database
    await db.execute(delete(Document).where(Document.document_id == document_id))
    await db.commit()

    # Remove uploaded file
    upload_dir = settings.upload_dir
    for ext in ALLOWED_EXTENSIONS:
        path = os.path.join(upload_dir, f"{document_id}{ext}")
        if os.path.exists(path):
            os.remove(path)
            break

    return {"detail": "Document deleted"}


@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    db: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Serve an uploaded document file for preview or download."""
    document_name = (
        await db.execute(
            select(Document.document_name).where(Document.document_id == document_id)
        )
    ).scalar_one_or_none()

    if document_name is None:
        raise HTTPException(status_code=404, detail="Document not found")

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
