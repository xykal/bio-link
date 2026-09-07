import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  getDiagnostics,
  flushServerCache,
  pruneStoriesNow,
  runHousekeeping,
} from "@/lib/maintenance";
import { pruneAnalytics } from "@/lib/analytics";
import { readStore, writeStore } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET: snapshot diagnostik buat panel Perawatan.
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const diag = await getDiagnostics();
  return NextResponse.json(diag, { headers: { "Cache-Control": "no-store" } });
}

// POST: aksi perawatan.
//   { action: "flush-cache" }        buang micro-cache server
//   { action: "prune-stories" }      hapus story kadaluarsa + media Cloudinary
//   { action: "prune-analytics" }    bersihkan visits/visitors lama (sesuai retensi)
//   { action: "housekeeping" }       perawatan penuh (semua di atas + catat log)
//   { action: "save-settings", autoEnabled?, retentionDays? }
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  try {
    if (action === "flush-cache") {
      await flushServerCache();
      return NextResponse.json({ ok: true, message: "Cache server dibuang" });
    }

    if (action === "prune-stories") {
      const n = await pruneStoriesNow();
      return NextResponse.json({
        ok: true,
        message: n ? `${n} story kadaluarsa dihapus (media ikut dibersihkan)` : "Tidak ada story kadaluarsa",
      });
    }

    if (action === "prune-analytics") {
      const store = await readStore();
      const r = await pruneAnalytics(store.maintenance?.retentionDays ?? 30);
      return NextResponse.json({
        ok: true,
        message: r.visitsPruned || r.visitorsPruned
          ? `${r.visitsPruned} kunjungan & ${r.visitorsPruned} pengunjung lama dibersihkan`
          : "Tidak ada data lama yang melewati retensi",
      });
    }

    if (action === "housekeeping") {
      const r = await runHousekeeping("manual");
      return NextResponse.json({ ok: r.ok, message: r.summary, error: r.error });
    }

    if (action === "save-settings") {
      const store = await readStore();
      const autoEnabled =
        typeof body.autoEnabled === "boolean" ? body.autoEnabled : store.maintenance.autoEnabled;
      const retentionDays =
        typeof body.retentionDays === "number" && body.retentionDays >= 7 && body.retentionDays <= 365
          ? Math.round(body.retentionDays)
          : store.maintenance.retentionDays;
      await writeStore({
        ...store,
        maintenance: { ...store.maintenance, autoEnabled, retentionDays },
      });
      return NextResponse.json({
        ok: true,
        message: "Pengaturan perawatan tersimpan",
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal menjalankan aksi" },
      { status: 500 }
    );
  }
}
