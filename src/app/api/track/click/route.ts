import { NextResponse } from "next/server";
import { trackLinkClick } from "@/lib/analytics";
import { readStore } from "@/lib/data";
import { clientIp, sharedRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Publik: dipanggil saat sebuah link di halaman bio diklik.
export async function POST(req: Request) {
  const rate = await sharedRateLimit(`click:${clientIp(req)}`, 60, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Terlalu sering" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } });
  }
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 4096) return NextResponse.json({ error: "Request terlalu besar" }, { status: 413 });
  const body = await req.json().catch(() => ({}));
  const linkId = typeof body.linkId === "string" ? body.linkId.slice(0, 80) : "";
  if (!linkId) return NextResponse.json({ error: "linkId kosong" }, { status: 400 });

  const store = await readStore();
  const link = store.links.find((item) => item.id === linkId && item.enabled);
  if (!link) return NextResponse.json({ error: "Link tidak ditemukan" }, { status: 404 });
  const ref = typeof body.referrer === "string" ? body.referrer.slice(0, 300) : "";
  const ua = (req.headers.get("user-agent") || "").slice(0, 200);
  await trackLinkClick(link.id, link.title, {
    ref,
    ua,
    utmSource: typeof body.utmSource === "string" ? body.utmSource : "",
    utmMedium: typeof body.utmMedium === "string" ? body.utmMedium : "",
    utmCampaign: typeof body.utmCampaign === "string" ? body.utmCampaign : "",
  });
  return NextResponse.json({ ok: true });
}
