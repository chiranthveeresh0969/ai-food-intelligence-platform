from datetime import UTC, datetime

from sqlmodel import Field, Relationship, SQLModel


def utc_now() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(UTC)


class MealLog(SQLModel, table=True):
    """Persisted meal summary record."""

    __tablename__ = "meal_logs"

    id: int | None = Field(default=None, primary_key=True)
    meal_name: str = Field(default="Logged Meal", max_length=120)
    meal_type: str = Field(default="lunch", max_length=20)
    logged_at: datetime = Field(default_factory=utc_now, index=True)
    total_calories_kcal: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    total_fiber_g: float
    total_grams: float
    contains_visual_estimates: bool = False
    provider_used: str | None = Field(default=None, max_length=50)
    model_used: str | None = Field(default=None, max_length=80)

    items: list["MealLogItem"] = Relationship(
        back_populates="meal",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class MealLogItem(SQLModel, table=True):
    """Individual verified food entry belonging to a persisted MealLog."""

    __tablename__ = "meal_log_items"

    id: int | None = Field(default=None, primary_key=True)
    meal_id: int = Field(foreign_key="meal_logs.id", index=True)
    food_id: str | None = Field(default=None, max_length=80)
    food_name: str = Field(max_length=120)
    quantity: float
    unit: str = Field(max_length=30)
    resolved_grams: float
    quantity_source: str = Field(default="user_confirmed", max_length=30)
    calories_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    data_source: str | None = Field(default=None, max_length=120)

    meal: MealLog | None = Relationship(back_populates="items")