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
import { istMondayStartUTC } from "./tz";
import {
  RACE_WEEK_NUMBER,
  getPlanTemplate,
  getPrescribedWeek,
  pickSession,
  type PrescribedSession,
  type SessionCategory,
} from "./prescribed-plan";

export type DayPlan = {
  day: string;
  date: string;
  focus: "long_run" | "tempo_run" | "easy_run" | "interval_run" | "crossfit" | "rest" | "cross_train" | "race";
  session: string;
  durationMinutes?: number;
  targetDistanceKm?: number;
  targetPace?: string;
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
  return istMondayStartUTC(d);
}

function raceMondayUTC(raceDate: Date, anchor: Date): Date {
  const d = new Date(raceDate);
  const day = d.getUTCDay();
  const offset = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  d.setUTCHours(anchor.getUTCHours(), 0, 0, 0);
  return d;
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

function phaseFor(weeksToRace: number): WeekPlan["phase"] {
  if (weeksToRace <= 0) return "race_week";
  if (weeksToRace <= 2) return "taper";
  if (weeksToRace <= 4) return "peak";
  if (weeksToRace <= 8) return "build";
  return "base";
}

type DayShape =
  | { kind: "run"; category: SessionCategory }
  | { kind: "crossfit" }
  | { kind: "rest" }
  | { kind: "race" };

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function weekTemplate(weeksToRace: number): DayShape[] {
  if (weeksToRace <= 0) {
    // Race week — race on Saturday
    return [
      { kind: "rest" },            // Mon
      { kind: "run", category: "Easy" }, // Tue
      { kind: "rest" },            // Wed
      { kind: "run", category: "Tempo" }, // Thu activation
      { kind: "rest" },            // Fri
      { kind: "race" },            // Sat
      { kind: "rest" },            // Sun
    ];
  }
  if (weeksToRace <= 3) {
    // 3 runs/week, 2 CrossFit
    return [
      { kind: "crossfit" },        // Mon
      { kind: "run", category: "Easy" }, // Tue
      { kind: "rest" },            // Wed
      { kind: "run", category: "Tempo" }, // Thu (Tempo preferred; fallback Intervals below)
      { kind: "crossfit" },        // Fri
      { kind: "rest" },            // Sat
      { kind: "run", category: "Long" }, // Sun
    ];
  }
  // Default: 2 runs/week (Thu + Sun), 3 CrossFit
  return [
    { kind: "crossfit" },        // Mon
    { kind: "rest" },            // Tue
    { kind: "crossfit" },        // Wed
    { kind: "run", category: "Tempo" }, // Thu
    { kind: "crossfit" },        // Fri
    { kind: "rest" },            // Sat
    { kind: "run", category: "Long" }, // Sun
  ];
}

function resolveSession(
  week: ReturnType<typeof getPrescribedWeek>,
  category: SessionCategory,
): PrescribedSession | null {
  if (!week) return null;
  // Thursday slot: prefer Tempo, fall back to Intervals, else any quality session.
  if (category === "Tempo") {
    return (
      pickSession(week, "Tempo") ??
      pickSession(week, "Intervals") ??
      null
    );
  }
  if (category === "Intervals") {
    return (
      pickSession(week, "Intervals") ??
      pickSession(week, "Tempo") ??
      null
    );
  }
  return pickSession(week, category);
}

function focusFor(category: SessionCategory): DayPlan["focus"] {
  switch (category) {
    case "Long":
      return "long_run";
    case "Tempo":
      return "tempo_run";
    case "Easy":
      return "easy_run";
    case "Intervals":
      return "interval_run";
    case "Race":
      return "race";
  }
}

function nutritionFor(focus: DayPlan["focus"]): DayPlan["nutrition"] {
  const { calories, protein, carbs, fat } = DAILY_TARGETS;
  if (focus === "long_run" || focus === "race") {
    return {
      calories: calories + 300,
      proteinGrams: protein,
      carbsGrams: carbs + 60,
      fatGrams: fat,
      notes: "Fuel before + during. Top up carbs pre-run.",
    };
  }
  if (focus === "tempo_run" || focus === "interval_run") {
    return {
      calories: calories + 150,
      proteinGrams: protein,
      carbsGrams: carbs + 30,
      fatGrams: fat,
      notes: "Carbs up for quality session; protein within 45 min after.",
    };
  }
  if (focus === "easy_run") {
    return {
      calories,
      proteinGrams: protein,
      carbsGrams: carbs,
      fatGrams: fat,
      notes: "Baseline day — hit protein target.",
    };
  }
  if (focus === "crossfit" || focus === "cross_train") {
    return {
      calories,
      proteinGrams: protein + 10,
      carbsGrams: carbs,
      fatGrams: fat,
      notes: "Protein-forward for strength day.",
    };
  }
  // rest
  return {
    calories: Math.max(2000, calories - 200),
    proteinGrams: protein,
    carbsGrams: Math.max(200, carbs - 40),
    fatGrams: fat,
    notes: "Recovery day — lean protein, veg, light carbs.",
  };
}

function buildDay(
  day: (typeof DAY_NAMES)[number],
  date: Date,
  shape: DayShape,
  week: ReturnType<typeof getPrescribedWeek>,
): DayPlan {
  const dateStr = date.toISOString().slice(0, 10);
  if (shape.kind === "race") {
    const session = pickSession(week!, "Race");
    const nutrition = nutritionFor("race");
    return {
      day,
      date: dateStr,
      focus: "race",
      session: session?.details ?? "21.1km race",
      durationMinutes: session?.durationMinutes,
      targetDistanceKm: session?.targetDistanceKm ?? 21.1,
      targetPace: session?.targetPace,
      nutrition,
      coachNotes: session?.goal ?? "Race day. Execute the plan.",
    };
  }
  if (shape.kind === "crossfit") {
    return {
      day,
      date: dateStr,
      focus: "crossfit",
      session: "CrossFit / strength session — scale to feel.",
      durationMinutes: 60,
      nutrition: nutritionFor("crossfit"),
    };
  }
  if (shape.kind === "rest") {
    return {
      day,
      date: dateStr,
      focus: "rest",
      session: "Full rest — mobility or light walking only.",
      nutrition: nutritionFor("rest"),
    };
  }
  // run
  const session = resolveSession(week, shape.category);
  if (!session) {
    return {
      day,
      date: dateStr,
      focus: "rest",
      session: "Rest (no prescribed session for this slot).",
      nutrition: nutritionFor("rest"),
    };
  }
  const focus = focusFor(session.category);
  return {
    day,
    date: dateStr,
    focus,
    session: session.details,
    durationMinutes: session.durationMinutes,
    targetDistanceKm: session.targetDistanceKm,
    targetPace: session.targetPace,
    nutrition: nutritionFor(focus),
    coachNotes: session.goal,
  };
}

function assembleWeek(
  prescribedWeekNumber: number,
  weekStart: Date,
  weeksToRace: number,
  templateKey: string,
): WeekPlan {
  const week = getPrescribedWeek(prescribedWeekNumber, templateKey);
  const template = weekTemplate(weeksToRace);
  const days = template.map((shape, i) => {
    const date = new Date(weekStart.getTime() + i * 86400000);
    return buildDay(DAY_NAMES[i], date, shape, week);
  });

  const runKm = days.reduce((sum, d) => sum + (d.targetDistanceKm ?? 0), 0);
  const phase = phaseFor(weeksToRace);
  const longSession = week?.sessions.find((s) => s.category === "Long");
  const raceSession = week?.sessions.find((s) => s.category === "Race");

  const summary =
    phase === "race_week"
      ? `Race week — ${raceSession?.goal ?? "execute the plan"}.`
      : `${phase.charAt(0).toUpperCase() + phase.slice(1)} week — ${longSession?.goal ?? "stay consistent"}.`;

  const keyFocus = week
    ? week.sessions.map((s) => `${s.category}: ${s.goal}`).join(" · ")
    : "Consistency";

  return {
    weekNumber: prescribedWeekNumber,
    weekStart: weekStart.toISOString().slice(0, 10),
    weeksToRace,
    phase,
    summary,
    weeklyMileageKm: +runKm.toFixed(1),
    keyFocus,
    days,
  };
}

function prescribedWeekNumberFor(weekStart: Date, raceDate: Date): number {
  const raceMon = raceMondayUTC(raceDate, weekStart);
  const weeksToRace = Math.round((raceMon.getTime() - weekStart.getTime()) / (7 * 86400000));
  return RACE_WEEK_NUMBER - weeksToRace;
}

export async function generateWeekPlan(userId: number): Promise<WeekPlan> {
  const { user, weekStart, weeksToRace } = await buildContext(userId);
  const weekNumber = prescribedWeekNumberFor(weekStart, user.raceDate);
  const plan = assembleWeek(weekNumber, weekStart, weeksToRace, user.planTemplateKey);

  await prisma.plan.upsert({
    where: { userId_weekStart: { userId: user.id, weekStart } },
    update: { contentJson: JSON.stringify(plan), weekNumber },
    create: {
      userId: user.id,
      weekStart,
      weekNumber,
      contentJson: JSON.stringify(plan),
    },
  });

  return plan;
}

export async function generatePlanArc(
  userId: number,
): Promise<{ weeksGenerated: number; weeksFallback: number; firstWeekStart: string }> {
  const { user, weekStart } = await buildContext(userId);
  const raceMon = raceMondayUTC(user.raceDate, weekStart);

  const weeks: { weekStart: Date; weekNumber: number; weeksToRace: number }[] = [];
  for (
    let cur = new Date(weekStart);
    cur.getTime() <= raceMon.getTime();
    cur = new Date(cur.getTime() + 7 * 86400000)
  ) {
    const weeksToRace = Math.max(
      0,
      Math.round((raceMon.getTime() - cur.getTime()) / (7 * 86400000)),
    );
    weeks.push({
      weekStart: new Date(cur),
      weekNumber: RACE_WEEK_NUMBER - weeksToRace,
      weeksToRace,
    });
  }

  const plans = weeks.map(({ weekStart: ws, weekNumber, weeksToRace }) =>
    assembleWeek(weekNumber, ws, weeksToRace, user.planTemplateKey),
  );

  const lastWeekStart = weeks[weeks.length - 1].weekStart;
  // Widen the delete window by 24h on each side so stale rows from a prior
  // timezone convention (off by a few hours) are still cleared before insert.
  const deleteFrom = new Date(weekStart.getTime() - 24 * 60 * 60 * 1000);
  const deleteTo = new Date(lastWeekStart.getTime() + 8 * 86400000);

  await prisma.$transaction([
    prisma.plan.deleteMany({
      where: { userId, weekStart: { gte: deleteFrom, lt: deleteTo } },
    }),
    prisma.plan.createMany({
      data: weeks.map(({ weekStart: ws, weekNumber }, i) => ({
        userId,
        weekStart: ws,
        weekNumber,
        contentJson: JSON.stringify(plans[i]),
      })),
    }),
  ]);

  const templateWeeks = getPlanTemplate(user.planTemplateKey);
  const fallbackCount = plans.filter(
    (p) => !templateWeeks.some((w) => w.weekNumber === p.weekNumber),
  ).length;

  return {
    weeksGenerated: plans.length,
    weeksFallback: fallbackCount,
    firstWeekStart: weekStart.toISOString().slice(0, 10),
  };
}

export async function getCurrentWeekPlan(userId: number) {
  const weekStart = mondayOf(new Date());
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
