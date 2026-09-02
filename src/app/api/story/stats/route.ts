import { NextResponse } from "next/server";
import { readStore } from "@/lib/data";

export const dynamic = "force-dynamic";

// Publik: snapshot like + komentar terbaru per story, dipolling viewer biar
// interaksi terasa realtime antar pengunjung.
export async function GET() {
  const store = await readStore();
  const stats = store.stories.map((s) => ({
    id: s.id,
    likes: s.likes || 0,
    comments: (s.comments || []).slice(-15).map((c) => ({
      id: c.id,
      name: c.name,
      text: c.text,
      at: c.at,
    })),
  }));
  return NextResponse.json(
    { ok: true, stats },
    { headers: { "Cache-Control": "no-store" } }
  );
}
