import OpenAI from "openai";
import { prisma } from "./db";
import {
  mifflinStJeor,
  activityFactor,
  proteinTargetGrams,
  carbTargetGramsRunDay,
  carbTargetGramsEasyDay,
  fatTargetGrams,
} from "./nutrition";
import { DAILY_TARGETS } from "./targets";
import { summarizeLoad, type LoadSummary } from "./load";

export type DayPlan = {
  day: string;
  date: string;
  focus: "long_run" | "tempo_run" | "easy_run" | "interval_run" | "crossfit" | "rest" | "cross_train";
  session: string;
  durationMinutes?: number;
  targetDistanceKm?: number;
  nutrition: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    notes: string;
  };
  coachNotes?: string;
};

export type WeekPlan = {
  weekNumber: number;
  weekStart: string;
  weeksToRace: number;
  phase: "base" | "build" | "peak" | "taper" | "race_week";
  summary: string;
  weeklyMileageKm: number;
  days: DayPlan[];
  keyFocus: string;
};

import { istMondayStartUTC } from "./tz";

function mondayOf(d: Date) {
  return istMondayStartUTC(d);
}

export async function buildContext(userId: number) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const activities = await prisma.activity.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
    take: 40,
  });

  const now = new Date();
  const weekStart = mondayOf(now);
  const msPerWeek = 1000 * 60 * 60 * 24 * 7;
  const weeksToRace = Math.max(
    0,
    Math.ceil((user.raceDate.getTime() - weekStart.getTime()) / msPerWeek)
  );

  const bmr = mifflinStJeor(user.sex, user.weightKg, user.heightCm, user.ageYears);
  const crossfitCount = user.crossfitDays.split(",").filter(Boolean).length;
  const runCount = user.runDays.split(",").filter(Boolean).length;
  const tdee = Math.round(bmr * activityFactor(crossfitCount, runCount));

  const nutritionBaseline = {
    maintenanceCalories: tdee,
    proteinGrams: proteinTargetGrams(user.weightKg),
    carbsRunDayGrams: carbTargetGramsRunDay(user.weightKg),
    carbsEasyDayGrams: carbTargetGramsEasyDay(user.weightKg),
    fatGrams: fatTargetGrams(tdee),
  };

  const recent = activities.slice(0, 20).map((a) => ({
    date: a.startDate.toISOString().slice(0, 10),
    type: a.sportType || a.type,
    name: a.name,
    km: +(a.distanceMeters / 1000).toFixed(2),
    durationMin: Math.round(a.movingSeconds / 60),
    avgPaceMinPerKm:
      a.distanceMeters > 0
        ? +(a.movingSeconds / 60 / (a.distanceMeters / 1000)).toFixed(2)
        : null,
    avgHr: a.avgHeartrate,
  }));

  return { user, weekStart, weeksToRace, nutritionBaseline, recent };
}

