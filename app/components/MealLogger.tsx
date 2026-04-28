"use client";
import { useEffect, useState, useMemo } from "react";

type Meal = {
  id: number;
  name: string;
  mealType: string;
  portionDescription: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number | null;
  notes: string | null;
};

type Log = {
  id: number;
  mealId: number;
  mealType: string;
  portions: number;
  date: string;
  meal: Meal;
};

type Targets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type TrainingSession = {
  name: string;
  sportType: string;
  km: number;
  minutes: number;
  kcal: number | null;
};

type Training = {
  count: number;
  burnedKcal: number;
  sessions: TrainingSession[];
};

export default function MealLogger({
  targets,
  training,
}: {
  targets: Targets;
  training: Training;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  const [portions, setPortions] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [mealsRes, logsRes] = await Promise.all([
      fetch("/api/meals").then((r) => r.json()),
      fetch(`/api/meal-log?date=${today}`).then((r) => r.json()),
    ]);
    setMeals(mealsRes.meals);
    setLogs(logsRes.logs);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    return logs.reduce(
      (acc, l) => {
        const p = l.portions;
        acc.calories += l.meal.calories * p;
        acc.protein += l.meal.proteinGrams * p;
        acc.carbs += l.meal.carbsGrams * p;
        acc.fat += l.meal.fatGrams * p;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [logs]);

  const groupedMeals = useMemo(() => {
    const g: Record<string, Meal[]> = {};
    for (const m of meals) (g[m.mealType] ??= []).push(m);
    return g;
  }, [meals]);

  const logMeal = async () => {
    if (!selectedMealId) return;
    await fetch("/api/meal-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealId: selectedMealId, portions, date: today }),
    });
    setSelectedMealId(null);
    setPortions(1);
    await load();
  };

  const removeLog = async (id: number) => {
    await fetch(`/api/meal-log/${id}`, { method: "DELETE" });
    await load();
  };

  if (loading) {
    return <p className="display-italic text-[14px] text-smoke">Loading meals…</p>;
  }

  const selected = selectedMealId ? meals.find((m) => m.id === selectedMealId) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-md">
      {/* LEFT COLUMN — Training + macros */}
      <div className="lg:col-span-3 space-y-sm">
        {/* Training today */}
        <article className="card card-hover p-md sm:p-lg">
          <div className="flex items-end justify-between gap-sm flex-wrap mb-md">
            <div>
              <p className="eyebrow mb-xs">Training</p>
              <div className="flex items-baseline gap-xs">
                <span className="stat-big text-[44px] sm:text-[52px]">{training.burnedKcal}</span>
                <span className="display-italic text-[16px] text-smoke">kcal burned</span>
              </div>
            </div>
            <p className="display-italic text-[14px] text-smoke">
              {training.count} session{training.count === 1 ? "" : "s"}
            </p>
          </div>

          {training.sessions.length === 0 ? (
            <p className="display-italic text-[14px] text-smoke">
              No activity logged today yet. Lace up.
            </p>
          ) : (
            <ul className="space-y-xs">
              {training.sessions.map((s, i) => (
                <li
                  key={i}
                  className="flex justify-between gap-sm text-[14px] sm:text-[15px] pt-xs first:pt-0"
                >
                  <span>
                    <span className="text-ink">{s.sportType}</span>
                    {s.km > 0 ? <span className="text-smoke"> · {s.km} km</span> : null}
                    <span className="text-smoke"> · {s.minutes} min</span>
                    <span className="block display-italic text-[13px] text-smoke mt-[2px]">
                      {s.name}
                    </span>
                  </span>
                  <span className="text-ink whitespace-nowrap">
                    {s.kcal !== null ? `${s.kcal} kcal` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        {/* Macro progress */}
        <div className="grid grid-cols-2 gap-xs sm:gap-sm">
          <Progress label="Calories" value={totals.calories} target={targets.calories} unit="kcal" />
          <Progress label="Protein" value={totals.protein} target={targets.protein} unit="g" />
          <Progress label="Carbs" value={totals.carbs} target={targets.carbs} unit="g" />
          <Progress label="Fat" value={totals.fat} target={targets.fat} unit="g" />
        </div>
      </div>

      {/* RIGHT COLUMN — Log meal + today's entries */}
      <div className="lg:col-span-2 space-y-sm">
        <article className="card p-md sm:p-lg">
          <p className="eyebrow mb-md">Log a meal</p>
          <div className="space-y-sm">
            <div>
              <label htmlFor="meal" className="eyebrow block mb-xs text-[14px]">Meal</label>
              <select
                id="meal"
                value={selectedMealId ?? ""}
                onChange={(e) => setSelectedMealId(e.target.value ? Number(e.target.value) : null)}
                className="field"
              >
                <option value="">— choose a meal —</option>
                {Object.entries(groupedMeals).map(([type, list]) => (
                  <optgroup key={type} label={type}>
                    {list.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} · {m.calories} kcal
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="flex gap-xs items-end">
              <div className="flex-1">
                <label htmlFor="portions" className="eyebrow block mb-xs text-[14px]">Portions</label>
                <input
                  id="portions"
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={portions}
                  onChange={(e) => setPortions(Number(e.target.value) || 1)}
                  className="field"
                />
              </div>
              <button
                onClick={logMeal}
                disabled={!selectedMealId}
                className="btn-primary shrink-0"
              >
                Log meal
              </button>
            </div>
          </div>

          {selected && (
            <div className="mt-md pt-md border-t border-linen">
              <p className="display text-[17px] sm:text-[19px] tracking-[-0.01em] leading-[1.3]">
                {selected.portionDescription}
              </p>
              <p className="mt-xs text-[13px] text-smoke">
                {selected.calories} kcal · P{selected.proteinGrams}g · C{selected.carbsGrams}g · F{selected.fatGrams}g
                {selected.fiberGrams ? ` · Fiber ${selected.fiberGrams}g` : ""}
              </p>
              {selected.notes && (
                <p className="mt-xs display-italic text-[13px] text-smoke">{selected.notes}</p>
              )}
            </div>
          )}
        </article>

        {/* Today's entries */}
        <article className="card p-md sm:p-lg">
          <p className="eyebrow mb-md">Today's entries</p>
          <div className="space-y-xs">
            {logs.length === 0 && (
              <p className="display-italic text-[14px] text-smoke">
                Nothing logged yet. Breakfast calling.
              </p>
            )}
            {logs.map((l) => (
              <div
                key={l.id}
                className="group flex items-start justify-between gap-sm py-xs border-b border-linen last:border-b-0"
              >
                <div>
                  <p className="text-[15px] text-ink">
                    {l.meal.name}
                    {l.portions !== 1 && <span className="text-smoke"> × {l.portions}</span>}
                  </p>
                  <p className="text-[12px] text-smoke mt-[2px]">
                    {l.mealType.charAt(0).toUpperCase() + l.mealType.slice(1)} · {Math.round(l.meal.calories * l.portions)} kcal · P{Math.round(l.meal.proteinGrams * l.portions)} C{Math.round(l.meal.carbsGrams * l.portions)} F{Math.round(l.meal.fatGrams * l.portions)}
                  </p>
                </div>
                <button
                  onClick={() => removeLog(l.id)}
                  className="text-[12px] text-smoke hover:text-obsidian opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity px-xs"
                  aria-label="Remove meal"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

function Progress({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const over = value > target;
  return (
    <div className="card p-sm sm:p-md">
      <p className="eyebrow mb-xs text-[13px]">{label}</p>
      <div className="flex items-baseline gap-xs">
        <span className="stat-med text-[28px] sm:text-[34px]">{Math.round(value)}</span>
        <span className="text-[12px] text-smoke">/ {target} {unit}</span>
      </div>
      <div className="mt-sm h-[4px] rounded-full bg-linen-soft overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: over
              ? "linear-gradient(90deg, #0F1F17, #3D5948)"
              : "linear-gradient(90deg, #D4A657, #C4892F)",
          }}
        />
      </div>
    </div>
  );
}
