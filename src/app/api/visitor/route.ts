import { NextResponse } from "next/server";
import { ensureVisitor, sanitizeVisitorId } from "@/lib/analytics";
import { clientIp, sharedRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Publik: inisialisasi visitor anonim. Kembalikan nama + riwayat like/view yang
// tersimpan di DB, biar konsisten walau refresh / buka lagi.
export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 4096) return NextResponse.json({ error: "Request terlalu besar" }, { status: 413 });
  const rate = await sharedRateLimit(`visitor:${clientIp(req)}`, 12, 10 * 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Terlalu sering" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } });
  }
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
