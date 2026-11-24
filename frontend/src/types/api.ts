export type QuantitySource = "visual_estimate" | "user_confirmed";

export type MatchType = "exact_id" | "exact_name" | "alias" | "fuzzy" | "unmatched";

export interface HealthResponse {
  status: string;
  environment: string;
  recognizer_provider: string;
  primary_model: string;
  fallback_model: string;
}

export interface FoodPredictionItem {
  id: string;
  detected_name: string;
  cuisine_category: string;
  confidence: number;
  estimated_grams: number;
  serving_description: string;
  preparation_notes: string | null;
  quantity_source: QuantitySource;
}

export interface ImageMetadata {
  filename: string;
  mime_type: string;
  processed_width: number;
  processed_height: number;
  processed_size_bytes: number;
}

export interface RecognitionResult {
  items: FoodPredictionItem[];
  provider: string;
  model_used: string;
  fallback_used: boolean;
  warning: string | null;
  portion_disclaimer: string;
  image_metadata: ImageMetadata | null;
}

export interface ServingUnitOption {
  unit: string;
  label: string;
  grams: number;
}

export interface FoodNutritionRecord {
  id: string;
  name: string;
  aliases: string[];
  cuisine_category: string;
  source: string;
  calories_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  fiber_g_per_100g: number;
  default_unit: string;
  serving_units: ServingUnitOption[];
}

export interface FoodSearchResponse {
  query: string;
  total_matches: number;
  foods: FoodNutritionRecord[];
}

export interface NutritionItemInput {
  food_id?: string | null;
  food_name: string;
  quantity: number;
  unit: string;
  quantity_source: QuantitySource;
}

export interface MealCalculationRequest {
  items: NutritionItemInput[];
}

export interface NutritionItemBreakdown {
  requested_name: string;
  matched: boolean;
  matched_food_id: string | null;
  matched_food_name: string | null;
  match_type: MatchType;
  data_source: string | null;
  quantity: number;
  unit: string;
  resolved_grams: number;
  quantity_source: QuantitySource;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  available_units: ServingUnitOption[];
  warning: string | null;
}

export interface NutritionTotals {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  total_grams: number;
}

export interface MacroCalorieSplit {
  protein_pct: number;
  carbs_pct: number;
  fat_pct: number;
}

export interface MealCalculationResponse {
  items: NutritionItemBreakdown[];
  totals: NutritionTotals;
  macro_calorie_split: MacroCalorieSplit;
  matched_count: number;
  unmatched_items: string[];
  contains_visual_estimates: boolean;
  disclaimer: string;
}

/** Local UI state for an editable meal item during the user verification step. */
export interface EditableMealItem {
  id: string;
  foodId: string | null;
  foodName: string;
  cuisineCategory: string;
  confidence: number | null;
  quantity: number;
  unit: string;
  servingHint: string;
  preparationNotes: string | null;
  quantitySource: QuantitySource;
  availableUnits: ServingUnitOption[];
}