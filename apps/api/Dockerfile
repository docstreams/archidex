# ── Stage 1: build ─────────────────────────────────────────────────────────
FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim AS build

WORKDIR /app

# Install dependencies first (layer cache)
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev --no-editable

# Copy application code
COPY app/ app/

# ── Stage 2: runtime ──────────────────────────────────────────────────────
FROM python:3.14-slim-bookworm

WORKDIR /app

# Copy venv and application from build stage
COPY --from=build /app/.venv /app/.venv
COPY --from=build /app/app /app/app

ENV PATH="/app/.venv/bin:$PATH"

# Data directory for SQLite + uploads (mount as volume)
RUN mkdir -p /app/data
VOLUME /app/data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
