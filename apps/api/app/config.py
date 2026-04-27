from pathlib import Path

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # API Keys
    mistral_api_key: str = ""
    openai_api_key: str = ""
    google_api_key: str = ""

    # Qdrant
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_collection: str = "documents"

    # Storage
    upload_dir: str = str(BASE_DIR / "data" / "uploads")

    # Database
    postgres_user: str = "archidex_user"
    postgres_password: str = "archidex_password"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "archidex"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # RAG parameters
    max_chat_history: int = 10
    retrieval_top_k: int = 5
    chunk_size: int = 800
    chunk_overlap: int = 100

    # Embedding
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    # LLM
    llm_model: str = "gemini-2.5-flash"

    # CORS (comma-separated origins for production; empty = dev defaults)
    cors_origins: str = ""

    # Upload / processing
    upload_max_size_mb: int = 10
    max_concurrent_processing: int = 2

    # Usage limits (demo safeguards)
    limit_ocr_pages: int = 100
    limit_embedding_tokens: int = 500_000
    limit_llm_tokens: int = 1_000_000


settings = Settings()
