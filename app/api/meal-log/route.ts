import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function dayBounds(isoDate: string) {
  const start = new Date(`${isoDate}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function GET(req: NextRequest) {
  const user = await prisma.user.findFirst();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  const dateParam =
    req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
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

  const date = body.date
    ? new Date(`${body.date}T12:00:00Z`)
    : new Date();

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
