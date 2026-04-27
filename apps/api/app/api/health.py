from fastapi import APIRouter

from app.config import settings
from app.models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    qdrant_status = "unavailable"
    db_status = "unavailable"

    # Check Qdrant
    try:
        from qdrant_client import QdrantClient

        client = QdrantClient(
            host=settings.qdrant_host, port=settings.qdrant_port, timeout=5
        )
        client.get_collections()
        qdrant_status = "ok"
    except Exception:
        pass

    # Check SQLite
    try:
        import aiosqlite

        async with aiosqlite.connect(settings.sqlite_path) as db:
            await db.execute("SELECT 1")
        db_status = "ok"
    except Exception:
        pass

    overall = "ok" if qdrant_status == "ok" and db_status == "ok" else "degraded"

    return HealthResponse(status=overall, qdrant=qdrant_status, database=db_status)
