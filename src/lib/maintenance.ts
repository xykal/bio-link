import {
  readStore,
  writeStore,
  pruneExpiredStories,
  destroyStoryMedia,
  useD1,
  type MaintenanceLogEntry,
  type MaintenanceTrigger,
  type Store,
} from "./data";
import { getAnalytics, analyticsSize, pruneAnalytics, serverInfo } from "./analytics";
import { cacheStats, cacheInvalidate } from "./storecache";
import { d1Query } from "./d1";

// ===========================================================================
//  Perawatan server — dipakai menu "Perawatan" di panel admin & cron Vercel.
//  Semua aksi idempoten: aman dijalankan berulang, aman kalau tidak ada yang
//  perlu dibersihkan (laporan 0, tetap dicatat di log).
// ===========================================================================

export async function pingD1(): Promise<{ ok: boolean; ms: number; error?: string }> {
  if (!useD1) return { ok: false, ms: 0, error: "D1 tidak dikonfigurasi (mode file lokal)" };
  const t0 = Date.now();
  try {
    await d1Query("SELECT 1 AS ok");
    return { ok: true, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function flushServerCache(): Promise<void> {
  cacheInvalidate();
}

// Hapus story kedaluwarsa (>= 24 jam) dari store + destroy media Cloudinary-nya.
// readStore() sebenarnya sudah melakukan ini tiap baca, tapi hanya saat ada
// trafik — aksi manual/cron menjamin jalan walau sepi.
export async function pruneStoriesNow(): Promise<number> {
  const store = await readStore();
  const { store: next, changed, expired } = pruneExpiredStories(store);
  if (!changed) return 0;
  await writeStore(next);
  // Media Cloudinary ikut dihapus (writeStore tidak melakukannya).
  await destroyStoryMedia(expired);
  return expired.length;
}

export type HousekeepingReport = {
  ok: boolean;
  storiesPruned: number;
  visitsPruned: number;
  visitorsPruned: number;
  cacheFlushed: boolean;
  summary: string;
  error?: string;
};

// Perawatan penuh: story kadaluarsa + analytics lama + flush cache + catat log.
export async function runHousekeeping(trigger: MaintenanceTrigger): Promise<HousekeepingReport> {
  let storiesPruned = 0;
  let visitsPruned = 0;
  let visitorsPruned = 0;
  let cacheFlushed = false;
  try {
    const store0 = await readStore();
    const retentionDays = store0.maintenance?.retentionDays ?? 30;

    const { store: next, changed, expired } = pruneExpiredStories(store0);
    if (changed) {
      await writeStore(next);
      storiesPruned = expired.length;
    }

    const pr = await pruneAnalytics(retentionDays);
    visitsPruned = pr.visitsPruned;
    visitorsPruned = pr.visitorsPruned;

    await flushServerCache();
    cacheFlushed = true;

    const parts: string[] = [];
    if (storiesPruned) parts.push(`${storiesPruned} story kadaluarsa dihapus`);
    if (visitsPruned) parts.push(`${visitsPruned} kunjungan lama dibersihkan`);
    if (visitorsPruned) parts.push(`${visitorsPruned} pengunjung lama dibersihkan`);
    if (!parts.length) parts.push("tidak ada yang perlu dibersihkan");
    const summary = `${parts.join(", ")}; cache server dibuang`;

    await logMaintenance(trigger, {
      ok: true,
      summary,
      storiesPruned,
      visitsPruned,
      visitorsPruned,
      cacheFlushed,
    });
    return { ok: true, storiesPruned, visitsPruned, visitorsPruned, cacheFlushed, summary };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await logMaintenance(trigger, {
      ok: false,
      summary: "perawatan gagal",
      storiesPruned,
      visitsPruned,
      visitorsPruned,
      cacheFlushed,
      error,
    }).catch(() => undefined);
    return { ok: false, storiesPruned, visitsPruned, visitorsPruned, cacheFlushed, summary: "perawatan gagal", error };
  }
}

async function logMaintenance(
  trigger: MaintenanceTrigger,
  r: Omit<MaintenanceLogEntry, "at" | "trigger">
): Promise<void> {
  const store = await readStore();
  const log = store.maintenance?.log ?? [];
  const entry: MaintenanceLogEntry = { at: Date.now(), trigger, ...r };
  const next: Store = {
    ...store,
    maintenance: { ...store.maintenance, log: [...log, entry].slice(-30) },
  };
  await writeStore(next);
}

export function lastAutoRun(store: Store): MaintenanceLogEntry | null {
  const log = store.maintenance?.log ?? [];
  for (let i = log.length - 1; i >= 0; i--) if (log[i].trigger === "cron") return log[i];
  return log.length ? log[log.length - 1] : null;
}

// Snapshot diagnostik lengkap buat panel Perawatan.
export async function getDiagnostics() {
  const store = await readStore();
  const analytics = await getAnalytics();
  const d1 = await pingD1();
  return {
    time: new Date().toISOString(),
    storage: {
      mode: useD1 ? "Cloudflare D1" : "file lokal (dev)",
      d1,
    },
    store: {
      links: store.links.length,
      stories: store.stories.length,
      storiesExpiringSoon: store.stories.filter(
        (s) => Date.now() - (s.createdAt || 0) > 24 * 3600e3 - 2 * 3600e3
      ).length,
      stack: store.stack.length,
      team: store.team.length,
      comments: store.stories.reduce((n, s) => n + (s.comments?.length || 0), 0),
      approxKB: Math.round(JSON.stringify(store).length / 1024),
    },
    analytics: analyticsSize(analytics),
    cache: cacheStats(),
    server: serverInfo(),
    env: {
      cloudinary: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
      ),
      sessionSecret: Boolean(process.env.SESSION_SECRET),
      cronSecret: Boolean(process.env.CRON_SECRET),
      adminPasswordDefault: process.env.ADMIN_PASSWORD === "0099" || !process.env.ADMIN_PASSWORD,
    },
    maintenance: {
      autoEnabled: store.maintenance?.autoEnabled !== false,
      retentionDays: store.maintenance?.retentionDays ?? 30,
      log: store.maintenance?.log ?? [],
    },
  };
}
