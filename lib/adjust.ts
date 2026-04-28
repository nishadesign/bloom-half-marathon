import OpenAI from "openai";
import { prisma } from "./db";
import { istMondayStartUTC } from "./tz";
import { type WeekPlan, type DayPlan } from "./plan";

export type DayOverride = {
  day: string;
  session?: string;
  targetDistanceKm?: number;
  durationMinutes?: number;
  targetPace?: string;
  coachNotes?: string;
  focus?: DayPlan["focus"];
};

export type AdjustmentResult = {
  adjusted: boolean;
  reason: string;
  overrides: DayOverride[];
};

function mondayOf(d: Date) {
  return istMondayStartUTC(d);
}

function prevMondayOf(d: Date) {
  return new Date(mondayOf(d).getTime() - 7 * 86400000);
}

function nextMondayOf(d: Date) {
  return new Date(mondayOf(d).getTime() + 7 * 86400000);
}

async function loadWeekActivities(userId: number, weekStart: Date) {
  const end = new Date(weekStart.getTime() + 7 * 86400000);
  return prisma.activity.findMany({
    where: { userId, startDate: { gte: weekStart, lt: end } },
    orderBy: { startDate: "asc" },
  });
}

async function loadWeekPlan(userId: number, weekStart: Date): Promise<WeekPlan | null> {
  const windowStart = new Date(weekStart.getTime() - 12 * 60 * 60 * 1000);
  const windowEnd = new Date(weekStart.getTime() + 12 * 60 * 60 * 1000);
  const plan = await prisma.plan.findFirst({
    where: { userId, weekStart: { gte: windowStart, lt: windowEnd } },
  });
  if (!plan) return null;
  return JSON.parse(plan.contentJson) as WeekPlan;
}