export async function generateWeekPlan(userId: number): Promise<WeekPlan> {
  const ctx = await buildContext(userId);
  const { user, weekStart, weeksToRace, nutritionBaseline, recent } = ctx;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const prompt = `You are an expert running coach and sports nutritionist. Build a 7-day half-marathon training plan for the user starting ${weekStart.toISOString().slice(0, 10)} (Monday).

USER PROFILE
- Name: ${user.name}
- Age: ${user.ageYears} (${user.sex})
- Height: ${user.heightCm} cm, Weight: ${user.weightKg} kg
- Diet: ${user.diet}
- Race date: ${user.raceDate.toISOString().slice(0, 10)} (${weeksToRace} weeks out)
- Goal finish: ${user.goalTimeMinutes} minutes (≈ ${(user.goalTimeMinutes / 21.0975).toFixed(2)} min/km avg pace)
- Current weekly mileage: ${user.currentWeeklyKm} km
- Longest recent run: ${user.longestRecentRunKm} km
- Scheduled CrossFit days: ${user.crossfitDays}
- Scheduled run days: ${user.runDays}

NUTRITION BASELINE (vegetarian)
- Maintenance calories: ${nutritionBaseline.maintenanceCalories} kcal/day
- Protein target: ${nutritionBaseline.proteinGrams} g/day
- Carbs on run days: ${nutritionBaseline.carbsRunDayGrams} g
- Carbs on easy days: ${nutritionBaseline.carbsEasyDayGrams} g
- Fat: ~${nutritionBaseline.fatGrams} g

RECENT ACTIVITY (last ~20 sessions, newest first)
${recent.length ? JSON.stringify(recent, null, 2) : "(no activities synced yet — assume baseline 15 km/week, longest 10.5 km)"}

RULES
- Mon/Wed/Fri are CrossFit days (keep running light or rest).
- Thursday and Sunday are the primary run days (Sunday = long run).
- Progress weekly mileage by ~10%. Taper the last 2 weeks before race day.
- Sunday long run should build to ~18–19 km by 2 weeks out.
- Be realistic about current fitness — start conservatively.
- For each day include: focus, session description, distance (if running) or duration, nutrition (calories/protein/carbs/fat + 1-line vegetarian meal idea), and a short coach note.
- Return STRICT JSON matching the WeekPlan schema. No prose outside JSON.

WeekPlan schema:
{
  "weekNumber": number,
  "weekStart": "YYYY-MM-DD",
  "weeksToRace": number,
  "phase": "base" | "build" | "peak" | "taper" | "race_week",
  "summary": string,
  "weeklyMileageKm": number,
  "keyFocus": string,
  "days": [
    {
      "day": "Mon"|"Tue"|...|"Sun",
      "date": "YYYY-MM-DD",
      "focus": "long_run"|"tempo_run"|"easy_run"|"interval_run"|"crossfit"|"rest"|"cross_train",
      "session": string,
      "durationMinutes": number (optional),
      "targetDistanceKm": number (optional),
      "nutrition": {
        "calories": number,
        "proteinGrams": number,
        "carbsGrams": number,
        "fatGrams": number,
        "notes": string
      },
      "coachNotes": string (optional)
    }
  ]
}`;

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You output strict JSON only." },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as WeekPlan;

  parsed.weekStart = weekStart.toISOString().slice(0, 10);
  parsed.weeksToRace = weeksToRace;

  await prisma.plan.upsert({
    where: {
      userId_weekStart: {
        userId: user.id,
        weekStart,
      },
    },
    update: { contentJson: JSON.stringify(parsed) },
    create: {
      userId: user.id,
      weekStart,
      weekNumber: parsed.weekNumber ?? 1,
      contentJson: JSON.stringify(parsed),
    },
  });

  return parsed;
}

function suggestedPhase(weeksToRace: number): WeekPlan["phase"] {
  if (weeksToRace <= 0) return "race_week";
  if (weeksToRace <= 2) return "taper";
  if (weeksToRace <= 4) return "peak";
  if (weeksToRace <= 8) return "build";
  return "base";
}

function fallbackWeek(
  weekNumber: number,
  weekStart: Date,
  weeksToRace: number,
): WeekPlan {
  const phase = suggestedPhase(weeksToRace);
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
  const days = dayNames.map((d, i) => {
    const date = new Date(weekStart.getTime() + i * 86400000);
    const isRun = d === "Thu" || d === "Sun";
    const isCrossfit = d === "Mon" || d === "Wed" || d === "Fri";
    const focus: DayPlan["focus"] = isRun
      ? d === "Sun"
        ? "long_run"
        : "easy_run"
      : isCrossfit
        ? "crossfit"
        : "rest";
    return {
      day: d,
      date: date.toISOString().slice(0, 10),
      focus,
      session:
        focus === "long_run"
          ? "Easy long run — keep conversational pace."
          : focus === "easy_run"
            ? "Easy 5 km at conversational pace."
            : focus === "crossfit"
              ? "CrossFit class — scale to feel."
              : "Full rest day.",
      targetDistanceKm: focus === "long_run" ? 10 : focus === "easy_run" ? 5 : undefined,
      durationMinutes: focus === "crossfit" ? 60 : undefined,
      nutrition: {
        calories: DAILY_TARGETS.calories,
        proteinGrams: DAILY_TARGETS.protein,
        carbsGrams: DAILY_TARGETS.carbs,
        fatGrams: DAILY_TARGETS.fat,
        notes: "Default macros — hit protein first.",
      },
      coachNotes: "Fallback week — regenerate for a personalized version.",
    } satisfies DayPlan;
  });

  return {
    weekNumber,
    weekStart: weekStart.toISOString().slice(0, 10),
    weeksToRace,
    phase,
    summary: `${phase} week — fallback template.`,
    weeklyMileageKm: 15,
    keyFocus: "Consistency",
    days,
  };
}

