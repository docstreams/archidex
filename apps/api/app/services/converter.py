from __future__ import annotations

import logging
from pathlib import Path

from markitdown import MarkItDown

from app.services import ocr

logger = logging.getLogger(__name__)

_markitdown = MarkItDown()

# Supported file extensions and their processing paths
SUPPORTED_EXTENSIONS = {".pdf", ".docx"}


async def to_markdown(file_path: str) -> str:
    """Convert a document file to Markdown.

    - PDF  → Mistral OCR
    - DOCX → markitdown
    """
    ext = Path(file_path).suffix.lower()

    if ext == ".pdf":
        logger.info("Processing PDF via Mistral OCR: %s", file_path)
        return await ocr.process_pdf(file_path)

    if ext == ".docx":
        logger.info("Processing DOCX via markitdown: %s", file_path)
        result = _markitdown.convert(file_path)
        return result.text_content

    raise ValueError(f"Unsupported file extension: {ext}")
