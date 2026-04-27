from __future__ import annotations

import logging
from pathlib import Path

from mistralai.client import Mistral

from app.config import settings
from app.services.usage import check_ocr_limit, increment_ocr_pages

logger = logging.getLogger(__name__)


async def process_pdf(file_path: str) -> str:
    """Send a PDF to Mistral OCR and return the combined Markdown output."""
    # Check limit before making the API call
    await check_ocr_limit()

    client = Mistral(api_key=settings.mistral_api_key)

    # Upload the file to Mistral
    path = Path(file_path)
    uploaded = await client.files.upload_async(
        file={
            "file_name": path.name,
            "content": path.read_bytes(),
        },
        purpose="ocr",
    )

    # Get a signed URL for the uploaded file
    signed = await client.files.get_signed_url_async(file_id=uploaded.id)

    # Run OCR
    result = await client.ocr.process_async(
        model="mistral-ocr-latest",
        document={
            "type": "document_url",
            "document_url": signed.url,
        },
    )

    # Concatenate all page markdown
    pages_md: list[str] = []
    for page in result.pages:
        pages_md.append(page.markdown)

    combined = "\n\n".join(pages_md)
    page_count = len(result.pages)
    logger.info(
        "OCR completed for %s – %d pages, %d chars",
        path.name,
        page_count,
        len(combined),
    )

    # Track usage
    await increment_ocr_pages(page_count)

    # Clean up the uploaded file
    try:
        await client.files.delete_async(file_id=uploaded.id)
    except Exception:
        logger.warning("Failed to delete uploaded OCR file %s", uploaded.id)

    return combined
