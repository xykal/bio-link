import { NextResponse } from "next/server";
import { ensureVisitor, sanitizeVisitorId } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// Publik: inisialisasi visitor anonim. Kembalikan nama + riwayat like/view yang
// tersimpan di DB, biar konsisten walau refresh / buka lagi.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = sanitizeVisitorId(body.visitorId);
  const rec = await ensureVisitor(id);
  return NextResponse.json({
    visitorId: id,
    name: rec.name,
    liked: rec.liked,
    viewed: rec.viewed,
  });
}
