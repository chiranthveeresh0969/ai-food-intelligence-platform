import logging

from google import genai
from google.genai import errors, types
from pydantic import BaseModel, Field

from app.ml.base import FoodRecognitionError, FoodRecognizer
from app.schemas.recognition import FoodPredictionItem, RecognitionResult
from app.services.image_processing import ProcessedImage

logger = logging.getLogger("food_intelligence.ml.gemini")

SYSTEM_PROMPT = """You are a precise food vision recognition component inside a nutrition platform.
Your job is ONLY to identify visible food and beverage items in the photograph.

Strict rules:
1. Identify EVERY distinct food item visible on the plate, bowl, tray, or surface (support Indian and international dishes accurately, e.g., Masala Dosa, Idli, Sambar, Chapati, Dal Tadka, Paneer Butter Masala, White Rice, Alphonso Mango, Boiled Egg, Grilled Chicken).
2. Use clean, standard food names suitable for looking up in a nutritional database (avoid flowery descriptions like "delicious homemade spicy").
3. Provide a realistic confidence score between 0.0 and 1.0 based on visual clarity.
4. Provide a rough visual starting estimate for portion weight in grams (`estimated_grams`) and a human-readable `serving_description` (e.g., "1 medium mango", "2 chapatis", "1 katori").
5. Do NOT invent or output calories, protein, carbs, or fat—another deterministic engine calculates nutrition.
6. If the image contains NO recognizable food or beverages, set `contains_food` to false and return an empty `items` list.
"""


class _GeminiFoodItem(BaseModel):
    """Internal wire schema constrained for Gemini structured JSON output."""

    detected_name: str = Field(..., description="Standardized dish or food name.")
    cuisine_category: str = Field(
        ...,
        description="Broad category: Indian, Fruit, International, Snack, Dessert, or Beverage.",
    )
    confidence: float = Field(..., ge=0.0, le=1.0)
    estimated_grams: float = Field(..., gt=0.0, le=5000.0)
    serving_description: str = Field(..., description="Visual serving phrase e.g. '1 medium bowl'.")
    preparation_notes: str = Field(
        ...,
        description="Short preparation clue e.g. 'fresh raw', 'steamed', 'pan-fried', or 'unknown'.",
    )


class _GeminiRecognitionPayload(BaseModel):
    """Top-level structured JSON response requested from Gemini."""

    contains_food: bool
    items: list[_GeminiFoodItem]


class GeminiFoodRecognizer(FoodRecognizer):
    """Multimodal food recognizer backed by Google Gemini with automatic model fallback."""

    provider_name = "gemini"

    def __init__(
        self,
        api_key: str,
        primary_model: str,
        fallback_model: str | None = None,
    ) -> None:
        self._client = genai.Client(api_key=api_key)
        self._models = [primary_model]
        if fallback_model and fallback_model != primary_model:
            self._models.append(fallback_model)

    def _invoke_model(self, model_name: str, image: ProcessedImage) -> _GeminiRecognitionPayload:
        image_part = types.Part.from_bytes(
            data=image.jpeg_bytes,
            mime_type=image.mime_type,
        )
        response = self._client.models.generate_content(
            model=model_name,
            contents=[
                image_part,
                "Identify all visible food items in this image and return structured JSON.",
            ],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=_GeminiRecognitionPayload,
                temperature=0.1,
                thinking_config=types.ThinkingConfig(thinking_level="LOW"),
            ),
        )

        if not response.text:
            raise FoodRecognitionError(f"Model '{model_name}' returned an empty response.")

        return _GeminiRecognitionPayload.model_validate_json(response.text)

    def recognize(self, image: ProcessedImage) -> RecognitionResult:
        last_error: Exception | None = None

        for index, model_name in enumerate(self._models):
            try:
                logger.info("Running food recognition with Gemini model '%s'", model_name)
                payload = self._invoke_model(model_name, image)
                used_fallback_model = index > 0

                items = [
                    FoodPredictionItem(
                        detected_name=raw.detected_name.strip(),
                        cuisine_category=raw.cuisine_category.strip() or "General",
                        confidence=round(raw.confidence, 2),
                        estimated_grams=round(raw.estimated_grams, 1),
                        serving_description=raw.serving_description.strip() or "1 serving",
                        preparation_notes=(
                            None
                            if raw.preparation_notes.strip().lower() in {"", "unknown", "none", "n/a"}
                            else raw.preparation_notes.strip()
                        ),
                    )
                    for raw in payload.items
                ]

                warning: str | None = None
                if not payload.contains_food or not items:
                    warning = (
                        "No recognizable food items were detected in this image. "
                        "Try a clearer food photo or add food items manually."
                    )
                elif used_fallback_model:
                    warning = (
                        f"Primary model '{self._models[0]}' was temporarily busy; "
                        f"completed recognition using fallback model '{model_name}'."
                    )

                return RecognitionResult(
                    items=items,
                    provider=self.provider_name,
                    model_used=model_name,
                    fallback_used=used_fallback_model,
                    warning=warning,
                )

            except errors.APIError as exc:
                last_error = exc
                if exc.code in (429, 503) and index + 1 < len(self._models):
                    logger.warning(
                        "Gemini model '%s' returned HTTP %s; falling back to '%s'",
                        model_name,
                        exc.code,
                        self._models[index + 1],
                    )
                    continue
                raise FoodRecognitionError(
                    f"Gemini API error (HTTP {exc.code}): {exc.message}"
                ) from exc
            except Exception as exc:
                last_error = exc
                raise FoodRecognitionError(f"Failed to parse recognition response: {exc}") from exc

        raise FoodRecognitionError(f"All Gemini models failed: {last_error}")