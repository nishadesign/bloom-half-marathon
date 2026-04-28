import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshIfNeeded, fetchActivities, fetchActivityDetail } from "@/lib/strava";

const RUN_TYPES = ["run", "trailrun", "trail_run", "virtualrun", "virtual_run"];

function isRun(sportType: string, type: string) {
  const label = `${sportType} ${type}`.toLowerCase();
  return RUN_TYPES.some((t) => label.includes(t));
}

export async function POST() {
  const user = await prisma.user.findFirst();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });
  if (!user.stravaAccessToken) {
    return NextResponse.json({ error: "Strava not connected" }, { status: 400 });
  }

  const accessToken = await refreshIfNeeded(user.id);
  const fourWeeksAgo = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 28;
  const activities = await fetchActivities(accessToken, fourWeeksAgo);

  const newRunIds: string[] = [];
  let upserted = 0;
  for (const a of activities) {
    const stravaId = String(a.id);
    const existing = await prisma.activity.findUnique({ where: { stravaId } });
    await prisma.activity.upsert({
      where: { stravaId },
      update: {},
      create: {
        stravaId,
        userId: user.id,
        type: a.type,
        sportType: a.sport_type,
        name: a.name,
        startDate: new Date(a.start_date),
        distanceMeters: a.distance,
        movingSeconds: a.moving_time,
        elapsedSeconds: a.elapsed_time,
        elevationGain: a.total_elevation_gain,
        avgHeartrate: a.average_heartrate ?? null,
        maxHeartrate: a.max_heartrate ?? null,
        avgSpeed: a.average_speed ?? null,
        calories: a.calories ?? null,
      },
    });
    if (!existing && isRun(a.sport_type, a.type)) newRunIds.push(stravaId);
    upserted++;
  }

  // Also backfill description for runs already in the DB that are missing it.
  const missingDesc = await prisma.activity.findMany({
    where: {
      userId: user.id,
      description: null,
      startDate: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28) },
    },
    orderBy: { startDate: "desc" },
  });
  const toDetail = [
    ...newRunIds,
    ...missingDesc
      .filter((a) => isRun(a.sportType, a.type))
      .map((a) => a.stravaId)
      .filter((id) => !newRunIds.includes(id)),
  ];

  let detailsUpdated = 0;
  for (const stravaId of toDetail) {
    try {
      const detail = await fetchActivityDetail(accessToken, stravaId);
      await prisma.activity.update({
        where: { stravaId },
        data: {
          description: detail.description ?? null,
          calories: typeof detail.calories === "number" ? detail.calories : undefined,
        },
      });
      detailsUpdated++;
    } catch {
      // skip failures
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  return NextResponse.json({ synced: upserted, detailsUpdated });
}
