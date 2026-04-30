import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeCode } from "@/lib/strava";
import { getSessionUserId, setSessionCookie } from "@/lib/session";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const token = await exchangeCode(code);
    const athleteId = String(token.athlete.id);

    const tokenFields = {
      stravaAthleteId: athleteId,
      stravaAccessToken: token.access_token,
      stravaRefreshToken: token.refresh_token,
      stravaTokenExpires: token.expires_at,
    };

    // Prefer user already linked to this Strava athlete.
    const byAthlete = await prisma.user.findUnique({
      where: { stravaAthleteId: athleteId },
    });
    if (byAthlete) {
      await prisma.user.update({ where: { id: byAthlete.id }, data: tokenFields });
      await setSessionCookie(byAthlete.id);
      return NextResponse.redirect(new URL("/?connected=1", req.url));
    }

    // Otherwise, link to the currently signed-in user (e.g. just finished onboarding).
    const sessionUserId = await getSessionUserId();
    if (sessionUserId != null) {
      await prisma.user.update({ where: { id: sessionUserId }, data: tokenFields });
      await setSessionCookie(sessionUserId);
      return NextResponse.redirect(new URL("/?connected=1", req.url));
    }

    // New athlete, no session — send to onboarding with Strava payload to finish setup.
    const onboarding = new URL("/onboarding", req.url);
    onboarding.searchParams.set("stravaAthleteId", athleteId);
    onboarding.searchParams.set("stravaAccessToken", token.access_token);
    onboarding.searchParams.set("stravaRefreshToken", token.refresh_token);
    onboarding.searchParams.set("stravaTokenExpires", String(token.expires_at));
    onboarding.searchParams.set("firstName", token.athlete.firstname ?? "");
    return NextResponse.redirect(onboarding);
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
