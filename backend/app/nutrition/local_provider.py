import json
import re
from functools import lru_cache
from pathlib import Path

from app.nutrition.base import MatchType, NutritionProvider
from app.schemas.nutrition import FoodNutritionRecord

SEED_DATA_PATH = Path(__file__).resolve().parent / "data" / "foods_seed.json"
TOKEN_SPLIT_RE = re.compile(r"[^a-z0-9\s]+")


def normalize_text(value: str) -> str:
    """Lowercase and strip punctuation/extra spaces for consistent food matching."""
    cleaned = TOKEN_SPLIT_RE.sub(" ", value.lower())
    return " ".join(cleaned.split())


class LocalJsonNutritionProvider(NutritionProvider):
    """Curated JSON-backed nutrition database with exact, alias, and controlled fuzzy matching."""

    def __init__(self, data_path: Path = SEED_DATA_PATH) -> None:
        raw_records = json.loads(data_path.read_text(encoding="utf-8"))
        self._foods: list[FoodNutritionRecord] = [
            FoodNutritionRecord.model_validate(item) for item in raw_records
        ]
        self._by_id: dict[str, FoodNutritionRecord] = {f.id: f for f in self._foods}
        self._by_name: dict[str, FoodNutritionRecord] = {
            normalize_text(f.name): f for f in self._foods
        }
        self._by_alias: dict[str, FoodNutritionRecord] = {}
        for food in self._foods:
            for alias in food.aliases:
                self._by_alias[normalize_text(alias)] = food

    def get_by_id(self, food_id: str) -> FoodNutritionRecord | None:
        return self._by_id.get(food_id.strip().lower())

    def match_food(
        self,
        name: str,
        food_id: str | None = None,
    ) -> tuple[FoodNutritionRecord, MatchType] | None:
        if food_id:
            exact_id_hit = self.get_by_id(food_id)
            if exact_id_hit:
                return exact_id_hit, "exact_id"

        normalized = normalize_text(name)
        if not normalized:
            return None

        if normalized in self._by_name:
            return self._by_name[normalized], "exact_name"

        if normalized in self._by_alias:
            return self._by_alias[normalized], "alias"

        query_tokens = set(normalized.split())
        best_food: FoodNutritionRecord | None = None
        best_score = 0.0

        for food in self._foods:
            candidates = [normalize_text(food.name), *(normalize_text(a) for a in food.aliases)]
            for candidate in candidates:
                if not candidate:
                    continue
                cand_tokens = set(candidate.split())

                # Prefer whole-phrase inclusion (e.g. "fresh alphonso mango" -> "alphonso mango")
                padded_query = f" {normalized} "
                padded_cand = f" {candidate} "
                if padded_cand in padded_query or padded_query in padded_cand:
                    specificity = len(cand_tokens & query_tokens) / max(len(cand_tokens), len(query_tokens))
                    score = 0.70 + (0.25 * specificity)
                else:
                    overlap = len(query_tokens & cand_tokens)
                    union = len(query_tokens | cand_tokens)
                    score = overlap / union if union else 0.0

                if score > best_score:
                    best_score = score
                    best_food = food

        if best_food and best_score >= 0.50:
            return best_food, "fuzzy"

        return None

    def search(self, query: str = "", limit: int = 20) -> list[FoodNutritionRecord]:
        normalized = normalize_text(query)
        if not normalized:
            return sorted(self._foods, key=lambda f: f.name)[:limit]

        scored: list[tuple[int, str, FoodNutritionRecord]] = []
        for food in self._foods:
            norm_name = normalize_text(food.name)
            norm_aliases = [normalize_text(a) for a in food.aliases]

            if norm_name.startswith(normalized):
                rank = 0
            elif any(alias.startswith(normalized) for alias in norm_aliases):
                rank = 1
            elif normalized in norm_name:
                rank = 2
            elif any(normalized in alias for alias in norm_aliases):
                rank = 3
            elif normalized in normalize_text(food.cuisine_category):
                rank = 4
            else:
                continue

            scored.append((rank, food.name, food))

        scored.sort(key=lambda entry: (entry[0], entry[1]))
        return [entry[2] for entry in scored[:limit]]


@lru_cache
def get_nutrition_provider() -> NutritionProvider:
    """Return a cached NutritionProvider instance so seed JSON is parsed once."""
    return LocalJsonNutritionProvider()