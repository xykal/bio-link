import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "bio_admin_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 hari

// Password untuk panel admin (PIN numerik, default 0099 — override via env).
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "0099";

// Sebelumnya nilai cookie sesi cuma string konstan "authenticated":
// nama + nilainya kelihatan di repo publik, jadi siapa pun bisa memalsukan
// sesi admin tanpa tahu PIN. Sekarang cookie ditandatangani HMAC dan punya
// masa berlaku. Set SESSION_SECRET di env supaya tanda tangannya kuat
// (fallback diturunkan dari ADMIN_PASSWORD biar tetap jalan tanpa env baru).
const SESSION_SECRET =
  process.env.SESSION_SECRET || `bio-link-session-fallback:${ADMIN_PASSWORD}`;

function sign(payload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

// Perbandingan konstan-waktu lewat hash, biar panjang string beda sekalipun aman.
function timingSafeEqualStr(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function verifyPin(password: string): boolean {
  return timingSafeEqualStr(String(password ?? ""), ADMIN_PASSWORD);
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const store = await cookies();
    const v = store.get(SESSION_COOKIE)?.value || "";
    const [expB64, sig] = v.split(".");
    if (!expB64 || !sig) return false;
    const exp = Number(Buffer.from(expB64, "base64url").toString("utf8"));
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
    return timingSafeEqualStr(sign(expB64), sig);
  } catch {
    return false;
  }
}

export function createSessionCookie() {
  const isProd = process.env.NODE_ENV === "production";
  const expB64 = Buffer.from(
    String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)
  ).toString("base64url");
  return {
    name: SESSION_COOKIE,
    value: `${expB64}.${sign(expB64)}`,
    httpOnly: true,
    // Di production pakai SameSite=None+Secure supaya sesi bertahan walau admin
    // dibuka lewat iframe preview (konteks cross-site). Di dev (http) tetap lax.
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    secure: isProd,
  };
}

export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  };
}

// Rate limit login per IP (best effort; instance serverless tidak berbagi state,
// tapi cukup buat mematahkan brute-force PIN 4 digit dari satu sumber).
const hits = new Map<string, number[]>();
export function rateLimited(ip: string, max = 10, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 1000) hits.clear();
  return arr.length > max;
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for") || "";
  return xf.split(",")[0].trim() || "unknown";
}
