import { NextResponse } from "next/server";
import { clearSessionCookie, sameOriginRequest } from "@/lib/auth";

export async function POST(req: Request) {
  if (!sameOriginRequest(req)) {
    return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearSessionCookie());
  return res;
}
