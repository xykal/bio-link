import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/data";
import { visitorLike, sanitizeVisitorId } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// Publik: like sebuah story. Per visitor anonim hanya bisa like 1 kali
// (dicek di DB), jadi walau refresh tidak nambah lagi.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
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
