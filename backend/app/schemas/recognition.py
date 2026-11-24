from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

PORTION_DISCLAIMER = (
    "Single RGB images cannot measure exact food weight. Portion weights below are "
    "initial visual estimates—verify each item and adjust quantities before calculating nutrition."
)


class FoodPredictionItem(BaseModel):
    """Single food item predicted from an uploaded image."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    detected_name: str = Field(..., min_length=1, description="Standardized dish or food name.")
    cuisine_category: str = Field(
        default="General",
        description="Broad category such as Indian, Fruit, International, Beverage, or Snack.",
    )
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence from 0.0 to 1.0.")
    estimated_grams: float = Field(
        ...,
        gt=0.0,
        le=5000.0,
        description="Rough visual starting estimate in grams (not a measured weight).",
    )
    serving_description: str = Field(
        default="1 serving",
        description="Human-readable visual serving estimate (e.g., '1 medium mango', '1 katori').",
    )
    preparation_notes: str | None = Field(
        default=None,
        description="Observed preparation clue (e.g., 'fresh raw', 'steamed', 'curry with oil').",
    )
    quantity_source: Literal["visual_estimate", "user_confirmed"] = "visual_estimate"


class ImageMetadata(BaseModel):
    """Summary of the normalized image passed to the recognition engine."""

    filename: str
    mime_type: str
    processed_width: int
    processed_height: int
    processed_size_bytes: int


class RecognitionResult(BaseModel):
    """Complete recognition response returned to the user for verification."""

    items: list[FoodPredictionItem]
    provider: str
    model_used: str
    fallback_used: bool = False
    warning: str | None = None
    portion_disclaimer: str = PORTION_DISCLAIMER
    image_metadata: ImageMetadata | None = None