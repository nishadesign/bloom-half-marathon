import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adjustUpcomingWeek } from "@/lib/adjust";

export async function POST() {
  const user = await prisma.user.findFirst();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  try {
    const result = await adjustUpcomingWeek(user.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[plan/adjust] failed:", e);
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const maxDuration = 60;
