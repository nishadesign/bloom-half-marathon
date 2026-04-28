import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/strava";

export async function GET() {
  return NextResponse.redirect(buildAuthUrl());
}
