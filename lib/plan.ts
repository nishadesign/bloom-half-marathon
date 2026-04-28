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

function mondayOf(d: Date) {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
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

export async function getCurrentWeekPlan(userId: number) {
  const weekStart = mondayOf(new Date());
  const plan = await prisma.plan.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  });
  if (!plan) return null;
  return JSON.parse(plan.contentJson) as WeekPlan;
}
