import { NextResponse } from "next/server";
import { trackLinkClick } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// Publik: dipanggil saat sebuah link di halaman bio diklik.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const linkId = String(body.linkId || "").slice(0, 80);
  const title = String(body.title || "").slice(0, 120);
  if (!linkId) return NextResponse.json({ error: "linkId kosong" }, { status: 400 });
  await trackLinkClick(linkId, title);
  return NextResponse.json({ ok: true });
}
