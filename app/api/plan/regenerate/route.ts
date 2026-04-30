import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { generateWeekPlan } from "@/lib/plan";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const plan = await generateWeekPlan(user.id);
    return NextResponse.json({ plan });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
