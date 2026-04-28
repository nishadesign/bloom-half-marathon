import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeCode } from "@/lib/strava";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const token = await exchangeCode(code);
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No user seeded" }, { status: 500 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        stravaAthleteId: String(token.athlete.id),
        stravaAccessToken: token.access_token,
        stravaRefreshToken: token.refresh_token,
        stravaTokenExpires: token.expires_at,
      },
    });

    return NextResponse.redirect(new URL("/?connected=1", req.url));
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
