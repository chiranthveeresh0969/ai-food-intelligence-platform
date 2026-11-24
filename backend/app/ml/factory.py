import logging

from app.core.config import Settings, get_settings
from app.ml.base import FoodRecognitionError, FoodRecognizer
from app.ml.gemini_recognizer import GeminiFoodRecognizer
from app.ml.mock_recognizer import MockFoodRecognizer
from app.schemas.recognition import RecognitionResult
from app.services.image_processing import ProcessedImage

logger = logging.getLogger("food_intelligence.ml.factory")


class ResilientFoodRecognizer(FoodRecognizer):
    """Wraps a primary recognizer with an automatic offline MockFoodRecognizer safety net."""

    def __init__(self, primary: FoodRecognizer) -> None:
        self._primary = primary
        self.provider_name = primary.provider_name

    def recognize(self, image: ProcessedImage) -> RecognitionResult:
        try:
            return self._primary.recognize(image)
        except FoodRecognitionError as exc:
            logger.error("Primary recognizer '%s' failed: %s. Falling back to mock.", self._primary.provider_name, exc)
            fallback = MockFoodRecognizer(
                reason=f"Live vision service unavailable ({exc})."
            )
            return fallback.recognize(image)


def build_food_recognizer(settings: Settings | None = None) -> FoodRecognizer:
    """Instantiate the configured FoodRecognizer without coupling routes to a specific ML SDK."""
    cfg = settings or get_settings()

    if cfg.food_recognizer_provider == "mock":
        return MockFoodRecognizer(reason="Configured to run in mock mode (FOOD_RECOGNIZER_PROVIDER=mock).")

    raw_key = cfg.gemini_api_key.get_secret_value().strip() if cfg.gemini_api_key else ""
    if not raw_key or raw_key == "your_gemini_api_key_here":
        logger.warning("GEMINI_API_KEY missing or placeholder; using MockFoodRecognizer.")
        return MockFoodRecognizer(reason="GEMINI_API_KEY is not configured.")

    gemini = GeminiFoodRecognizer(
        api_key=raw_key,
        primary_model=cfg.gemini_model,
        fallback_model=cfg.gemini_fallback_model,
    )
    return ResilientFoodRecognizer(primary=gemini)