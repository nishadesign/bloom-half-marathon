import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/meal-log/[id]">,
) {
  const { id } = await ctx.params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await prisma.mealLog.delete({ where: { id: numId } });
  return NextResponse.json({ ok: true });
}
