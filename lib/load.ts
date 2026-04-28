type ActivityLike = {
  date: string;
  type: string;
  km: number;
  durationMin: number;
};

export type LoadSummary = {
  avgWeeklyKm: number;
  longestRunKm: number;
  runsPerWeek: number;
  crossfitPerWeek: number;
  last4WeeksKm: number[];
};

const RUN_TYPES = ["run", "trailrun", "trail_run", "virtualrun", "virtual_run"];
const CROSSFIT_KEYWORDS = ["crossfit", "weight", "workout", "strength", "training"];

export function summarizeLoad(activities: ActivityLike[]): LoadSummary {
  const today = new Date();
  const buckets: { runs: number; crossfit: number; km: number }[] = Array.from(
    { length: 4 },
    () => ({ runs: 0, crossfit: 0, km: 0 }),
  );

  let longestRunKm = 0;

  for (const a of activities) {
    const d = new Date(a.date);
    const daysAgo = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo < 0 || daysAgo > 27) continue;

    const weekIdx = Math.min(3, Math.floor(daysAgo / 7));
    const label = a.type.toLowerCase();
    const isRun = RUN_TYPES.some((t) => label.includes(t));
    const isCrossfit =
      !isRun && CROSSFIT_KEYWORDS.some((k) => label.includes(k));

    if (isRun) {
      buckets[weekIdx].runs += 1;
      buckets[weekIdx].km += a.km;
      if (a.km > longestRunKm) longestRunKm = a.km;
    } else if (isCrossfit) {
      buckets[weekIdx].crossfit += 1;
    }
  }

  const totalKm = buckets.reduce((s, b) => s + b.km, 0);
  const totalRuns = buckets.reduce((s, b) => s + b.runs, 0);
  const totalCrossfit = buckets.reduce((s, b) => s + b.crossfit, 0);

  return {
    avgWeeklyKm: +(totalKm / 4).toFixed(1),
    longestRunKm: +longestRunKm.toFixed(2),
    runsPerWeek: +(totalRuns / 4).toFixed(1),
    crossfitPerWeek: +(totalCrossfit / 4).toFixed(1),
    last4WeeksKm: buckets.map((b) => +b.km.toFixed(1)).reverse(),
  };
}
