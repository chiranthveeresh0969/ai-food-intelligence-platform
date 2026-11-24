from app.nutrition.base import NutritionProvider
from app.schemas.nutrition import (
    FoodNutritionRecord,
    MacroCalorieSplit,
    MealCalculationRequest,
    MealCalculationResponse,
    NutritionItemBreakdown,
    NutritionItemInput,
    NutritionTotals,
)

# Fallback gram weights if a user enters a standard household unit not listed on a food
GENERIC_UNIT_GRAMS: dict[str, float] = {
    "g": 1.0,
    "gram": 1.0,
    "grams": 1.0,
    "ml": 1.0,
    "tsp": 5.0,
    "tbsp": 15.0,
    "katori": 150.0,
    "bowl": 200.0,
    "cup": 240.0,
    "slice": 35.0,
    "piece": 100.0,
    "serving": 150.0,
}


class NutritionCalculator:
    """Deterministic macro and calorie calculator decoupled from vision and HTTP layers."""

    def __init__(self, provider: NutritionProvider) -> None:
        self._provider = provider

    def _resolve_grams(
        self,
        food: FoodNutritionRecord,
        quantity: float,
        unit: str,
    ) -> tuple[float, str | None]:
        unit_key = unit.strip().lower()
        if unit_key in {"g", "gram", "grams"}:
            return quantity, None

        for option in food.serving_units:
            if option.unit.lower() == unit_key:
                return quantity * option.grams, None

        if unit_key in GENERIC_UNIT_GRAMS:
            grams_per_unit = GENERIC_UNIT_GRAMS[unit_key]
            warning = (
                f"Unit '{unit}' is not custom-defined for '{food.name}'; "
                f"applied standard reference weight ({grams_per_unit:.0f}g per {unit_key})."
            )
            return quantity * grams_per_unit, warning

        # Last-resort fallback to food's own default serving weight
        default_grams = next(
            (opt.grams for opt in food.serving_units if opt.unit == food.default_unit),
            100.0,
        )
        warning = (
            f"Unrecognized unit '{unit}'; defaulted to '{food.default_unit}' ({default_grams:.0f}g)."
        )
        return quantity * default_grams, warning

    def calculate_meal(self, request: MealCalculationRequest) -> MealCalculationResponse:
        breakdowns: list[NutritionItemBreakdown] = []
        unmatched_items: list[str] = []

        raw_calories = 0.0
        raw_protein = 0.0
        raw_carbs = 0.0
        raw_fat = 0.0
        raw_fiber = 0.0
        raw_grams = 0.0
        matched_count = 0
        contains_estimates = False

        for item in request.items:
            if item.quantity_source == "visual_estimate":
                contains_estimates = True

            match = self._provider.match_food(name=item.food_name, food_id=item.food_id)
            if match is None:
                unmatched_items.append(item.food_name)
                breakdowns.append(
                    self._build_unmatched_breakdown(item)
                )
                continue

            food, match_type = match
            resolved_grams, unit_warning = self._resolve_grams(food, item.quantity, item.unit)
            scale = resolved_grams / 100.0

            item_calories = food.calories_per_100g * scale
            item_protein = food.protein_g_per_100g * scale
            item_carbs = food.carbs_g_per_100g * scale
            item_fat = food.fat_g_per_100g * scale
            item_fiber = food.fiber_g_per_100g * scale

            raw_calories += item_calories
            raw_protein += item_protein
            raw_carbs += item_carbs
            raw_fat += item_fat
            raw_fiber += item_fiber
            raw_grams += resolved_grams
            matched_count += 1

            breakdowns.append(
                NutritionItemBreakdown(
                    requested_name=item.food_name,
                    matched=True,
                    matched_food_id=food.id,
                    matched_food_name=food.name,
                    match_type=match_type,
                    data_source=food.source,
                    quantity=item.quantity,
                    unit=item.unit,
                    resolved_grams=round(resolved_grams, 1),
                    quantity_source=item.quantity_source,
                    calories_kcal=round(item_calories, 1),
                    protein_g=round(item_protein, 1),
                    carbs_g=round(item_carbs, 1),
                    fat_g=round(item_fat, 1),
                    fiber_g=round(item_fiber, 1),
                    available_units=food.serving_units,
                    warning=unit_warning,
                )
            )

        totals = NutritionTotals(
            calories_kcal=round(raw_calories, 1),
            protein_g=round(raw_protein, 1),
            carbs_g=round(raw_carbs, 1),
            fat_g=round(raw_fat, 1),
            fiber_g=round(raw_fiber, 1),
            total_grams=round(raw_grams, 1),
        )

        macro_split = self._compute_macro_split(raw_protein, raw_carbs, raw_fat)

        return MealCalculationResponse(
            items=breakdowns,
            totals=totals,
            macro_calorie_split=macro_split,
            matched_count=matched_count,
            unmatched_items=unmatched_items,
            contains_visual_estimates=contains_estimates,
        )

    @staticmethod
    def _build_unmatched_breakdown(item: NutritionItemInput) -> NutritionItemBreakdown:
        return NutritionItemBreakdown(
            requested_name=item.food_name,
            matched=False,
            matched_food_id=None,
            matched_food_name=None,
            match_type="unmatched",
            data_source=None,
            quantity=item.quantity,
            unit=item.unit,
            resolved_grams=0.0,
            quantity_source=item.quantity_source,
            calories_kcal=0.0,
            protein_g=0.0,
            carbs_g=0.0,
            fat_g=0.0,
            fiber_g=0.0,
            available_units=[],
            warning=(
                f"'{item.food_name}' was not found in the verified nutrition database. "
                "Select a matching food from search to include it in totals."
            ),
        )

    @staticmethod
    def _compute_macro_split(protein_g: float, carbs_g: float, fat_g: float) -> MacroCalorieSplit:
        protein_kcal = protein_g * 4.0
        carbs_kcal = carbs_g * 4.0
        fat_kcal = fat_g * 9.0
        total_macro_kcal = protein_kcal + carbs_kcal + fat_kcal

        if total_macro_kcal <= 0.0:
            return MacroCalorieSplit(protein_pct=0.0, carbs_pct=0.0, fat_pct=0.0)

        protein_pct = round((protein_kcal / total_macro_kcal) * 100.0, 1)
        carbs_pct = round((carbs_kcal / total_macro_kcal) * 100.0, 1)
        fat_pct = round(max(0.0, 100.0 - protein_pct - carbs_pct), 1)
        return MacroCalorieSplit(
            protein_pct=protein_pct,
            carbs_pct=carbs_pct,
            fat_pct=fat_pct,
        )