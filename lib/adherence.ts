import { prisma } from "./db";
import { istDayStartUTC, istMondayStartUTC } from "./tz";

const WEEKS_BACK = 12;
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CALORIE_TARGET = 2278;
const CALORIE_TOL = 0.1;
const PROTEIN_TARGET = 160;
const PROTEIN_MIN_PCT = 0.9;

const CROSSFIT_KEYWORDS = ["crossfit", "weight", "workout", "strength", "training"];

export type DayScore = {
  date: string;
  inFuture: boolean;
  workoutHit: boolean | null;
  nutritionHit: boolean | null;
  planFocus: string | null;
  plannedKm: number | null;
  actualKm: number;
  calories: number;
  protein: number;
  mealCount: number;
};

function startOfIstDay(d: Date) {
  return istDayStartUTC(d);
}

function mondayOf(d: Date) {
  return istMondayStartUTC(d);
}

function istKey(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function istWeekday(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short" });
  const label = fmt.format(d);
  return DAY_SHORT.find((d) => label.startsWith(d)) ?? label;
}

export async function computeAdherence(
  userId: number,
  raceDate: Date,
): Promise<DayScore[][]> {
  const now = new Date();
  const endDay = startOfIstDay(now);
  const startWeek = new Date(mondayOf(now).getTime() - (WEEKS_BACK - 1) * 7 * 24 * 60 * 60 * 1000);

  const raceWeekStart = mondayOf(raceDate);
  const weeksSpan =
    Math.floor((raceWeekStart.getTime() - startWeek.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const totalWeeks = Math.max(WEEKS_BACK, weeksSpan);

  const [activities, logs, plans] = await Promise.all([
    prisma.activity.findMany({
      where: { userId, startDate: { gte: startWeek } },
      orderBy: { startDate: "asc" },
    }),
    prisma.mealLog.findMany({
      where: { userId, date: { gte: startWeek } },
      include: { meal: true },
    }),
    prisma.plan.findMany({
      where: { userId, weekStart: { gte: startWeek } },
    }),
  ]);

  const activityByDate = new Map<string, typeof activities>();
  for (const a of activities) {
    const key = istKey(a.startDate);
    const arr = activityByDate.get(key) ?? [];
    arr.push(a);
    activityByDate.set(key, arr);
  }

  const logsByDate = new Map<string, typeof logs>();
  for (const l of logs) {
    const key = istKey(l.date);
    const arr = logsByDate.get(key) ?? [];
    arr.push(l);
    logsByDate.set(key, arr);
  }

  const planByWeekStart = new Map<string, ReturnType<typeof parsePlan>>();
  for (const p of plans) {
    const key = istKey(p.weekStart);
    planByWeekStart.set(key, parsePlan(p.contentJson));
  }

  const todayKey = istKey(endDay);
  const grid: DayScore[][] = [];

  for (let w = 0; w < totalWeeks; w++) {
    const week: DayScore[] = [];
    const weekStart = new Date(startWeek.getTime() + w * 7 * 24 * 60 * 60 * 1000);
    const weekPlan = planByWeekStart.get(istKey(weekStart));

    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart.getTime() + d * 24 * 60 * 60 * 1000);
      const key = istKey(date);
      const dayName = istWeekday(date);
      const inFuture = key > todayKey;

      const dayPlan = weekPlan?.days.find((x) => x.day === dayName);
      const dayActivities = activityByDate.get(key) ?? [];
      const dayLogs = logsByDate.get(key) ?? [];

      const actualKm =
        dayActivities.reduce((sum, a) => sum + a.distanceMeters, 0) / 1000;

      const calories = dayLogs.reduce(
        (sum, l) => sum + l.meal.calories * l.portions,
        0,
      );
      const protein = dayLogs.reduce(
        (sum, l) => sum + l.meal.proteinGrams * l.portions,
        0,
      );

      const workoutHit = inFuture ? null : scoreWorkout(dayPlan, dayActivities, actualKm);
      const nutritionHit = inFuture ? null : scoreNutrition(calories, protein, dayLogs.length);

      week.push({
        date: key,
        inFuture,
        workoutHit,
        nutritionHit,
        planFocus: dayPlan?.focus ?? null,
        plannedKm: dayPlan?.targetDistanceKm ?? null,
        actualKm,
        calories,
        protein,
        mealCount: dayLogs.length,
      });
    }
    grid.push(week);
  }

  return grid;
}

type PlannedDay = {
  day: string;
  focus: string;
  targetDistanceKm?: number;
};

function parsePlan(contentJson: string): { days: PlannedDay[] } {
  try {
    const parsed = JSON.parse(contentJson);
    return { days: Array.isArray(parsed.days) ? parsed.days : [] };
  } catch {
    return { days: [] };
  }
}

function scoreWorkout(
  plan: PlannedDay | undefined,
  activities: { sportType: string; type: string }[],
  actualKm: number,
): boolean {
  if (!plan) {
    return activities.length > 0;
  }
  if (plan.focus === "rest") return true;
  if (plan.focus.endsWith("_run") || plan.focus === "long_run") {
    const planned = plan.targetDistanceKm ?? 0;
    if (planned === 0) return activities.length > 0;
    return actualKm >= planned * 0.7;
  }
  if (plan.focus === "crossfit" || plan.focus === "cross_train") {
    return activities.some((a) => {
      const label = `${a.sportType} ${a.type}`.toLowerCase();
      return CROSSFIT_KEYWORDS.some((k) => label.includes(k));
    });
  }
  return activities.length > 0;
}

function scoreNutrition(calories: number, protein: number, mealCount: number): boolean {
  if (mealCount === 0) return false;
  const minCal = CALORIE_TARGET * (1 - CALORIE_TOL);
  const maxCal = CALORIE_TARGET * (1 + CALORIE_TOL);
  const minProtein = PROTEIN_TARGET * PROTEIN_MIN_PCT;
  return calories >= minCal && calories <= maxCal && protein >= minProtein;
}
