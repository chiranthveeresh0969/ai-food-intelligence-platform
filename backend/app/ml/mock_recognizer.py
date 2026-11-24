from app.ml.base import FoodRecognizer
from app.schemas.recognition import FoodPredictionItem, RecognitionResult
from app.services.image_processing import ProcessedImage


class MockFoodRecognizer(FoodRecognizer):
    """Deterministic fallback recognizer that keeps the workflow testable offline."""

    provider_name = "mock"

    def __init__(self, reason: str | None = None) -> None:
        self._reason = reason or "Mock recognition provider is active."

    def recognize(self, image: ProcessedImage) -> RecognitionResult:
        return RecognitionResult(
            items=[
                FoodPredictionItem(
                    detected_name="Steamed White Rice",
                    cuisine_category="Indian",
                    confidence=0.65,
                    estimated_grams=150.0,
                    serving_description="1 medium bowl (placeholder)",
                    preparation_notes="steamed",
                ),
                FoodPredictionItem(
                    detected_name="Dal Tadka",
                    cuisine_category="Indian",
                    confidence=0.60,
                    estimated_grams=150.0,
                    serving_description="1 katori (placeholder)",
                    preparation_notes="cooked lentils with tempering",
                ),
            ],
            provider=self.provider_name,
            model_used="deterministic-fallback-v1",
            fallback_used=True,
            warning=(
                f"{self._reason} Returned sample placeholder items so you can continue "
                "testing—please edit or replace them with the actual foods in your meal."
            ),
        )