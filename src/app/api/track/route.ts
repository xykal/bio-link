import { NextResponse } from "next/server";
import { trackVisit } from "@/lib/analytics";
import { clientIp, sharedRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Publik: dipanggil sekali saat halaman bio dibuka untuk menghitung kunjungan.
export async function POST(req: Request) {
  const rate = await sharedRateLimit(`track:${clientIp(req)}`, 30, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Terlalu sering" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } });
  }
  const ref = req.headers.get("referer") || "";
  const ua = (req.headers.get("user-agent") || "").slice(0, 200);
  await trackVisit({ path: "/", ref: ref.slice(0, 200), ua });
  return NextResponse.json({ ok: true });
}
