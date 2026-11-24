import { useState } from "react";
import {
  Calculator,
  CheckCircle2,
  Info,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type {
  EditableMealItem,
  FoodNutritionRecord,
  ServingUnitOption,
} from "../types/api";

interface VerificationPanelProps {
  items: EditableMealItem[];
  catalog: FoodNutritionRecord[];
  portionDisclaimer: string | null;
  isCalculating: boolean;
  calculationError: string | null;
  onUpdateItem: (id: string, patch: Partial<EditableMealItem>) => void;
  onSelectCatalogFood: (itemId: string, food: FoodNutritionRecord) => void;
  onRemoveItem: (id: string) => void;
  onAddManualItem: () => void;
  onConfirmAll: () => void;
  onCalculate: () => void;
}

const DEFAULT_UNITS: ServingUnitOption[] = [
  { unit: "g", label: "Grams (g)", grams: 1 },
  { unit: "serving", label: "Serving (~150g)", grams: 150 },
  { unit: "piece", label: "Piece (~100g)", grams: 100 },
  { unit: "katori", label: "Katori (~150g)", grams: 150 },
  { unit: "bowl", label: "Bowl (~200g)", grams: 200 },
  { unit: "cup", label: "Cup (~240g)", grams: 240 },
  { unit: "slice", label: "Slice (~35g)", grams: 35 },
  { unit: "tbsp", label: "Tbsp (~15g)", grams: 15 },
];

function getConfidenceStyle(confidence: number): string {
  if (confidence >= 0.8) {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  }
  if (confidence >= 0.55) {
    return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  }
  return "border-rose-500/40 bg-rose-500/15 text-rose-300";
}

function filterCatalog(
  catalog: FoodNutritionRecord[],
  query: string,
): FoodNutritionRecord[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return catalog.slice(0, 8);

  return catalog
    .filter((food) => {
      if (food.name.toLowerCase().includes(normalized)) return true;
      if (food.cuisine_category.toLowerCase().includes(normalized)) return true;
      return food.aliases.some((alias) => alias.toLowerCase().includes(normalized));
    })
    .slice(0, 8);
}

export function VerificationPanel({
  items,
  catalog,
  portionDisclaimer,
  isCalculating,
  calculationError,
  onUpdateItem,
  onSelectCatalogFood,
  onRemoveItem,
  onAddManualItem,
  onConfirmAll,
  onCalculate,
}: VerificationPanelProps) {
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const hasVisualEstimates = items.some(
    (item) => item.quantitySource === "visual_estimate",
  );

  return (
    <section className="rounded-3xl border border-zinc-800/90 bg-zinc-950/80 p-6 backdrop-blur-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-emerald-400 uppercase">
            Step 02 · Verify &amp; Portion
          </p>
          <h2 className="mt-1 font-serif text-3xl tracking-tight text-white">
            Confirm Detected Foods
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasVisualEstimates && items.length > 0 && (
            <button
              type="button"
              onClick={onConfirmAll}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirm all portions
            </button>
          )}
          <button
            type="button"
            onClick={onAddManualItem}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add food
          </button>
        </div>
      </div>

      {portionDisclaimer && items.length > 0 && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs leading-relaxed text-zinc-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <span>{portionDisclaimer}</span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-8 text-center">
          <p className="text-sm font-medium text-zinc-200">
            No food items queued yet
          </p>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-400">
            Upload and analyze a meal photo on the left, or click{" "}
            <strong className="text-zinc-200">Add food</strong> to build a meal
            manually from our verified database.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const unitOptions =
              item.availableUnits.length > 0 ? item.availableUnits : DEFAULT_UNITS;
            const suggestions =
              activeDropdownId === item.id
                ? filterCatalog(catalog, item.foodName)
                : [];

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="relative min-w-52 flex-1">
                    <label className="mb-1 block text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
                      Food Item (editable · searches verified DB)
                    </label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        value={item.foodName}
                        onFocus={() => setActiveDropdownId(item.id)}
                        onBlur={() => {
                          setTimeout(() => {
                            setActiveDropdownId((current) =>
                              current === item.id ? null : current,
                            );
                          }, 150);
                        }}
                        onChange={(e) => {
                          onUpdateItem(item.id, {
                            foodName: e.target.value,
                            foodId: null,
                            quantitySource: "user_confirmed",
                          });
                          setActiveDropdownId(item.id);
                        }}
                        placeholder="Search e.g. Chapati, Dal Tadka, Mango..."
                        className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950 py-2 pr-3 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {activeDropdownId === item.id && suggestions.length > 0 && (
                      <ul className="absolute z-30 mt-1.5 max-h-52 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 py-1 shadow-2xl">
                        {suggestions.map((food) => (
                          <li key={food.id}>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                onSelectCatalogFood(item.id, food);
                                setActiveDropdownId(null);
                              }}
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition hover:bg-zinc-800/80"
                            >
                              <div>
                                <p className="font-medium text-zinc-100">{food.name}</p>
                                <p className="text-[11px] text-zinc-400">
                                  {food.cuisine_category} · {food.calories_per_100g} kcal / 100g
                                </p>
                              </div>
                              <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300">
                                Select
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Remove ${item.foodName}`}
                    className="mt-5 rounded-xl border border-zinc-800 p-2 text-zinc-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Badges row */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                  {item.confidence !== null && (
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-medium tabular-nums ${getConfidenceStyle(
                        item.confidence,
                      )}`}
                    >
                      {Math.round(item.confidence * 100)}% confidence
                    </span>
                  )}

                  {item.foodId ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-emerald-300">
                      DB matched
                    </span>
                  ) : (
                    <span className="rounded-full border border-zinc-700 bg-zinc-800/70 px-2.5 py-0.5 text-zinc-300">
                      Will match on calculate
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateItem(item.id, {
                        quantitySource:
                          item.quantitySource === "visual_estimate"
                            ? "user_confirmed"
                            : "visual_estimate",
                      })
                    }
                    className={`rounded-full border px-2.5 py-0.5 font-medium transition ${
                      item.quantitySource === "user_confirmed"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                    }`}
                  >
                    {item.quantitySource === "user_confirmed"
                      ? "Portion confirmed"
                      : "Visual estimate · click to confirm"}
                  </button>

                  {item.preparationNotes && (
                    <span className="text-zinc-400">
                      Prep: {item.preparationNotes}
                    </span>
                  )}
                </div>

                {/* Portion inputs */}
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                    <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      max="5000"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => {
                        const parsed = Number.parseFloat(e.target.value);
                        onUpdateItem(item.id, {
                          quantity: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
                          quantitySource: "user_confirmed",
                        });
                      }}
                      className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950 px-3 py-2 text-sm tabular-nums text-zinc-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-8">
                    <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                      Unit {item.servingHint ? `· AI visual note: ${item.servingHint}` : ""}
                    </label>
                    <select
                      value={item.unit}
                      onChange={(e) => {
                        const nextUnit = e.target.value;
                        const wasGrams = item.unit === "g";
                        const nextQuantity =
                          wasGrams && nextUnit !== "g"
                            ? 1
                            : !wasGrams && nextUnit === "g"
                              ? Math.round(
                                  (unitOptions.find((u) => u.unit === item.unit)?.grams ??
                                    100) * item.quantity,
                                )
                              : item.quantity;

                        onUpdateItem(item.id, {
                          unit: nextUnit,
                          quantity: nextQuantity > 0 ? nextQuantity : 1,
                          quantitySource: "user_confirmed",
                        });
                      }}
                      className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                    >
                      {unitOptions.map((option) => (
                        <option key={option.unit} value={option.unit}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {calculationError && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-sm text-rose-200"
        >
          {calculationError}
        </div>
      )}

      {items.length > 0 && (
        <button
          type="button"
          onClick={onCalculate}
          disabled={isCalculating}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCalculating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Computing Deterministic Nutrition...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4" />
              Calculate Calories &amp; Macros
            </>
          )}
        </button>
      )}
    </section>
  );
}