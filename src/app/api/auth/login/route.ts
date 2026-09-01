import { NextResponse } from "next/server";
import { ADMIN_PASSWORD, createSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = (body.password || "") as string;

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: "Password salah" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(createSessionCookie());
  return res;
}
