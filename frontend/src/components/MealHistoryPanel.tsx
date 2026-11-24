import { Clock, Flame, History, Loader2, Trash2 } from "lucide-react";
import type { MealHistoryResponse } from "../types/api";

interface MealHistoryPanelProps {
  history: MealHistoryResponse | null;
  isLoading: boolean;
  deletingId: number | null;
  onDeleteMeal: (mealId: number) => void;
}

function formatTimestamp(isoString: string): string {
  const normalized =
    isoString.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(isoString)
      ? isoString
      : `${isoString}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MealHistoryPanel({
  history,
  isLoading,
  deletingId,
  onDeleteMeal,
}: MealHistoryPanelProps) {
  const daily = history?.daily_summary;
  const meals = history?.meals ?? [];

  return (
    <section className="rounded-3xl border border-zinc-800/90 bg-zinc-950/80 p-6 backdrop-blur-sm md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-emerald-400 uppercase">
            Persistent Log · SQLite (SQLModel ORM)
          </p>
          <h2 className="mt-1 font-serif text-3xl tracking-tight text-white">
            Recent Meal History
          </h2>
        </div>

        {daily && (
          <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3.5 py-1.5 text-zinc-200">
              <Flame className="h-3.5 w-3.5 text-rose-400" />
              Today: <strong className="text-white">{daily.calories_kcal} kcal</strong>
            </span>
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-300">
              P <strong className="text-rose-300">{daily.protein_g}g</strong> · C{" "}
              <strong className="text-emerald-300">{daily.carbs_g}g</strong> · F{" "}
              <strong className="text-amber-300">{daily.fat_g}g</strong>
            </span>
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-400">
              {daily.meals_logged_today} logged today
            </span>
          </div>
        )}
      </div>

      {isLoading && meals.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
          Loading meal history...
        </div>
      ) : meals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400">
            <History className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-zinc-200">No saved meals yet</p>
          <p className="mt-1 max-w-md text-xs text-zinc-400">
            Calculate any meal above and click{" "}
            <strong className="text-zinc-200">Save to Meal Log</strong> to store it in
            the local SQLite database and track daily calorie totals.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {meals.map((meal) => (
            <article
              key={meal.id}
              className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4 transition hover:border-zinc-700"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">
                        {meal.meal_name}
                      </h3>
                      <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-0.5 text-[10px] font-medium tracking-wider text-zinc-300 uppercase">
                        {meal.meal_type}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(meal.logged_at)}
                      {meal.model_used && ` · ${meal.model_used}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-white tabular-nums">
                      {meal.total_calories_kcal}{" "}
                      <span className="text-xs font-normal text-zinc-400">kcal</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteMeal(meal.id)}
                      disabled={deletingId === meal.id}
                      aria-label={`Delete ${meal.meal_name}`}
                      className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                    >
                      {deletingId === meal.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {meal.items.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full border border-zinc-800 bg-zinc-950/80 px-2.5 py-0.5 text-[11px] text-zinc-300 tabular-nums"
                    >
                      {item.food_name} ({item.resolved_grams}g)
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3.5 flex flex-wrap gap-4 border-t border-zinc-800/80 pt-2.5 text-xs text-zinc-400 tabular-nums">
                <span>
                  Protein: <strong className="text-rose-300">{meal.total_protein_g}g</strong>
                </span>
                <span>
                  Carbs: <strong className="text-emerald-300">{meal.total_carbs_g}g</strong>
                </span>
                <span>
                  Fat: <strong className="text-amber-300">{meal.total_fat_g}g</strong>
                </span>
                <span>
                  Fiber: <strong className="text-sky-300">{meal.total_fiber_g}g</strong>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}