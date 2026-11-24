from abc import ABC, abstractmethod

from app.schemas.recognition import RecognitionResult
from app.services.image_processing import ProcessedImage


class FoodRecognitionError(Exception):
    """Raised when a vision provider fails to produce a valid recognition result."""


class FoodRecognizer(ABC):
    """Abstract Strategy interface implemented by all vision backends (API or local ML)."""

    provider_name: str = "base"

    @abstractmethod
    def recognize(self, image: ProcessedImage) -> RecognitionResult:
        """Analyze a normalized RGB JPEG image and return structured food predictions."""