from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.ml.base import FoodRecognizer
from app.ml.factory import build_food_recognizer
from app.schemas.recognition import ImageMetadata, RecognitionResult
from app.services.image_processing import (
    ImageValidationError,
    validate_and_preprocess_upload,
)

router = APIRouter(prefix="/recognition", tags=["Food Recognition"])


def get_recognizer() -> FoodRecognizer:
    """FastAPI dependency allowing clean overrides during automated tests."""
    return build_food_recognizer()


@router.post("/analyze", response_model=RecognitionResult)
async def analyze_food_image(
    file: UploadFile = File(...),
    recognizer: FoodRecognizer = Depends(get_recognizer),
) -> RecognitionResult:
    """Validate an uploaded food image and identify visible food items."""
    try:
        processed = await validate_and_preprocess_upload(file)
    except ImageValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    result = await run_in_threadpool(recognizer.recognize, processed)
    result.image_metadata = ImageMetadata(
        filename=file.filename or "unnamed",
        mime_type=processed.mime_type,
        processed_width=processed.width,
        processed_height=processed.height,
        processed_size_bytes=processed.processed_size_bytes,
    )
    return result