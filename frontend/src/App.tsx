import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";
import { MealHistoryPanel } from "./components/MealHistoryPanel";
import { NutritionDashboard } from "./components/NutritionDashboard";
import { UploadPanel } from "./components/UploadPanel";
import { VerificationPanel } from "./components/VerificationPanel";
import {
  analyzeFoodImage,
  calculateMealNutrition,
  checkHealth,
  createMealLog,
  deleteMealLog,
  listMealLogs,
  searchFoods,
} from "./services/api";
import type {
  EditableMealItem,
  FoodNutritionRecord,
  FoodPredictionItem,
  HealthResponse,
  MealCalculationResponse,
  MealHistoryResponse,
  MealType,
  RecognitionResult,
} from "./types/api";

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestCatalogMatch(
  detectedName: string,
  catalog: FoodNutritionRecord[],
): FoodNutritionRecord | null {
  const norm = normalizeName(detectedName);
  if (!norm) return null;

  for (const food of catalog) {
    if (normalizeName(food.name) === norm) return food;
  }
  for (const food of catalog) {
    if (food.aliases.some((alias) => normalizeName(alias) === norm)) return food;
  }
  for (const food of catalog) {
    const candidates = [food.name, ...food.aliases].map(normalizeName);
    if (candidates.some((cand) => cand && (norm.includes(cand) || cand.includes(norm)))) {
      return food;
    }
  }
  return null;
}

