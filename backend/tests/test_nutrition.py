from app.nutrition.calculator import NutritionCalculator
from app.nutrition.local_provider import LocalJsonNutritionProvider
from app.schemas.nutrition import MealCalculationRequest, NutritionItemInput


def _make_calculator() -> NutritionCalculator:
    return NutritionCalculator(provider=LocalJsonNutritionProvider())


def test_indian_meal_alias_and_household_units() -> None:
    calculator = _make_calculator()
    request = MealCalculationRequest(
        items=[
            NutritionItemInput(food_name="roti", quantity=2, unit="piece"),
            NutritionItemInput(food_name="Dal Tadka", quantity=1, unit="katori"),
        ]
    )

    result = calculator.calculate_meal(request)

    assert result.matched_count == 2
    assert result.unmatched_items == []
    assert result.contains_visual_estimates is False

    chapati_item, dal_item = result.items
    assert chapati_item.matched_food_name == "Chapati"
    assert chapati_item.match_type == "alias"
    assert chapati_item.resolved_grams == 70.0
    assert chapati_item.calories_kcal == 207.9

    assert dal_item.matched_food_name == "Dal Tadka"
    assert dal_item.match_type == "exact_name"
    assert dal_item.resolved_grams == 150.0
    assert dal_item.calories_kcal == 177.0

    assert result.totals.calories_kcal == 384.9
    assert result.totals.protein_g == 16.9
    assert result.totals.carbs_g == 60.8
    assert result.totals.fat_g == 8.0
    assert result.totals.total_grams == 220.0

    split = result.macro_calorie_split
    assert round(split.protein_pct + split.carbs_pct + split.fat_pct, 1) == 100.0


def test_exact_gram_calculation_and_visual_estimate_flag() -> None:
    calculator = _make_calculator()
    request = MealCalculationRequest(
        items=[
            NutritionItemInput(
                food_id="mango",
                food_name="Alphonso Mango",
                quantity=150,
                unit="g",
                quantity_source="visual_estimate",
            )
        ]
    )

    result = calculator.calculate_meal(request)

    assert result.contains_visual_estimates is True
    assert result.items[0].match_type == "exact_id"
    assert result.totals.calories_kcal == 90.0
    assert result.totals.protein_g == 1.2
    assert result.totals.carbs_g == 22.5
    assert result.totals.fat_g == 0.6


def test_unmatched_food_never_fabricates_calories() -> None:
    calculator = _make_calculator()
    request = MealCalculationRequest(
        items=[
            NutritionItemInput(food_name="Galactic Mystery Soup", quantity=1, unit="bowl"),
            NutritionItemInput(food_name="Boiled Egg", quantity=2, unit="piece"),
        ]
    )

    result = calculator.calculate_meal(request)

    assert result.matched_count == 1
    assert result.unmatched_items == ["Galactic Mystery Soup"]
    assert result.items[0].matched is False
    assert result.items[0].calories_kcal == 0.0
    assert result.items[0].warning is not None
    # Totals reflect only the 2 boiled eggs (100g = 155 kcal)
    assert result.totals.calories_kcal == 155.0