import { NextResponse } from "next/server";
import { clientKey, sharedRateLimit } from "@/lib/ratelimit";
import { safeEqual } from "@/lib/auth";
import { runHousekeeping } from "@/lib/maintenance";
import { readStore } from "@/lib/data";

export const dynamic = "force-dynamic";

// Perawatan berkala otomatis — dipanggil Vercel Cron tiap hari (lihat vercel.json,
// jadwal 20:15 UTC = 03:15 WIB). Isi: hapus story kadaluarsa + media Cloudinary,
// bersihkan analytics lama sesuai retensi, buang cache server, catat log.

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return process.env.NODE_ENV !== "production";
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return Boolean(bearer) && safeEqual(bearer, secret);
}

export async function GET(req: Request) {
  const rl = await sharedRateLimit(`cron:${clientKey(req)}`, 3, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "terlalu_sering" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Saklar on/off dari panel admin (menu Perawatan).
  const store = await readStore();
  if (store.maintenance?.autoEnabled === false) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: "Perawatan otomatis dimatikan dari panel admin" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const report = await runHousekeeping("cron");
  return NextResponse.json(report, {
    status: report.ok ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
