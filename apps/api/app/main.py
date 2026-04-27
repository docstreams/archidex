import os
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import dispose_engine, init_engine
from app.api import health, documents, chat, usage


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    os.makedirs(settings.upload_dir, exist_ok=True)

    # Schema migrations are applied separately via `alembic upgrade head`.
    init_engine()

    from app.services.vector_store import ensure_collection

    await ensure_collection()

    try:
        yield
    finally:
        await dispose_engine()


app = FastAPI(
    title="WogBuddy RAG API",
    version="0.1.0",
    lifespan=lifespan,
)

_DEV_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
        if settings.cors_origins
        else _DEV_ORIGINS
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(usage.router, prefix="/api")
