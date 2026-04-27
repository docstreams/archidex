from fastapi import APIRouter

from app.config import settings
from app.models.schemas import UsageMetric, UsageResponse
from app.services.usage import get_usage

router = APIRouter(tags=["usage"])


@router.get("/usage", response_model=UsageResponse)
async def read_usage() -> UsageResponse:
    """Return current usage counters and configured limits."""
    raw = await get_usage()
    return UsageResponse(
        ocr_pages=UsageMetric(
            used=raw["ocr_pages"],
            limit=settings.limit_ocr_pages,
        ),
        embedding_tokens=UsageMetric(
            used=raw["embedding_tokens"],
            limit=settings.limit_embedding_tokens,
        ),
        llm_tokens=UsageMetric(
            used=raw["llm_prompt_tokens"] + raw["llm_completion_tokens"],
            limit=settings.limit_llm_tokens,
        ),
    )
