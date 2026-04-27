import aiosqlite

from app.config import settings

_CREATE_DOCUMENTS_TABLE = """
CREATE TABLE IF NOT EXISTS documents (
    document_id    TEXT PRIMARY KEY,
    document_name  TEXT NOT NULL,
    version        INTEGER NOT NULL DEFAULT 1,
    status         TEXT NOT NULL DEFAULT 'processing',
    chunk_count    INTEGER DEFAULT 0,
    error_message  TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(document_name, version)
)
"""

_CREATE_SESSIONS_TABLE = """
CREATE TABLE IF NOT EXISTS sessions (
    session_id  TEXT PRIMARY KEY,
    title       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
)
"""

_CREATE_MESSAGES_TABLE = """
CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    sources         TEXT,
    enhanced_query  TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
)
"""

_CREATE_MESSAGES_SESSION_IDX = """
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)
"""

_CREATE_USAGE_TABLE = """
CREATE TABLE IF NOT EXISTS usage (
    id                    INTEGER PRIMARY KEY CHECK (id = 1),
    ocr_pages             INTEGER NOT NULL DEFAULT 0,
    embedding_tokens      INTEGER NOT NULL DEFAULT 0,
    llm_prompt_tokens     INTEGER NOT NULL DEFAULT 0,
    llm_completion_tokens INTEGER NOT NULL DEFAULT 0,
    updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
)
"""

_SEED_USAGE_ROW = """
INSERT OR IGNORE INTO usage (id) VALUES (1)
"""


async def init_db() -> None:
    """Create the database file and tables if they don't exist."""
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        await db.execute(_CREATE_DOCUMENTS_TABLE)
        await db.execute(_CREATE_SESSIONS_TABLE)
        await db.execute(_CREATE_MESSAGES_TABLE)
        await db.execute(_CREATE_MESSAGES_SESSION_IDX)
        await db.execute(_CREATE_USAGE_TABLE)
        await db.execute(_SEED_USAGE_ROW)
        await db.commit()


async def get_db() -> aiosqlite.Connection:
    """Return an async database connection.

    Caller is responsible for closing it (use as async context manager
    or call ``await db.close()``).
    """
    db = await aiosqlite.connect(settings.sqlite_path)
    db.row_factory = aiosqlite.Row
    return db
