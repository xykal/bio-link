import type { Store } from "./data";

// Micro-cache baca store (baris id=1 di D1). Tanpa ini, SETIAP kunjungan halaman
// publik memukul REST API Cloudflare D1 — lambat & makan kuota. Dengan ini,
// beban D1 turun drastis dan perubahan dari panel admin tetap cepat terlihat
// karena writeStore selalu membuang cache (TTL cuma pengaman tambahan).
//
// Catatan jujur: di serverless (Vercel) state module hidup per-instance lambda,
// jadi tombol "bersihkan cache" di panel mengosongkan instance yang kebetulan
// melayani request itu; instance lain max. TTL_S terdeteksi sendiri.

export const CACHE_TTL_MS = 10_000;

let cached: { store: Store; at: number } | null = null;
const stats = {
  hits: 0,
  misses: 0,
  flushes: 0,
  lastFlushAt: 0,
  lastSetAt: 0,
};

export function cacheGet(): Store | null {
  if (!cached) {
    stats.misses++;
    return null;
  }
  if (Date.now() - cached.at > CACHE_TTL_MS) {
    cached = null;
    stats.misses++;
    return null;
  }
  stats.hits++;
  return cached.store;
}

export function cacheSet(store: Store): void {
  cached = { store, at: Date.now() };
  stats.lastSetAt = Date.now();
}

export function cacheInvalidate(): void {
  if (cached) {
    cached = null;
    stats.flushes++;
    stats.lastFlushAt = Date.now();
  }
}

export function cacheStats() {
  return {
    ttlMs: CACHE_TTL_MS,
    hits: stats.hits,
    misses: stats.misses,
    flushes: stats.flushes,
    cached: Boolean(cached),
    lastSetAt: stats.lastSetAt || null,
    lastFlushAt: stats.lastFlushAt || null,
  };
}
