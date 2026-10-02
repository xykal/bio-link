import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { visitorView, sanitizeVisitorId } from "@/lib/analytics";
import { clientKey, sharedRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const VIEWED_COOKIE = "bio_viewed";

// Publik: tandai story sudah dilihat. Disimpan di DB (per visitor) DAN di cookie
// biar halaman bisa render ring abu langsung saat SSR (tahan refresh).
// Rate limit 60/10 menit — cukup longgar untuk browsing normal, ketat untuk bot.
export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 4096) return NextResponse.json({ error: "Request terlalu besar" }, { status: 413 });
  const body = await req.json().catch(() => ({}));
  const ipLimit = await sharedRateLimit(`view-ip:${clientKey(req)}`, 300, 10 * 60_000);
  const visitorLimit = await sharedRateLimit(`view:${clientKey(req, sanitizeVisitorId(body.visitorId))}`, 60, 10 * 60_000);
  if (!ipLimit.ok || !visitorLimit.ok) {
    const retryAfterSec = Math.max(ipLimit.retryAfterSec, visitorLimit.retryAfterSec);
    return NextResponse.json(
      { error: "Terlalu sering" },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }
  const id = sanitizeVisitorId(body.visitorId);
  const storyId = String(body.storyId || "");
  if (!id || !storyId)
    return NextResponse.json({ error: "visitorId/storyId kosong" }, { status: 400 });

  const rec = await visitorView(id, storyId);
  const viewed = rec.viewed.slice(-30);

  const res = NextResponse.json({ ok: true, viewed });
  try {
    const store = await cookies();
    store.set({
      name: VIEWED_COOKIE,
      value: JSON.stringify(viewed),
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } catch {
    /* ignore */
  }
  return res;
}
