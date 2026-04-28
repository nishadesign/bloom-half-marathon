import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshIfNeeded, fetchActivityDetail } from "@/lib/strava";

export async function POST() {
  const user = await prisma.user.findFirst();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });
  if (!user.stravaAccessToken) {
    return NextResponse.json({ error: "Strava not connected" }, { status: 400 });
  }

  const accessToken = await refreshIfNeeded(user.id);

  const missing = await prisma.activity.findMany({
    where: { userId: user.id, calories: null },
    orderBy: { startDate: "desc" },
  });

  let updated = 0;
  let failed = 0;
  for (const a of missing) {
    try {
      const detail = await fetchActivityDetail(accessToken, a.stravaId);
      if (typeof detail.calories === "number") {
        await prisma.activity.update({
          where: { id: a.id },
          data: { calories: detail.calories },
        });
        updated++;
      }
    } catch {
      failed++;
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  return NextResponse.json({ checked: missing.length, updated, failed });
}
