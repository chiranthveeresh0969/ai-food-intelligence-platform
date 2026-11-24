import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  Database,
  Flame,
  Loader2,
  Scale,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { MealCalculationResponse, MealType } from "../types/api";

interface NutritionDashboardProps {
  result: MealCalculationResponse;
  isSavingMeal: boolean;
  saveError: string | null;
  savedMealId: number | null;
  onSaveMeal: (mealName: string, mealType: MealType) => Promise<void>;
}

const MACRO_COLORS = {
  protein: "#fb7185",
  carbs: "#34d399",
  fat: "#fbbf24",
};

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

function suggestMealName(result: MealCalculationResponse): string {
  const matchedNames = result.items
    .filter((item) => item.matched && item.matched_food_name)
    .map((item) => item.matched_food_name as string);

  if (matchedNames.length === 0) return "Logged Meal";
  if (matchedNames.length <= 2) return matchedNames.join(" & ");
  return `${matchedNames.slice(0, 2).join(", ")} +${matchedNames.length - 2} more`;
}

function suggestMealTypeByHour(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 19) return "snack";
  return "dinner";
}

export function NutritionDashboard({
  result,
  isSavingMeal,
  saveError,
  savedMealId,
  onSaveMeal,
}: NutritionDashboardProps) {
  const [mealName, setMealName] = useState(() => suggestMealName(result));
  const [mealType, setMealType] = useState<MealType>(() => suggestMealTypeByHour());

  useEffect(() => {
    setMealName(suggestMealName(result));
  }, [result]);

  const { totals, macro_calorie_split: split } = result;

  const chartData = [
    { name: "Protein", value: split.protein_pct, grams: totals.protein_g, color: MACRO_COLORS.protein },
    { name: "Carbohydrates", value: split.carbs_pct, grams: totals.carbs_g, color: MACRO_COLORS.carbs },
    { name: "Fat", value: split.fat_pct, grams: totals.fat_g, color: MACRO_COLORS.fat },
  ].filter((entry) => entry.value > 0);

  const canSave = result.matched_count > 0 && mealName.trim().length > 0 && !isSavingMeal;

  return (
    <section className="rounded-3xl border border-zinc-800/90 bg-zinc-950/85 p-6 backdrop-blur-sm md:p-8">
      {/* Header & Calorie Hero */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-zinc-800/80 pb-6">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-emerald-400 uppercase">
            Step 03 · Deterministic Nutrition Report
          </p>
          <h2 className="mt-1 font-serif text-4xl tracking-tight text-white">
            Meal Composition
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-zinc-300 tabular-nums">
              <Scale className="h-3.5 w-3.5 text-zinc-400" />
              Total weight: <strong className="text-white">{totals.total_grams} g</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-zinc-300">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              {result.matched_count} of {result.items.length} items verified
            </span>
            {result.contains_visual_estimates ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                Includes visual portion estimates
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                User-confirmed portions
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-1.5 text-xs font-medium tracking-wider text-zinc-400 uppercase">
            <Flame className="h-4 w-4 text-rose-400" />
            Total Energy
          </div>
          <p className="mt-1 font-serif text-5xl leading-none tracking-tight text-white tabular-nums">
            {totals.calories_kcal.toLocaleString()}
            <span className="ml-1.5 font-sans text-base font-medium text-zinc-400">
              kcal
            </span>
          </p>
        </div>
      </div>

      {/* Save to Persistent Meal History Bar */}
      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <label className="mb-1 block text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
              Meal Label
            </label>
            <input
              type="text"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Post-Workout Lunch"
              className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
              Meal Type
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            >
              {MEAL_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <button
              type="button"
              onClick={() => onSaveMeal(mealName.trim(), mealType)}
              disabled={!canSave || savedMealId !== null}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                savedMealId !== null
                  ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : "bg-white text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              }`}
            >
              {isSavingMeal ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : savedMealId !== null ? (
                <>
                  <BookmarkCheck className="h-4 w-4" />
                  Saved to Log
                </>
              ) : (
                <>
                  <BookmarkPlus className="h-4 w-4" />
                  Save to Meal Log
                </>
              )}
            </button>
          </div>
        </div>

        {saveError && (
          <p role="alert" className="mt-2.5 text-xs text-rose-300">
            {saveError}
          </p>
        )}
      </div>

      {/* Unmatched Warning Banner */}
      {result.unmatched_items.length > 0 && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="font-medium text-amber-100">
              Unmatched items excluded from totals: {result.unmatched_items.join(", ")}
            </p>
            <p className="mt-1 text-xs text-amber-200/80">
              To avoid fabricating nutritional numbers, unrecognized items contribute 0 kcal.
              Select a matching food from the search dropdown in Step 02 and recalculate.
            </p>
          </div>
        </div>
      )}

      {/* 4 Macro Stat Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Protein</span>
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">
            {totals.protein_g} g
          </p>
          <p className="mt-1 text-xs text-zinc-400 tabular-nums">
            {split.protein_pct}% of macro calories
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Carbohydrates</span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">
            {totals.carbs_g} g
          </p>
          <p className="mt-1 text-xs text-zinc-400 tabular-nums">
            {split.carbs_pct}% of macro calories
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Fat</span>
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">
            {totals.fat_g} g
          </p>
          <p className="mt-1 text-xs text-zinc-400 tabular-nums">
            {split.fat_pct}% of macro calories
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Dietary Fiber</span>
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">
            {totals.fiber_g} g
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Micronutrient &amp; digestive support
          </p>
        </div>
      </div>

      {/* Chart + Itemized Breakdown */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 lg:col-span-5">
          <h3 className="text-sm font-semibold text-zinc-100">
            Calorie Distribution by Macro
          </h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Atwater energy share (4 kcal/g protein &amp; carbs · 9 kcal/g fat)
          </p>

          {chartData.length > 0 ? (
            <>
              <div className="mt-4 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        borderColor: "#3f3f46",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "#f4f4f5",
                      }}
                      formatter={(value) => [`${value}%`, "Calorie share"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                {chartData.map((entry) => (
                  <div
                    key={entry.name}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-2 py-2"
                  >
                    <div className="flex items-center justify-center gap-1.5 text-zinc-400">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>{entry.name === "Carbohydrates" ? "Carbs" : entry.name}</span>
                    </div>
                    <p className="mt-1 font-semibold text-white tabular-nums">
                      {entry.value}%
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-56 items-center justify-center text-xs text-zinc-500">
              No matched items with caloric macros to chart.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 lg:col-span-7">
          <h3 className="text-sm font-semibold text-zinc-100">
            Item-by-Item Breakdown
          </h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Resolved gram weights and database provenance per food item
          </p>

          <div className="mt-4 space-y-3">
            {result.items.map((item, idx) => (
              <div
                key={`${item.requested_name}-${idx}`}
                className={`rounded-xl border p-3.5 ${
                  item.matched
                    ? "border-zinc-800 bg-zinc-950/70"
                    : "border-amber-500/35 bg-amber-500/5"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-100">
                        {item.matched_food_name || item.requested_name}
                      </p>
                      <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] tracking-wide text-zinc-400 uppercase">
                        {item.match_type.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400 tabular-nums">
                      {item.quantity} {item.unit}
                      {item.matched && ` → ${item.resolved_grams} g`}
                      {item.data_source && ` · Source: ${item.data_source}`}
                    </p>
                  </div>

                  <p className="text-base font-semibold text-white tabular-nums">
                    {item.calories_kcal}{" "}
                    <span className="text-xs font-normal text-zinc-400">kcal</span>
                  </p>
                </div>

                {item.matched ? (
                  <div className="mt-2.5 flex flex-wrap gap-4 border-t border-zinc-800/80 pt-2.5 text-xs text-zinc-300 tabular-nums">
                    <span>
                      Protein: <strong className="text-rose-300">{item.protein_g}g</strong>
                    </span>
                    <span>
                      Carbs: <strong className="text-emerald-300">{item.carbs_g}g</strong>
                    </span>
                    <span>
                      Fat: <strong className="text-amber-300">{item.fat_g}g</strong>
                    </span>
                    <span>
                      Fiber: <strong className="text-sky-300">{item.fiber_g}g</strong>
                    </span>
                  </div>
                ) : (
                  item.warning && (
                    <p className="mt-2 text-xs text-amber-300">{item.warning}</p>
                  )
                )}

                {item.matched && item.warning && (
                  <p className="mt-2 text-xs text-amber-300">{item.warning}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scientific & Data Provenance Disclaimer */}
      <p className="mt-6 rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-3.5 text-xs leading-relaxed text-zinc-400">
        {result.disclaimer}
      </p>
    </section>
  );
}