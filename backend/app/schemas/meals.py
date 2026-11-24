from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.nutrition import NutritionItemInput

MealType = Literal["breakfast", "lunch", "dinner", "snack"]


class MealLogCreateRequest(BaseModel):
    """Payload submitted to log a meal (nutrition is recomputed deterministically server-side)."""

    meal_name: str = Field(default="Logged Meal", min_length=1, max_length=120)
    meal_type: MealType = "lunch"
    provider_used: str | None = Field(default=None, max_length=50)
    model_used: str | None = Field(default=None, max_length=80)
    items: list[NutritionItemInput] = Field(..., min_length=1, max_length=30)


class MealLogItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    food_id: str | None
    food_name: str
    quantity: float
    unit: str
    resolved_grams: float
    quantity_source: str
    calories_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    data_source: str | None


class MealLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meal_name: str
    meal_type: str
    logged_at: datetime
    total_calories_kcal: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    total_fiber_g: float
    total_grams: float
    contains_visual_estimates: bool
    provider_used: str | None
    model_used: str | None
    items: list[MealLogItemRead]


class DailyNutritionSummary(BaseModel):
    """Aggregated totals for meals logged on the current UTC date."""

    date_utc: str
    meals_logged_today: int
    calories_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float


class MealHistoryResponse(BaseModel):
    total_meals: int
    daily_summary: DailyNutritionSummary
    meals: list[MealLogRead]