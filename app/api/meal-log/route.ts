import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { istDayKey, istDayStartUTC, istDayEndUTC } from "@/lib/tz";

function dayBounds(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const ref = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return { start: istDayStartUTC(ref), end: istDayEndUTC(ref) };
}

export async function GET(req: NextRequest) {
  const user = await prisma.user.findFirst();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  const dateParam = req.nextUrl.searchParams.get("date") ?? istDayKey();
  const { start, end } = dayBounds(dateParam);

  const logs = await prisma.mealLog.findMany({
    where: { userId: user.id, date: { gte: start, lt: end } },
    include: { meal: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ date: dateParam, logs });
}

export async function POST(req: NextRequest) {
  const user = await prisma.user.findFirst();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  const body = (await req.json()) as {
    mealId: number;
    mealType?: string;
    portions?: number;
    date?: string;
  };

  if (!body.mealId) {
    return NextResponse.json({ error: "mealId required" }, { status: 400 });
  }

  const meal = await prisma.meal.findUnique({ where: { id: body.mealId } });
  if (!meal) return NextResponse.json({ error: "Meal not found" }, { status: 404 });

  // Store at noon local time so it always lands inside the local day window.
  const dayKey = body.date ?? istDayKey();
  const [y, m, d] = dayKey.split("-").map(Number);
  const start = istDayStartUTC(new Date(Date.UTC(y, m - 1, d, 12, 0, 0)));
  const date = new Date(start.getTime() + 12 * 60 * 60 * 1000);

  const log = await prisma.mealLog.create({
    data: {
      userId: user.id,
      mealId: meal.id,
      mealType: body.mealType ?? meal.mealType,
      portions: body.portions ?? 1,
      date,
    },
  });

  return NextResponse.json({ log });
}
