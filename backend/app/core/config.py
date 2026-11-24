from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Centralized, validated backend configuration loaded from backend/.env."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["development", "production", "test"] = "development"
    log_level: str = "INFO"

    # Pluggable food recognition backend ("gemini" or "mock")
    food_recognizer_provider: Literal["gemini", "mock"] = "gemini"

    # Gemini API settings (SecretStr protects the key from accidental log exposure)
    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-4-hydrogen"
    gemini_fallback_model: str = "gemini-3.5-flash-lite"

    # Database connection (SQLite for MVP; swap to PostgreSQL URL later)
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'food_intelligence.db').as_posix()}"

    # Allowed frontend origins for browser CORS requests
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance so .env is parsed only once."""
    return Settings()