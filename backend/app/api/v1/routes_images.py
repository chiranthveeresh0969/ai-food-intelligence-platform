from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.services.image_processing import (
    ImageValidationError,
    validate_and_preprocess_upload,
)

router = APIRouter(prefix="/images", tags=["Images"])


class ImageValidationResponse(BaseModel):
    filename: str
    mime_type: str
    original_width: int
    original_height: int
    processed_width: int
    processed_height: int
    original_size_bytes: int
    processed_size_bytes: int


@router.post("/validate", response_model=ImageValidationResponse)
async def validate_image(file: UploadFile = File(...)) -> ImageValidationResponse:
    """Validate and preprocess an uploaded food image, returning normalized metadata."""
    try:
        processed = await validate_and_preprocess_upload(file)
    except ImageValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return ImageValidationResponse(
        filename=file.filename or "unnamed",
        mime_type=processed.mime_type,
        original_width=processed.original_width,
        original_height=processed.original_height,
        processed_width=processed.width,
        processed_height=processed.height,
        original_size_bytes=processed.original_size_bytes,
        processed_size_bytes=processed.processed_size_bytes,
    )