function validateWeek(w: unknown): w is WeekPlan {
  if (!w || typeof w !== "object") return false;
  const obj = w as Record<string, unknown>;
  if (!Array.isArray(obj.days) || obj.days.length !== 7) return false;
  for (const d of obj.days) {
    if (!d || typeof d !== "object") return false;
    const day = d as Record<string, unknown>;
    if (typeof day.day !== "string" || typeof day.session !== "string") return false;
    if (!day.nutrition || typeof day.nutrition !== "object") return false;
  }
  return true;
}

const MAX_WEEKS_PER_REBUILD = 4;

export async function generatePlanArc(
  userId: number,
  constraints?: string,
): Promise<{ weeksGenerated: number; weeksFallback: number; firstWeekStart: string }> {
  const ctx = await buildContext(userId);
  const { user, weekStart, recent } = ctx;
  const load = summarizeLoad(recent);

  const raceMonday = (() => {
    const d = new Date(user.raceDate);
    const day = d.getUTCDay();
    const offset = (day + 6) % 7;
    d.setUTCDate(d.getUTCDate() - offset);
    d.setUTCHours(weekStart.getUTCHours(), 0, 0, 0);
    return d;
  })();

  const weeksToSchedule: { weekNumber: number; weekStart: Date; weeksToRace: number }[] = [];
  let idx = 0;
  for (
    let cur = new Date(weekStart);
    cur.getTime() <= raceMonday.getTime() && idx < MAX_WEEKS_PER_REBUILD;
    cur = new Date(cur.getTime() + 7 * 86400000), idx++
  ) {
    const weeksToRace = Math.max(
      0,
      Math.round((raceMonday.getTime() - cur.getTime()) / (7 * 86400000)),
    );
    weeksToSchedule.push({
      weekNumber: idx + 1,
      weekStart: new Date(cur),
      weeksToRace,
    });
  }

  const totalWeeks = weeksToSchedule.length;
  const goalPace = +(user.goalTimeMinutes / 21.0975).toFixed(2);

  const prompt = `You are an expert running coach and sports nutritionist. Build a full multi-week half-marathon training plan covering EVERY week listed below, in order.

USER PROFILE
- Name: ${user.name}
- Age: ${user.ageYears} (${user.sex})
- Height: ${user.heightCm} cm, Weight: ${user.weightKg} kg
- Diet: ${user.diet}
- Race date: ${user.raceDate.toISOString().slice(0, 10)} (Monday of race week ${totalWeeks} weeks out)
- Goal finish: ${user.goalTimeMinutes} min → target avg pace ${goalPace} min/km
- Scheduled CrossFit days: ${user.crossfitDays}
- Scheduled run days: ${user.runDays}

CURRENT LOAD (last 4 weeks, computed from Strava)
- Avg weekly km: ${load.avgWeeklyKm}
- Longest run: ${load.longestRunKm} km
- Runs per week: ${load.runsPerWeek}
- CrossFit per week: ${load.crossfitPerWeek}
- Weekly km last 4 weeks (oldest→newest): ${JSON.stringify(load.last4WeeksKm)}

NUTRITION BASELINE (daily cut target)
- ${DAILY_TARGETS.calories} kcal / ${DAILY_TARGETS.protein}g protein / ${DAILY_TARGETS.carbs}g carbs / ${DAILY_TARGETS.fat}g fat
- Vary ±300 kcal per day around the baseline. Never drop below 2000 kcal. Lean higher on long-run days, lower on rest days.
- Respect vegetarian diet.

TRAINING RULES
- Mon/Wed/Fri are CrossFit days (keep running light or rest).
- Thu and Sun are primary run days (Sun = long run).
- Weekly mileage progression ≤ 10% from the previous week.
- Deload every 4th week (drop ~15% volume).
- Final 2 weeks before race: taper (drop ~25% then ~40%).
- Long-run peak should hit ~18–19 km roughly 2–3 weeks before race day.
- Start from the user's CURRENT load (avgWeeklyKm above), not a textbook baseline.

WEEKS TO PLAN (${totalWeeks} total)
${JSON.stringify(
  weeksToSchedule.map((w) => ({
    weekNumber: w.weekNumber,
    weekStart: w.weekStart.toISOString().slice(0, 10),
    weeksToRace: w.weeksToRace,
    suggestedPhase: suggestedPhase(w.weeksToRace),
  })),
  null,
  2,
)}

${constraints ? `USER CONSTRAINTS: ${constraints}\n` : ""}

OUTPUT
Return STRICT JSON, no prose. Shape:
{ "weeks": WeekPlan[] }

WeekPlan schema:
{
  "weekNumber": number,
  "weekStart": "YYYY-MM-DD",
  "weeksToRace": number,
  "phase": "base" | "build" | "peak" | "taper" | "race_week",
  "summary": string,
  "weeklyMileageKm": number,
  "keyFocus": string,
  "days": [
    {
      "day": "Mon"|"Tue"|...|"Sun",
      "date": "YYYY-MM-DD",
      "focus": "long_run"|"tempo_run"|"easy_run"|"interval_run"|"crossfit"|"rest"|"cross_train",
      "session": string,
      "durationMinutes": number (optional),
      "targetDistanceKm": number (optional),
      "nutrition": { "calories": number, "proteinGrams": number, "carbsGrams": number, "fatGrams": number, "notes": string },
      "coachNotes": string (optional)
    }
  ]
}

Return exactly ${totalWeeks} WeekPlan entries, ordered by weekStart ascending.`;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You output strict JSON only." },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { weeks?: unknown[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("LLM returned invalid JSON");
  }

  const returnedWeeks = Array.isArray(parsed.weeks) ? parsed.weeks : [];
  const byWeekNumber = new Map<number, WeekPlan>();
  for (const w of returnedWeeks) {
    if (validateWeek(w) && typeof w.weekNumber === "number") {
      byWeekNumber.set(w.weekNumber, w);
    }
  }

  let fallbackCount = 0;
  const finalWeeks = weeksToSchedule.map((spec) => {
    const candidate = byWeekNumber.get(spec.weekNumber);
    if (candidate) {
      candidate.weekStart = spec.weekStart.toISOString().slice(0, 10);
      candidate.weeksToRace = spec.weeksToRace;
      candidate.weekNumber = spec.weekNumber;
      return { spec, plan: candidate };
    }
    fallbackCount += 1;
    return { spec, plan: fallbackWeek(spec.weekNumber, spec.weekStart, spec.weeksToRace) };
  });

  const lastWeekStart = finalWeeks[finalWeeks.length - 1].spec.weekStart;
  const nextWeekStartBoundary = new Date(lastWeekStart.getTime() + 7 * 86400000);

  await prisma.$transaction([
    prisma.plan.deleteMany({
      where: {
        userId,
        weekStart: { gte: weekStart, lt: nextWeekStartBoundary },
      },
    }),
    prisma.plan.createMany({
      data: finalWeeks.map(({ spec, plan }) => ({
        userId,
        weekStart: spec.weekStart,
        weekNumber: spec.weekNumber,
        contentJson: JSON.stringify(plan),
      })),
    }),
  ]);

  return {
    weeksGenerated: finalWeeks.length,
    weeksFallback: fallbackCount,
    firstWeekStart: weekStart.toISOString().slice(0, 10),
  };
}

export async function getCurrentWeekPlan(userId: number) {
  const weekStart = mondayOf(new Date());
  // Match by calendar-day window rather than exact timestamp — plans saved
  // under an older tz convention may be a few hours off from the current Monday.
  const windowStart = new Date(weekStart.getTime() - 12 * 60 * 60 * 1000);
  const windowEnd = new Date(weekStart.getTime() + 12 * 60 * 60 * 1000);
  const plan = await prisma.plan.findFirst({
    where: {
      userId,
      weekStart: { gte: windowStart, lt: windowEnd },
    },
    orderBy: { weekStart: "desc" },
  });
  if (!plan) return null;
  return JSON.parse(plan.contentJson) as WeekPlan;
}
