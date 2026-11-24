from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.api.v1.routes_nutrition import get_calculator
from app.db.models import MealLog, MealLogItem
from app.db.session import get_session
from app.nutrition.calculator import NutritionCalculator
from app.schemas.meals import (
    DailyNutritionSummary,
    MealHistoryResponse,
    MealLogCreateRequest,
    MealLogRead,
)
from app.schemas.nutrition import MealCalculationRequest

router = APIRouter(prefix="/meals", tags=["Meal History"])


@router.post("", response_model=MealLogRead, status_code=status.HTTP_201_CREATED)
def create_meal_log(
    payload: MealLogCreateRequest,
    session: Session = Depends(get_session),
    calculator: NutritionCalculator = Depends(get_calculator),
) -> MealLogRead:
    """Recompute deterministic meal nutrition on the server and persist the meal log."""
    calculation = calculator.calculate_meal(MealCalculationRequest(items=payload.items))

    if calculation.matched_count == 0:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="At least one food item must match the verified nutrition database before saving.",
        )

    meal = MealLog(
        meal_name=payload.meal_name.strip(),
        meal_type=payload.meal_type,
        total_calories_kcal=calculation.totals.calories_kcal,
        total_protein_g=calculation.totals.protein_g,
        total_carbs_g=calculation.totals.carbs_g,
        total_fat_g=calculation.totals.fat_g,
        total_fiber_g=calculation.totals.fiber_g,
        total_grams=calculation.totals.total_grams,
        contains_visual_estimates=calculation.contains_visual_estimates,
        provider_used=payload.provider_used,
        model_used=payload.model_used,
        items=[
            MealLogItem(
                food_id=item.matched_food_id,
                food_name=item.matched_food_name or item.requested_name,
                quantity=item.quantity,
                unit=item.unit,
                resolved_grams=item.resolved_grams,
                quantity_source=item.quantity_source,
                calories_kcal=item.calories_kcal,
                protein_g=item.protein_g,
                carbs_g=item.carbs_g,
                fat_g=item.fat_g,
                fiber_g=item.fiber_g,
                data_source=item.data_source,
            )
            for item in calculation.items
            if item.matched
        ],
    )

    session.add(meal)
    session.commit()
    session.refresh(meal)
    return MealLogRead.model_validate(meal)


@router.get("", response_model=MealHistoryResponse)
def list_meal_logs(
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> MealHistoryResponse:
    """Return recent persisted meals and aggregated totals for today (UTC)."""
    statement = (
        select(MealLog)
        .options(selectinload(MealLog.items))
        .order_by(MealLog.logged_at.desc())
        .limit(limit)
    )
    meals = list(session.exec(statement).all())

    today_utc = datetime.now(UTC).date()
    todays_meals = [meal for meal in meals if meal.logged_at.date() == today_utc]

    daily_summary = DailyNutritionSummary(
        date_utc=today_utc.isoformat(),
        meals_logged_today=len(todays_meals),
        calories_kcal=round(sum(m.total_calories_kcal for m in todays_meals), 1),
        protein_g=round(sum(m.total_protein_g for m in todays_meals), 1),
        carbs_g=round(sum(m.total_carbs_g for m in todays_meals), 1),
        fat_g=round(sum(m.total_fat_g for m in todays_meals), 1),
        fiber_g=round(sum(m.total_fiber_g for m in todays_meals), 1),
    )

    return MealHistoryResponse(
        total_meals=len(meals),
        daily_summary=daily_summary,
        meals=[MealLogRead.model_validate(meal) for meal in meals],
    )


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_log(
    meal_id: int,
    session: Session = Depends(get_session),
) -> Response:
    """Delete a logged meal and its associated food items."""
    meal = session.get(MealLog, meal_id)
    if meal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meal log {meal_id} not found.",
        )

    session.delete(meal)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)