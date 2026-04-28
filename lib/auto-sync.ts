import { prisma } from "./db";
import { fetchActivities, refreshIfNeeded } from "./strava";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export async function maybeAutoSync(userId: number) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.stravaAccessToken) return { skipped: true, reason: "not_connected" };

  if (user.lastSyncedAt && Date.now() - user.lastSyncedAt.getTime() < SYNC_INTERVAL_MS) {
    return { skipped: true, reason: "fresh" };
  }

  try {
    const accessToken = await refreshIfNeeded(userId);
    const fourWeeksAgo = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 28;
    const activities = await fetchActivities(accessToken, fourWeeksAgo);

    let synced = 0;
    for (const a of activities) {
      await prisma.activity.upsert({
        where: { stravaId: String(a.id) },
        update: {},
        create: {
          stravaId: String(a.id),
          userId,
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
      synced++;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { lastSyncedAt: new Date() },
    });

    return { skipped: false, synced };
  } catch (e) {
    return { skipped: true, reason: "error", error: e instanceof Error ? e.message : "unknown" };
  }
}
