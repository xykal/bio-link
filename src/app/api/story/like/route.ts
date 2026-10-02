import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/data";
import { visitorLike, sanitizeVisitorId } from "@/lib/analytics";
import { clientKey, sharedRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Publik: like sebuah story. Per visitor anonim hanya bisa like 1 kali
// (dicek di DB), jadi walau refresh tidak nambah lagi. Rate limit 15/10 menit
// untuk melindungi store dari spam bot.
export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 4096) return NextResponse.json({ error: "Request terlalu besar" }, { status: 413 });
  const body = await req.json().catch(() => ({}));
  const ipLimit = await sharedRateLimit(`like-ip:${clientKey(req)}`, 120, 10 * 60_000);
  const visitorLimit = await sharedRateLimit(`like:${clientKey(req, sanitizeVisitorId(body.visitorId))}`, 15, 10 * 60_000);
  if (!ipLimit.ok || !visitorLimit.ok) {
    const retryAfterSec = Math.max(ipLimit.retryAfterSec, visitorLimit.retryAfterSec);
    return NextResponse.json(
      { error: "Terlalu sering, coba lagi nanti" },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }
  const storyId = String(body.storyId || "");
  const visitorId = sanitizeVisitorId(body.visitorId);
  if (!storyId) return NextResponse.json({ error: "storyId kosong" }, { status: 400 });

  const store = await readStore();
  const story = store.stories.find((s) => s.id === storyId);
  if (!story) return NextResponse.json({ error: "Story tidak ditemukan" }, { status: 404 });

  const { already } = visitorId
    ? await visitorLike(visitorId, storyId)
    : { already: false };

  if (!already) {
    story.likes = (story.likes || 0) + 1;
    await writeStore(store);
  }
  return NextResponse.json({ ok: true, likes: story.likes, liked: true, already });
}
