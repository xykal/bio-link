import { cookies } from "next/headers";

const SESSION_COOKIE = "bio_admin_session";
const SESSION_VALUE = "authenticated";

// Password for the admin panel (numeric PIN, default 0099 — override via env).
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "0099";

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
