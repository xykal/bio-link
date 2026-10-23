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

  // Dua lapis limiter:
  // 1) per IP  — 10 percobaan / 10 menit
  // 2) global  — 60 percobaan / 15 menit lintas IP. Ini jaring pengaman karena
  //    PIN admin bisa pendek (4 digit): tanpa lapis kedua, penyerang dengan
  //    banyak IP bisa menebak 0000-9999 dalam hitungan menit.
  const gate = await sharedRateLimit("login:global", 60, 15 * 60_000);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "Login sedang dikunci sementara. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } }
    );
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
    // Jeda kecil: bikin brute-force online jauh lebih lambat tanpa bikin
    // pengguna asli nunggu lama.
    await new Promise((resolve) => setTimeout(resolve, 350));
    return NextResponse.json({ ok: false, error: "Password salah" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(createSessionCookie(req));
  return response;
}
