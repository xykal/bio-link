import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readStore, writeStore } from "@/lib/data";

export const dynamic = "force-dynamic";

// Publik: komentar di sebuah story. Komentar tampil melayang di kanan-bawah.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const storyId = String(body.storyId || "");
  const text = String(body.text || "").trim().slice(0, 200);
  const name = String(body.name || "Anon").trim().slice(0, 40) || "Anon";
  if (!storyId) return NextResponse.json({ error: "storyId kosong" }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Komentar kosong" }, { status: 400 });

  const store = await readStore();
  const story = store.stories.find((s) => s.id === storyId);
  if (!story) return NextResponse.json({ error: "Story tidak ditemukan" }, { status: 404 });

  const comment = { id: randomUUID(), name, text, at: Date.now() };
  story.comments = [...(story.comments || []), comment].slice(-100);
  await writeStore(store);
  return NextResponse.json({ ok: true, comment, comments: story.comments });
}
