import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getCurrentWeekPlan, type DayPlan } from "@/lib/plan";
import { istMondayStartUTC } from "@/lib/tz";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function sportTypeFor(focus: DayPlan["focus"]): string {
  if (focus === "crossfit" || focus === "cross_train") return "WeightTraining";
  if (focus === "rest") return "Workout";
  return "Run";
}

function typeFor(focus: DayPlan["focus"]): string {
  return sportTypeFor(focus);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { day } = (await req.json()) as { day?: string };
  if (!day || !DAY_NAMES.includes(day as (typeof DAY_NAMES)[number])) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  const plan = await getCurrentWeekPlan(user.id);
  if (!plan) return NextResponse.json({ error: "No plan for this week" }, { status: 404 });

  const dayPlan = plan.days.find((d) => d.day === day);
  if (!dayPlan) return NextResponse.json({ error: "Day not found in plan" }, { status: 404 });
  if (dayPlan.focus === "rest") {
    return NextResponse.json({ error: "Rest day — nothing to mark" }, { status: 400 });
  }

  const weekStart = istMondayStartUTC();
  const dayIdx = DAY_NAMES.indexOf(day as (typeof DAY_NAMES)[number]);
  const sessionDate = new Date(weekStart.getTime() + dayIdx * 86400000 + 8 * 60 * 60 * 1000);

  const stravaId = `manual-${user.id}-${sessionDate.toISOString().slice(0, 10)}-${dayPlan.focus}`;

  const distanceMeters = dayPlan.targetDistanceKm ? dayPlan.targetDistanceKm * 1000 : 0;
  const movingSeconds = dayPlan.durationMinutes ? dayPlan.durationMinutes * 60 : 0;

  const activity = await prisma.activity.upsert({
    where: { stravaId },
    update: {},
    create: {
      stravaId,
      userId: user.id,
      type: typeFor(dayPlan.focus),
      sportType: sportTypeFor(dayPlan.focus),
      name: dayPlan.session,
      startDate: sessionDate,
      distanceMeters,
      movingSeconds,
      elapsedSeconds: movingSeconds,
      elevationGain: 0,
    },
  });

  return NextResponse.json({ ok: true, activityId: activity.id });
}
