import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.core.config import get_settings

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("food_intelligence")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Manage startup and shutdown lifecycle hooks cleanly."""
    logger.info(
        "Starting AI Food Intelligence API | env=%s | provider=%s",
        settings.app_env,
        settings.food_recognizer_provider,
    )
    yield
    logger.info("Shutting down AI Food Intelligence API")


app = FastAPI(
    title="AI Food Intelligence Platform API",
    version="0.1.0",
    description="Modular food image recognition and deterministic nutritional analysis API.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router)