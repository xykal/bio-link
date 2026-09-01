import { cookies } from "next/headers";

const SESSION_COOKIE = "bio_admin_session";
const SESSION_VALUE = "authenticated";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// Hashed (obscured) path for the admin panel. Change via ADMIN_SECRET_PATH env.
// The UI never links to it — you reach it only by knowing the exact URL.
export const ADMIN_SECRET_PATH =
  (process.env.ADMIN_SECRET_PATH || "af4ec7529f2d7353").replace(/^\/+|\/+$/g, "");

export async function isAuthenticated(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get(SESSION_COOKIE)?.value === SESSION_VALUE;
  } catch {
    return false;
  }
}

export function createSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: SESSION_VALUE,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
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
