from fastapi import APIRouter, Depends, Query

from app.nutrition.base import NutritionProvider
from app.nutrition.calculator import NutritionCalculator
from app.nutrition.local_provider import get_nutrition_provider
from app.schemas.nutrition import (
    FoodSearchResponse,
    MealCalculationRequest,
    MealCalculationResponse,
)

router = APIRouter(prefix="/nutrition", tags=["Nutrition"])


def get_calculator(
    provider: NutritionProvider = Depends(get_nutrition_provider),
) -> NutritionCalculator:
    """Assemble a NutritionCalculator from the active NutritionProvider."""
    return NutritionCalculator(provider=provider)


@router.get("/foods", response_model=FoodSearchResponse)
def search_foods(
    q: str = Query(default="", max_length=100, description="Partial food name, alias, or cuisine."),
    limit: int = Query(default=20, ge=1, le=100),
    provider: NutritionProvider = Depends(get_nutrition_provider),
) -> FoodSearchResponse:
    """Search the verified food composition database for user verification and correction."""
    matches = provider.search(query=q, limit=limit)
    return FoodSearchResponse(
        query=q,
        total_matches=len(matches),
        foods=matches,
    )


@router.post("/calculate", response_model=MealCalculationResponse)
def calculate_meal_nutrition(
    payload: MealCalculationRequest,
    calculator: NutritionCalculator = Depends(get_calculator),
) -> MealCalculationResponse:
    """Deterministically calculate calories and macronutrients for user-verified meal items."""
    return calculator.calculate_meal(payload)