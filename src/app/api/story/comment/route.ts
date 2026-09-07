import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readStore, writeStore } from "@/lib/data";
import { ensureVisitor, sanitizeVisitorId } from "@/lib/analytics";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Publik: komentar di sebuah story. Nama diambil dari visitor anonim di DB
// (konsisten per pengunjung); komentar tampil melayang + di bottom sheet.
// Rate limit 5 komentar / 10 menit / IP+visitor supaya tidak bisa di-spam.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const visitorIdPre = sanitizeVisitorId(body.visitorId);
  const rl = rateLimit(`comment:${clientKey(req, visitorIdPre)}`, 5, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Kebanyakan komentar, coba lagi nanti" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }
  const storyId = String(body.storyId || "");
  const text = String(body.text || "").trim().slice(0, 200);
  const visitorId = sanitizeVisitorId(body.visitorId);
  if (!storyId) return NextResponse.json({ error: "storyId kosong" }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Komentar kosong" }, { status: 400 });

  const rec = await ensureVisitor(visitorId);
  const name = rec.name;

  const store = await readStore();
  const story = store.stories.find((s) => s.id === storyId);
  if (!story) return NextResponse.json({ error: "Story tidak ditemukan" }, { status: 404 });

  const comment = { id: randomUUID(), name, text, at: Date.now() };
  story.comments = [...(story.comments || []), comment].slice(-100);
  await writeStore(store);
  return NextResponse.json({ ok: true, comment, comments: story.comments, name });
}
