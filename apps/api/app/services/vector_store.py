from __future__ import annotations

import logging
import uuid
from typing import Any

from qdrant_client import QdrantClient, models

from app.config import settings

logger = logging.getLogger(__name__)

_client: QdrantClient | None = None


def _get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
    return _client


async def ensure_collection() -> None:
    """Create the Qdrant collection if it doesn't already exist."""
    client = _get_client()
    collections = client.get_collections().collections
    names = [c.name for c in collections]

    if settings.qdrant_collection not in names:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=models.VectorParams(
                size=settings.embedding_dimensions,
                distance=models.Distance.COSINE,
            ),
        )
        logger.info("Created Qdrant collection '%s'", settings.qdrant_collection)
    else:
        logger.info("Qdrant collection '%s' already exists", settings.qdrant_collection)


async def upsert_chunks(
    chunks: list[dict[str, Any]],
    vectors: list[list[float]],
) -> None:
    """Insert chunk points into Qdrant.

    Each entry in *chunks* is a dict with keys:
        document_id, document_name, version, chunk_index,
        section_title, created_at, content
    """
    client = _get_client()
    points = [
        models.PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload=chunk,
        )
        for chunk, vector in zip(chunks, vectors)
    ]
    client.upsert(collection_name=settings.qdrant_collection, points=points)
    logger.info(
        "Upserted %d chunks for document %s", len(points), chunks[0]["document_id"]
    )


async def delete_by_document(document_id: str) -> None:
    """Delete all points belonging to a specific document_id."""
    client = _get_client()
    client.delete(
        collection_name=settings.qdrant_collection,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(value=document_id),
                    )
                ]
            )
        ),
    )
    logger.info("Deleted chunks for document %s", document_id)


async def search(
    query_vector: list[float],
    top_k: int | None = None,
) -> list[dict[str, Any]]:
    """Perform similarity search and return top-k chunk payloads with scores."""
    client = _get_client()
    results = client.query_points(
        collection_name=settings.qdrant_collection,
        query=query_vector,
        limit=top_k or settings.retrieval_top_k,
    )
    output: list[dict[str, Any]] = []
    for point in results.points:
        entry = dict(point.payload) if point.payload else {}
        entry["score"] = point.score
        output.append(entry)
    return output
