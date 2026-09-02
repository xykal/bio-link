import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { visitorView, sanitizeVisitorId } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const VIEWED_COOKIE = "bio_viewed";

// Publik: tandai story sudah dilihat. Disimpan di DB (per visitor) DAN di cookie
// biar halaman bisa render ring abu langsung saat SSR (tahan refresh).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
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
