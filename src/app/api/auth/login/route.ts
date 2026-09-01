import { NextResponse } from "next/server";
import {
  verifyPin,
  createSessionCookie,
  rateLimited,
  clientIp,
} from "@/lib/auth";

export async function POST(req: Request) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak percobaan. Tunggu sebentar lagi." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body.password ?? "");

  if (!verifyPin(password)) {
    return NextResponse.json({ ok: false, error: "Password salah" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(createSessionCookie());
  return res;
}
