import { prisma } from "./db";

const STRAVA_API = "https://www.strava.com/api/v3";
const STRAVA_OAUTH = "https://www.strava.com/oauth/token";

export function buildAuthUrl(requestOrigin?: string) {
  const fallback = requestOrigin
    ? `${requestOrigin}/api/strava/callback`
    : "";
  const redirectUri = process.env.STRAVA_REDIRECT_URI || fallback;
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string) {
  const res = await fetch(STRAVA_OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete: { id: number; firstname?: string; lastname?: string };
  }>;
}

export async function refreshIfNeeded(userId: number) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const now = Math.floor(Date.now() / 1000);
  if (!user.stravaAccessToken || !user.stravaRefreshToken || !user.stravaTokenExpires) {
    throw new Error("Strava not connected");
  }
  if (user.stravaTokenExpires - 60 > now) return user.stravaAccessToken;

  const res = await fetch(STRAVA_OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: user.stravaRefreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Strava refresh failed: ${res.status}`);
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  await prisma.user.update({
    where: { id: userId },
    data: {
      stravaAccessToken: data.access_token,
      stravaRefreshToken: data.refresh_token,
      stravaTokenExpires: data.expires_at,
    },
  });
  return data.access_token;
}

export async function fetchActivities(accessToken: string, afterEpoch: number) {
  const url = `${STRAVA_API}/athlete/activities?after=${afterEpoch}&per_page=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status}`);
  return res.json() as Promise<StravaActivity[]>;
}

export async function fetchActivityDetail(accessToken: string, stravaId: string) {
  const url = `${STRAVA_API}/activities/${stravaId}?include_all_efforts=false`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava detail fetch failed: ${res.status}`);
  return res.json() as Promise<StravaActivity & { calories?: number }>;
}

export type StravaActivity = {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_speed?: number;
  calories?: number;
  description?: string;
};
