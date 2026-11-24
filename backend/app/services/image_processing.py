from dataclasses import dataclass
from io import BytesIO

from fastapi import UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB ceiling
MAX_IMAGE_DIMENSION = 1024          # Longest edge in pixels for fast vision inference
CHUNK_SIZE_BYTES = 64 * 1024        # 64 KB streaming chunks


class ImageValidationError(Exception):
    """Domain error raised when an uploaded image fails format, size, or integrity checks."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class ProcessedImage:
    """Normalized RGB JPEG payload ready for downstream vision models."""

    jpeg_bytes: bytes
    mime_type: str
    original_width: int
    original_height: int
    width: int
    height: int
    original_size_bytes: int
    processed_size_bytes: int


async def read_upload_with_limit(file: UploadFile, max_bytes: int = MAX_IMAGE_BYTES) -> bytes:
    """Read an uploaded file in chunks and abort early if it exceeds max_bytes."""
    chunks: list[bytes] = []
    total_bytes = 0

    while chunk := await file.read(CHUNK_SIZE_BYTES):
        total_bytes += len(chunk)
        if total_bytes > max_bytes:
            raise ImageValidationError(
                f"Image exceeds maximum allowed size of {max_bytes // (1024 * 1024)} MB.",
                status_code=413,
            )
        chunks.append(chunk)

    if total_bytes == 0:
        raise ImageValidationError("Uploaded file is empty.", status_code=400)

    return b"".join(chunks)


def normalize_image_bytes(raw_bytes: bytes) -> ProcessedImage:
    """Verify binary image integrity, fix EXIF rotation, convert to RGB, and downscale."""
    try:
        with Image.open(BytesIO(raw_bytes)) as img:
            transposed = ImageOps.exif_transpose(img)
            original_width, original_height = transposed.size

            rgb_image = transposed.convert("RGB")
            rgb_image.thumbnail(
                (MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION),
                Image.Resampling.LANCZOS,
            )

            output_buffer = BytesIO()
            rgb_image.save(output_buffer, format="JPEG", quality=85, optimize=True)
            jpeg_bytes = output_buffer.getvalue()

            return ProcessedImage(
                jpeg_bytes=jpeg_bytes,
                mime_type="image/jpeg",
                original_width=original_width,
                original_height=original_height,
                width=rgb_image.width,
                height=rgb_image.height,
                original_size_bytes=len(raw_bytes),
                processed_size_bytes=len(jpeg_bytes),
            )
    except UnidentifiedImageError as exc:
        raise ImageValidationError(
            "File is not a valid or supported image (expected JPEG, PNG, or WebP).",
            status_code=400,
        ) from exc
    except OSError as exc:
        raise ImageValidationError(
            "Image file appears to be corrupted or truncated.",
            status_code=400,
        ) from exc


async def validate_and_preprocess_upload(file: UploadFile) -> ProcessedImage:
    """Validate content-type, enforce size limits, and normalize an uploaded image."""
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ImageValidationError(
            f"Unsupported media type '{content_type or 'unknown'}'. Upload a JPEG, PNG, or WebP image.",
            status_code=415,
        )

    raw_bytes = await read_upload_with_limit(file)
    return normalize_image_bytes(raw_bytes)