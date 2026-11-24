from fastapi import APIRouter

from app.api.v1 import (
    routes_health,
    routes_images,
    routes_meals,
    routes_nutrition,
    routes_recognition,
)

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(routes_health.router)
api_v1_router.include_router(routes_images.router)
api_v1_router.include_router(routes_nutrition.router)
api_v1_router.include_router(routes_recognition.router)
api_v1_router.include_router(routes_meals.router)