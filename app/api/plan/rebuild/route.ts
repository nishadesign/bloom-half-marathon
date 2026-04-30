import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { generatePlanArc } from "@/lib/plan";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const result = await generatePlanArc(user.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[plan/rebuild] failed:", e);
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
