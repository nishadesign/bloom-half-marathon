import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshIfNeeded, fetchActivities } from "@/lib/strava";

export async function POST() {
  const user = await prisma.user.findFirst();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });
  if (!user.stravaAccessToken) {
    return NextResponse.json({ error: "Strava not connected" }, { status: 400 });
  }

  const accessToken = await refreshIfNeeded(user.id);
  const fourWeeksAgo = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 28;
  const activities = await fetchActivities(accessToken, fourWeeksAgo);

  let upserted = 0;
  for (const a of activities) {
    await prisma.activity.upsert({
      where: { stravaId: String(a.id) },
      update: {},
      create: {
        stravaId: String(a.id),
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
    upserted++;
  }

  return NextResponse.json({ synced: upserted });
}
