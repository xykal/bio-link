import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { visitorView, sanitizeVisitorId } from "@/lib/analytics";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const VIEWED_COOKIE = "bio_viewed";

// Publik: tandai story sudah dilihat. Disimpan di DB (per visitor) DAN di cookie
// biar halaman bisa render ring abu langsung saat SSR (tahan refresh).
// Rate limit 60/10 menit — cukup longgar untuk browsing normal, ketat untuk bot.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rl = rateLimit(`view:${clientKey(req, sanitizeVisitorId(body.visitorId))}`, 60, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu sering" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
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
