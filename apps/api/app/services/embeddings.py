from __future__ import annotations

import logging

from openai import AsyncOpenAI

from app.config import settings
from app.services.usage import check_embedding_limit, increment_embedding_tokens

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts using OpenAI's embedding model.

    Returns a list of embedding vectors in the same order as the input.
    Handles batching automatically (OpenAI supports up to 2048 inputs).
    """
    if not texts:
        return []

    # Check limit before making API calls
    await check_embedding_limit()

    client = _get_client()
    batch_size = 2048
    all_embeddings: list[list[float]] = []
    total_tokens = 0

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = await client.embeddings.create(
            model=settings.embedding_model,
            input=batch,
            dimensions=settings.embedding_dimensions,
        )
        # Response data is sorted by index, but be safe
        sorted_data = sorted(response.data, key=lambda x: x.index)
        all_embeddings.extend([d.embedding for d in sorted_data])
        if response.usage:
            total_tokens += response.usage.total_tokens

    # Track usage
    if total_tokens > 0:
        await increment_embedding_tokens(total_tokens)

    logger.info("Embedded %d texts (%d tokens)", len(texts), total_tokens)
    return all_embeddings
