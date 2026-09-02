import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/data";

export const dynamic = "force-dynamic";

// Publik: like sebuah story. Jumlah like tersimpan & terlihat di admin.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const storyId = String(body.storyId || "");
  if (!storyId) return NextResponse.json({ error: "storyId kosong" }, { status: 400 });

  const store = await readStore();
  const story = store.stories.find((s) => s.id === storyId);
  if (!story) return NextResponse.json({ error: "Story tidak ditemukan" }, { status: 404 });

  story.likes = (story.likes || 0) + 1;
  await writeStore(store);
  return NextResponse.json({ ok: true, likes: story.likes });
}
