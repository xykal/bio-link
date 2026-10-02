import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "bio_admin_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const isProduction = process.env.NODE_ENV === "production";

// Development defaults keep a local checkout usable; production fails closed.
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (isProduction ? "" : "0099");
const SESSION_SECRET =
  process.env.SESSION_SECRET || (isProduction ? "" : "bio-link-local-session-secret");

export function authConfigured(): boolean {
  return Boolean(ADMIN_PASSWORD && SESSION_SECRET);
}

export function safeEqual(a: string, b: string): boolean {
  const left = crypto.createHash("sha256").update(a).digest();
  const right = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(left, right);
}

export function sameOriginRequest(req: Request): boolean {
  const originHeader = req.headers.get("origin");
  const expectedHost =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host") ||
    new URL(req.url).host;
  if (!originHeader || !expectedHost) return false;

  try {
    const origin = new URL(originHeader);
    const localHost = ["localhost", "127.0.0.1", "::1"].includes(origin.hostname);
    if (isProduction && origin.protocol !== "https:" && !localHost) return false;
    return origin.host.toLowerCase() === expectedHost.toLowerCase();
  } catch {
    return false;
  }
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

export function verifyPassword(password: string): boolean {
  return authConfigured() && safeEqual(String(password ?? ""), ADMIN_PASSWORD);
}

export async function isAuthenticated(): Promise<boolean> {
  if (!authConfigured()) return false;
  try {
    const store = await cookies();
    const value = store.get(SESSION_COOKIE)?.value || "";
    const [expB64, signature] = value.split(".");
    if (!expB64 || !signature) return false;
    const expiry = Number(Buffer.from(expB64, "base64url").toString("utf8"));
    if (!Number.isFinite(expiry) || expiry < Math.floor(Date.now() / 1000)) return false;
    return safeEqual(sign(expB64), signature);
  } catch {
    return false;
  }
}

export function createSessionCookie() {
  if (!authConfigured()) throw new Error("Admin authentication is not configured");
  const expiry = Buffer.from(
    String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)
  ).toString("base64url");
  return {
    name: SESSION_COOKIE,
    value: `${expiry}.${sign(expiry)}`,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    secure: isProduction,
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
    secure: isProduction,
  };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
