from abc import ABC, abstractmethod
from typing import Literal

from app.schemas.nutrition import FoodNutritionRecord

MatchType = Literal["exact_id", "exact_name", "alias", "fuzzy"]


class NutritionProvider(ABC):
    """Abstract interface for food composition lookups and autocomplete search."""

    @abstractmethod
    def get_by_id(self, food_id: str) -> FoodNutritionRecord | None:
        """Return a food record by exact canonical ID, or None if missing."""

    @abstractmethod
    def match_food(
        self,
        name: str,
        food_id: str | None = None,
    ) -> tuple[FoodNutritionRecord, MatchType] | None:
        """Resolve a food ID or free-text name to a verified nutrition record."""

    @abstractmethod
    def search(self, query: str = "", limit: int = 20) -> list[FoodNutritionRecord]:
        """Search foods by partial name or alias for user verification and correction."""