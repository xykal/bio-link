import { NextResponse } from "next/server";
import { authConfigured, createSessionCookie, sameOriginRequest, verifyPassword } from "@/lib/auth";
import { clientIp, sharedRateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!sameOriginRequest(req)) {
    return NextResponse.json({ ok: false, error: "Origin tidak diizinkan" }, { status: 403 });
  }
  if (!authConfigured()) {
    return NextResponse.json({ ok: false, error: "Admin belum dikonfigurasi" }, { status: 503 });
  }

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 4096) {
    return NextResponse.json({ ok: false, error: "Request terlalu besar" }, { status: 413 });
  }

  const rate = await sharedRateLimit(`login:${clientIp(req)}`, 10, 10 * 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak percobaan. Tunggu sebentar lagi." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password.slice(0, 256) : "";
  if (!verifyPassword(password)) {
    return NextResponse.json({ ok: false, error: "Password salah" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(createSessionCookie());
  return response;
}
