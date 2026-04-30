import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";

const COOKIE_NAME = "hm_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 60;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET env var missing or too short (>=16 chars).");
  }
  return s;
}

function sign(userId: number): string {
  const payload = String(userId);
  const mac = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

function verify(token: string | undefined): number | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  try {
    const a = Buffer.from(mac, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const id = Number(payload);
  return Number.isFinite(id) ? id : null;
}

export async function setSessionCookie(userId: number) {
  const store = await cookies();
  store.set(COOKIE_NAME, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<number | null> {
  const store = await cookies();
  return verify(store.get(COOKIE_NAME)?.value);
}

export async function getCurrentUser() {
  const id = await getSessionUserId();
  if (id == null) return null;
  return prisma.user.findUnique({ where: { id } });
}