export async function adjustUpcomingWeek(userId: number): Promise<AdjustmentResult> {
  const now = new Date();
  const thisMonday = mondayOf(now);
  const prevMonday = prevMondayOf(now);
  const nextMonday = nextMondayOf(now);

  const [lastWeekPlan, lastWeekActivities, nextWeekPlan] = await Promise.all([
    loadWeekPlan(userId, prevMonday),
    loadWeekActivities(userId, prevMonday),
    loadWeekPlan(userId, nextMonday),
  ]);

  if (!nextWeekPlan) {
    return { adjusted: false, reason: "No upcoming plan found to adjust.", overrides: [] };
  }

  const prescribedSummary = lastWeekPlan
    ? lastWeekPlan.days.map((d) => ({
        day: d.day,
        focus: d.focus,
        session: d.session,
        targetDistanceKm: d.targetDistanceKm ?? null,
        targetPace: d.targetPace ?? null,
      }))
    : [];

  const actualSummary = lastWeekActivities.map((a) => ({
    date: a.startDate.toISOString().slice(0, 10),
    type: a.sportType || a.type,
    name: a.name,
    description: a.description ?? null,
    km: +(a.distanceMeters / 1000).toFixed(2),
    durationMin: Math.round(a.movingSeconds / 60),
    avgPaceMinPerKm:
      a.distanceMeters > 0
        ? +(a.movingSeconds / 60 / (a.distanceMeters / 1000)).toFixed(2)
        : null,
    avgHr: a.avgHeartrate ?? null,
  }));

  const nextWeekSummary = nextWeekPlan.days.map((d) => ({
    day: d.day,
    focus: d.focus,
    session: d.session,
    targetDistanceKm: d.targetDistanceKm ?? null,
    durationMinutes: d.durationMinutes ?? null,
    targetPace: d.targetPace ?? null,
  }));

  const prompt = `You are a running coach reviewing a runner's past training week and deciding whether the upcoming week needs adjustments.

LAST WEEK PRESCRIBED (week ${lastWeekPlan?.weekNumber ?? "?"}):
${JSON.stringify(prescribedSummary, null, 2)}

LAST WEEK ACTUAL (Strava activities — descriptions are the runner's own notes about how each session felt):
${actualSummary.length ? JSON.stringify(actualSummary, null, 2) : "(no activities recorded)"}

UPCOMING WEEK PRESCRIBED (week ${nextWeekPlan.weekNumber}):
${JSON.stringify(nextWeekSummary, null, 2)}

TASK
Decide if the upcoming week needs adjustments based on:
- Missed sessions (prescribed but no matching activity)
- RPE signal in descriptions (e.g. "legs heavy", "felt great", "cramped", "gassed")
- Pace deviation from prescribed (>20s/km slower on easy/long = fatigue signal)
- Injury or illness mentioned in descriptions

RULES
- Default to NO adjustment if the week went well. Only adjust if signal is strong.
- If adjusting: reduce volume/intensity; never increase it.
- Do not change which day of the week a session falls on — only modify the content of specific days.
- If a day looks fine, omit it from overrides.

Return STRICT JSON:
{
  "adjusted": boolean,
  "reason": string (one sentence explaining decision),
  "overrides": [
    {
      "day": "Mon"|"Tue"|...|"Sun",
      "session"?: string (new session description),
      "targetDistanceKm"?: number,
      "durationMinutes"?: number,
      "targetPace"?: string,
      "coachNotes"?: string,
      "focus"?: "long_run"|"tempo_run"|"easy_run"|"interval_run"|"crossfit"|"rest"|"cross_train"
    }
  ]
}`;

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
  let parsed: AdjustmentResult;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { adjusted: false, reason: "LLM returned invalid JSON.", overrides: [] };
  }

  if (!parsed.adjusted || !Array.isArray(parsed.overrides) || parsed.overrides.length === 0) {
    await prisma.planAdjustment.deleteMany({ where: { userId, weekStart: nextMonday } });
    return {
      adjusted: false,
      reason: parsed.reason || "No adjustment needed.",
      overrides: [],
    };
  }

  // Apply overrides to the stored plan for next week.
  const merged: WeekPlan = {
    ...nextWeekPlan,
    days: nextWeekPlan.days.map((d) => {
      const ov = parsed.overrides.find((o) => o.day === d.day);
      if (!ov) return d;
      return {
        ...d,
        ...(ov.focus ? { focus: ov.focus } : {}),
        ...(ov.session ? { session: ov.session } : {}),
        ...(ov.targetDistanceKm != null ? { targetDistanceKm: ov.targetDistanceKm } : {}),
        ...(ov.durationMinutes != null ? { durationMinutes: ov.durationMinutes } : {}),
        ...(ov.targetPace ? { targetPace: ov.targetPace } : {}),
        coachNotes: ov.coachNotes
          ? `${ov.coachNotes} (adjusted)`
          : d.coachNotes
            ? `${d.coachNotes} (adjusted)`
            : "Adjusted based on last week.",
      };
    }),
  };

  await prisma.$transaction([
    prisma.plan.update({
      where: { userId_weekStart: { userId, weekStart: nextMonday } },
      data: { contentJson: JSON.stringify(merged) },
    }),
    prisma.planAdjustment.upsert({
      where: { userId_weekStart: { userId, weekStart: nextMonday } },
      update: {
        reason: parsed.reason,
        overridesJson: JSON.stringify(parsed.overrides),
        basedOnFeedback: JSON.stringify(actualSummary),
        weekNumber: nextWeekPlan.weekNumber,
      },
      create: {
        userId,
        weekStart: nextMonday,
        weekNumber: nextWeekPlan.weekNumber,
        reason: parsed.reason,
        overridesJson: JSON.stringify(parsed.overrides),
        basedOnFeedback: JSON.stringify(actualSummary),
      },
    }),
  ]);

  // Ignore the prev/this week locals since we only wrote to nextMonday.
  void thisMonday;

  return parsed;
}

export async function getAdjustmentForWeek(userId: number, weekStart: Date) {
  return prisma.planAdjustment.findFirst({
    where: { userId, weekStart },
    orderBy: { createdAt: "desc" },
  });
}