function mapPredictionToEditable(
  prediction: FoodPredictionItem,
  catalog: FoodNutritionRecord[],
): EditableMealItem {
  const matched = findBestCatalogMatch(prediction.detected_name, catalog);
  return {
    id: prediction.id,
    foodId: matched?.id ?? null,
    foodName: matched?.name ?? prediction.detected_name,
    cuisineCategory: matched?.cuisine_category ?? prediction.cuisine_category,
    confidence: prediction.confidence,
    quantity: prediction.estimated_grams,
    unit: "g",
    servingHint: prediction.serving_description,
    preparationNotes: prediction.preparation_notes,
    quantitySource: prediction.quantity_source,
    availableUnits: matched?.serving_units ?? [],
  };
}

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [backendOffline, setBackendOffline] = useState(false);
  const [catalog, setCatalog] = useState<FoodNutritionRecord[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<RecognitionResult | null>(null);

  const [editableItems, setEditableItems] = useState<EditableMealItem[]>([]);

  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [calculation, setCalculation] = useState<MealCalculationResponse | null>(null);

  const [mealHistory, setMealHistory] = useState<MealHistoryResponse | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMealId, setSavedMealId] = useState<number | null>(null);
  const [deletingMealId, setDeletingMealId] = useState<number | null>(null);

  const refreshHistory = async () => {
    try {
      const historyData = await listMealLogs(20);
      setMealHistory(historyData);
    } catch {
      // Non-fatal if history endpoint is temporarily unreachable
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const [healthData, catalogData, historyData] = await Promise.all([
          checkHealth(),
          searchFoods("", 100),
          listMealLogs(20),
        ]);
        if (!active) return;
        setHealth(healthData);
        setCatalog(catalogData.foods);
        setMealHistory(historyData);
        setBackendOffline(false);
      } catch {
        if (!active) return;
        setBackendOffline(true);
      } finally {
        if (active) setIsLoadingHistory(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalysisError(null);
    setCalculationError(null);
    setSaveError(null);
    setSavedMealId(null);
    setRecognition(null);
    setEditableItems([]);
    setCalculation(null);
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisError(null);
    setCalculationError(null);
    setSaveError(null);
    setSavedMealId(null);
    setRecognition(null);
    setEditableItems([]);
    setCalculation(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setCalculationError(null);
    setSaveError(null);
    setSavedMealId(null);
    setCalculation(null);

    try {
      const result = await analyzeFoodImage(selectedFile);
      setRecognition(result);
      setEditableItems(
        result.items.map((item) => mapPredictionToEditable(item, catalog)),
      );
    } catch (err) {
      setAnalysisError(
        err instanceof Error
          ? err.message
          : "Could not reach the recognition API. Ensure FastAPI is running on port 8000.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateItem = (id: string, patch: Partial<EditableMealItem>) => {
    setSavedMealId(null);
    setEditableItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const handleSelectCatalogFood = (itemId: string, food: FoodNutritionRecord) => {
    setSavedMealId(null);
    setEditableItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const preferredUnit = food.default_unit || "serving";
        const hasPreferred = food.serving_units.some((u) => u.unit === preferredUnit);
        return {
          ...item,
          foodId: food.id,
          foodName: food.name,
          cuisineCategory: food.cuisine_category,
          availableUnits: food.serving_units,
          unit: hasPreferred ? preferredUnit : "g",
          quantity: hasPreferred ? 1 : 100,
          quantitySource: "user_confirmed",
        };
      }),
    );
  };

  const handleRemoveItem = (id: string) => {
    setSavedMealId(null);
    setEditableItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddManualItem = () => {
    setSavedMealId(null);
    const newItem: EditableMealItem = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      foodId: null,
      foodName: "",
      cuisineCategory: "General",
      confidence: null,
      quantity: 1,
      unit: "serving",
      servingHint: "",
      preparationNotes: null,
      quantitySource: "user_confirmed",
      availableUnits: [],
    };
    setEditableItems((prev) => [...prev, newItem]);
  };

  const handleConfirmAll = () => {
    setSavedMealId(null);
    setEditableItems((prev) =>
      prev.map((item) => ({ ...item, quantitySource: "user_confirmed" })),
    );
  };

  const handleCalculate = async () => {
    const validItems = editableItems.filter(
      (item) => item.foodName.trim().length > 0 && item.quantity > 0,
    );

    if (validItems.length === 0) {
      setCalculationError(
        "Enter at least one food name and a positive quantity before calculating.",
      );
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);
    setSaveError(null);
    setSavedMealId(null);

    try {
      const response = await calculateMealNutrition({
        items: validItems.map((item) => ({
          food_id: item.foodId,
          food_name: item.foodName.trim(),
          quantity: item.quantity,
          unit: item.unit,
          quantity_source: item.quantitySource,
        })),
      });
      setCalculation(response);
    } catch (err) {
      setCalculationError(
        err instanceof Error
          ? err.message
          : "Nutrition calculation failed. Check that the backend server is running.",
      );
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveMeal = async (mealName: string, mealType: MealType) => {
    const validItems = editableItems.filter(
      (item) => item.foodName.trim().length > 0 && item.quantity > 0,
    );
    if (validItems.length === 0) return;

    setIsSavingMeal(true);
    setSaveError(null);

    try {
      const saved = await createMealLog({
        meal_name: mealName || "Logged Meal",
        meal_type: mealType,
        provider_used: recognition?.provider ?? "manual",
        model_used: recognition?.model_used ?? null,
        items: validItems.map((item) => ({
          food_id: item.foodId,
          food_name: item.foodName.trim(),
          quantity: item.quantity,
          unit: item.unit,
          quantity_source: item.quantitySource,
        })),
      });
      setSavedMealId(saved.id);
      await refreshHistory();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save meal to history.",
      );
    } finally {
      setIsSavingMeal(false);
    }
  };

  const handleDeleteMeal = async (mealId: number) => {
    setDeletingMealId(mealId);
    try {
      await deleteMealLog(mealId);
      if (savedMealId === mealId) setSavedMealId(null);
      await refreshHistory();
    } finally {
      setDeletingMealId(null);
    }
  };

  const activeStage = calculation ? 3 : editableItems.length > 0 ? 2 : 1;

  return (
    <div className="bg-editorial-glow min-h-screen">
      {/* Top Navigation */}
      <header className="border-b border-zinc-900/90 bg-[#09090b]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-950">
              <Leaf className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">
                Food Intelligence
              </p>
              <p className="text-[11px] text-zinc-400">
                Vision · Deterministic Nutrition · Portfolio MVP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {backendOffline ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3.5 py-1 text-xs font-medium text-rose-300">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                Backend offline (port 8000)
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3.5 py-1 text-xs text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                API Online · {catalog.length} verified foods
                {health ? ` · ${health.recognizer_provider}` : ""}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Editorial Hero Header */}
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <h1 className="font-serif text-5xl leading-[1.02] tracking-tight text-white sm:text-6xl">
              Nutritional clarity,{" "}
              <span className="italic text-emerald-300">from plate to data.</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
              Upload any meal photo for multi-dish AI recognition, verify items and
              real household portions, and compute deterministic calorie and macro
              breakdowns grounded in USDA &amp; ICMR-NIN IFCT data.
            </p>
          </div>

          <ol className="flex items-center gap-2 text-xs font-medium">
            {[
              { step: 1, label: "01 Capture" },
              { step: 2, label: "02 Verify" },
              { step: 3, label: "03 Nutrition" },
            ].map((stage) => (
              <li
                key={stage.step}
                className={`rounded-full border px-3.5 py-1.5 transition ${
                  activeStage >= stage.step
                    ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-500"
                }`}
              >
                {stage.label}
              </li>
            ))}
          </ol>
        </div>

        {/* Main 2-Column Workspace */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <UploadPanel
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              isAnalyzing={isAnalyzing}
              error={analysisError}
              recognition={recognition}
              onFileSelect={handleFileSelect}
              onAnalyze={handleAnalyze}
              onReset={handleReset}
            />
          </div>

          <div className="lg:col-span-7">
            <VerificationPanel
              items={editableItems}
              catalog={catalog}
              portionDisclaimer={recognition?.portion_disclaimer ?? null}
              isCalculating={isCalculating}
              calculationError={calculationError}
              onUpdateItem={handleUpdateItem}
              onSelectCatalogFood={handleSelectCatalogFood}
              onRemoveItem={handleRemoveItem}
              onAddManualItem={handleAddManualItem}
              onConfirmAll={handleConfirmAll}
              onCalculate={handleCalculate}
            />
          </div>
        </div>

        {/* Full-Width Results Dashboard */}
        {calculation && (
          <div className="mt-8">
            <NutritionDashboard
              result={calculation}
              isSavingMeal={isSavingMeal}
              saveError={saveError}
              savedMealId={savedMealId}
              onSaveMeal={handleSaveMeal}
            />
          </div>
        )}

        {/* Persistent SQLite Meal History */}
        <div className="mt-8">
          <MealHistoryPanel
            history={mealHistory}
            isLoading={isLoadingHistory}
            deletingId={deletingMealId}
            onDeleteMeal={handleDeleteMeal}
          />
        </div>
      </main>
    </div>
  );
}

export default App;