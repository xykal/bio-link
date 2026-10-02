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
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 4096) return NextResponse.json({ error: "Request terlalu besar" }, { status: 413 });
  const body = await req.json().catch(() => ({}));
  const ref = typeof body.referrer === "string" ? body.referrer.slice(0, 300) : "";
  const ua = (req.headers.get("user-agent") || "").slice(0, 200);
  await trackVisit({
    path: "/",
    ref,
    ua,
    utmSource: typeof body.utmSource === "string" ? body.utmSource : "",
    utmMedium: typeof body.utmMedium === "string" ? body.utmMedium : "",
    utmCampaign: typeof body.utmCampaign === "string" ? body.utmCampaign : "",
  });
  return NextResponse.json({ ok: true });
}
