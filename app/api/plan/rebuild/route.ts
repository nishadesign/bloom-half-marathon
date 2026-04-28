import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePlanArc } from "@/lib/plan";

export async function POST(req: NextRequest) {
  const user = await prisma.user.findFirst();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  let constraints: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.constraints === "string") constraints = body.constraints;
  } catch {
    // empty body is fine
  }

  try {
    const result = await generatePlanArc(user.id, constraints);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Allow up to 60s for multi-week LLM generation on Vercel.
export const maxDuration = 60;
