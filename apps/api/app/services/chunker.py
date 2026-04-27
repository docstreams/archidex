from __future__ import annotations

import logging
import re
from dataclasses import dataclass, asdict
from datetime import datetime, timezone

from app.config import settings

logger = logging.getLogger(__name__)

# Regex to match markdown headings (# through ######)
_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)


@dataclass
class Chunk:
    document_id: str
    document_name: str
    version: int
    chunk_index: int
    section_title: str
    created_at: str
    content: str

    def to_dict(self) -> dict:
        return asdict(self)


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token for English text."""
    return len(text) // 4


def chunk_markdown(
    markdown: str,
    document_id: str,
    document_name: str,
    version: int,
) -> list[Chunk]:
    """Split markdown into chunks based on heading structure.

    Strategy:
    1. Split the document at each heading boundary.
    2. If a section is larger than ``chunk_size`` tokens, split it further
       using paragraph breaks, respecting ``chunk_overlap``.
    3. Each chunk carries the most recent heading as ``section_title``.
    """
    max_tokens = settings.chunk_size
    overlap_tokens = settings.chunk_overlap
    now = datetime.now(timezone.utc).isoformat()

    # Split document into sections by heading
    sections = _split_by_headings(markdown)

    chunks: list[Chunk] = []

    for section_title, section_text in sections:
        # If section fits in one chunk, keep it whole
        if _estimate_tokens(section_text) <= max_tokens:
            if section_text.strip():
                chunks.append(
                    Chunk(
                        document_id=document_id,
                        document_name=document_name,
                        version=version,
                        chunk_index=len(chunks),
                        section_title=section_title,
                        created_at=now,
                        content=section_text.strip(),
                    )
                )
        else:
            # Split large sections by paragraphs with overlap
            sub_chunks = _split_section(section_text, max_tokens, overlap_tokens)
            for sc in sub_chunks:
                if sc.strip():
                    chunks.append(
                        Chunk(
                            document_id=document_id,
                            document_name=document_name,
                            version=version,
                            chunk_index=len(chunks),
                            section_title=section_title,
                            created_at=now,
                            content=sc.strip(),
                        )
                    )

    logger.info(
        "Chunked document '%s' v%d into %d chunks",
        document_name,
        version,
        len(chunks),
    )
    return chunks


def _split_by_headings(markdown: str) -> list[tuple[str, str]]:
    """Split markdown into (section_title, section_text) tuples.

    The first tuple may have an empty title if the doc starts without a heading.
    """
    matches = list(_HEADING_RE.finditer(markdown))

    if not matches:
        return [("Untitled", markdown)]

    sections: list[tuple[str, str]] = []

    # Content before the first heading
    if matches[0].start() > 0:
        preamble = markdown[: matches[0].start()]
        if preamble.strip():
            sections.append(("Untitled", preamble))

    for i, match in enumerate(matches):
        title = match.group(2).strip()
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(markdown)
        text = markdown[start:end]
        sections.append((title, text))

    return sections


def _split_section(text: str, max_tokens: int, overlap_tokens: int) -> list[str]:
    """Split a large section into smaller pieces at paragraph boundaries."""
    paragraphs = re.split(r"\n\s*\n", text)
    chunks: list[str] = []
    current: list[str] = []
    current_tokens = 0

    for para in paragraphs:
        para_tokens = _estimate_tokens(para)

        if current_tokens + para_tokens > max_tokens and current:
            chunks.append("\n\n".join(current))

            # Calculate overlap: keep trailing paragraphs
            overlap: list[str] = []
            overlap_count = 0
            for prev in reversed(current):
                t = _estimate_tokens(prev)
                if overlap_count + t > overlap_tokens:
                    break
                overlap.insert(0, prev)
                overlap_count += t

            current = overlap
            current_tokens = overlap_count

        current.append(para)
        current_tokens += para_tokens

    if current:
        chunks.append("\n\n".join(current))

    return chunks
