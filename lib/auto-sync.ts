import { prisma } from "./db";
import { fetchActivities, fetchActivityDetail, refreshIfNeeded } from "./strava";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const RUN_TYPES = ["run", "trailrun", "trail_run", "virtualrun", "virtual_run"];

function isRun(sportType: string, type: string) {
  const label = `${sportType} ${type}`.toLowerCase();
  return RUN_TYPES.some((t) => label.includes(t));
}

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

    const newRunIds: string[] = [];
    let synced = 0;
    for (const a of activities) {
      const stravaId = String(a.id);
      const existing = await prisma.activity.findUnique({ where: { stravaId } });
      await prisma.activity.upsert({
        where: { stravaId },
        update: {},
        create: {
          stravaId,
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
      if (!existing && isRun(a.sport_type, a.type)) newRunIds.push(stravaId);
      synced++;
    }

    // Fetch description + calories for new runs only, to stay within Strava rate limits.
    for (const stravaId of newRunIds) {
      try {
        const detail = await fetchActivityDetail(accessToken, stravaId);
        await prisma.activity.update({
          where: { stravaId },
          data: {
            description: detail.description ?? null,
            calories: typeof detail.calories === "number" ? detail.calories : undefined,
          },
        });
      } catch {
        // skip individual failures; they'll retry next sync
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    await prisma.user.update({
      where: { id: userId },
      data: { lastSyncedAt: new Date() },
    });

    return { skipped: false, synced, detailsFetched: newRunIds.length };
  } catch (e) {
    return { skipped: true, reason: "error", error: e instanceof Error ? e.message : "unknown" };
  }
}
