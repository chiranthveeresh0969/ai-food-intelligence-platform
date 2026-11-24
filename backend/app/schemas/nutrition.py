from typing import Literal

from pydantic import BaseModel, Field

NUTRITION_DISCLAIMER = (
    "Nutritional values are computed deterministically from USDA FoodData Central and "
    "ICMR-NIN IFCT reference compositions per 100g. Actual values vary by recipe, oil usage, "
    "and brand. Visually estimated portions remain approximate until weighed or confirmed."
)


class ServingUnitOption(BaseModel):
    """Supported household or metric unit with its gram equivalent for a specific food."""

    unit: str = Field(..., description="Machine key e.g. 'g', 'piece', 'katori', 'bowl'.")
    label: str = Field(..., description="Human-readable label e.g. '1 medium chapati (35g)'.")
    grams: float = Field(..., gt=0.0)


class FoodNutritionRecord(BaseModel):
    """Canonical per-100g nutrition entry with explicit data provenance."""

    id: str
    name: str
    aliases: list[str] = Field(default_factory=list)
    cuisine_category: str
    source: str = Field(..., description="Data provenance e.g. 'ICMR-NIN IFCT 2017' or 'USDA FoodData Central'.")
    calories_per_100g: float = Field(..., ge=0.0)
    protein_g_per_100g: float = Field(..., ge=0.0)
    carbs_g_per_100g: float = Field(..., ge=0.0)
    fat_g_per_100g: float = Field(..., ge=0.0)
    fiber_g_per_100g: float = Field(..., ge=0.0)
    default_unit: str = "serving"
    serving_units: list[ServingUnitOption] = Field(default_factory=list)


class FoodSearchResponse(BaseModel):
    """Autocomplete search result returned by GET /api/v1/nutrition/foods."""

    query: str
    total_matches: int
    foods: list[FoodNutritionRecord]


class NutritionItemInput(BaseModel):
    """Single user-verified (or visually estimated) food item submitted for calculation."""

    food_id: str | None = Field(
        default=None,
        description="Optional exact database ID selected from autocomplete.",
    )
    food_name: str = Field(..., min_length=1, description="Food name to match if food_id is omitted.")
    quantity: float = Field(..., gt=0.0, le=5000.0, description="Amount in the chosen unit.")
    unit: str = Field(default="g", min_length=1, description="Unit key e.g. 'g', 'piece', 'katori', 'bowl', 'serving'.")
    quantity_source: Literal["visual_estimate", "user_confirmed"] = "user_confirmed"


class MealCalculationRequest(BaseModel):
    """Batch request containing all items in a meal."""

    items: list[NutritionItemInput] = Field(..., min_length=1, max_length=30)


class NutritionItemBreakdown(BaseModel):
    """Deterministic per-item nutritional result."""

    requested_name: str
    matched: bool
    matched_food_id: str | None = None
    matched_food_name: str | None = None
    match_type: Literal["exact_id", "exact_name", "alias", "fuzzy", "unmatched"]
    data_source: str | None = None
    quantity: float
    unit: str
    resolved_grams: float
    quantity_source: Literal["visual_estimate", "user_confirmed"]
    calories_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    available_units: list[ServingUnitOption] = Field(default_factory=list)
    warning: str | None = None


class NutritionTotals(BaseModel):
    """Aggregated meal totals across all matched items."""

    calories_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    total_grams: float


class MacroCalorieSplit(BaseModel):
    """Percentage of calories derived from protein, carbohydrates, and fat."""

    protein_pct: float
    carbs_pct: float
    fat_pct: float


class MealCalculationResponse(BaseModel):
    """Complete deterministic meal nutrition report."""

    items: list[NutritionItemBreakdown]
    totals: NutritionTotals
    macro_calorie_split: MacroCalorieSplit
    matched_count: int
    unmatched_items: list[str]
    contains_visual_estimates: bool
    disclaimer: str = NUTRITION_DISCLAIMER