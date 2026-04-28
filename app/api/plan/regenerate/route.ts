import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateWeekPlan } from "@/lib/plan";

export async function POST() {
  const user = await prisma.user.findFirst();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });
  try {
    const plan = await generateWeekPlan(user.id);
    return NextResponse.json({ plan });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
