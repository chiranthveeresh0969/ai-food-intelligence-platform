from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["System"])


@router.get("/health")
def health_check() -> dict[str, str]:
    """Return service status and non-sensitive runtime configuration."""
    settings = get_settings()
    return {
        "status": "ok",
        "environment": settings.app_env,
        "recognizer_provider": settings.food_recognizer_provider,
        "primary_model": settings.gemini_model,
        "fallback_model": settings.gemini_fallback_model,
    }