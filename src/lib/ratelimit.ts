// Rate limiter in-memory sederhana per-instance (pola sama dengan limiter login
// di lib/auth.ts). Dipakai API story publik supaya komentar/like/view tidak bisa
// di-spam sepuasnya — dulu cuma login yang dibatasi, API story terbuka polos.

const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    const retryAfterSec = Math.max(1, Math.ceil((arr[0] + windowMs - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  arr.push(now);
  buckets.set(key, arr);
  // Safety valve: jangan biarkan map tumbuh tanpa batas dipakai bot.
  if (buckets.size > 5000) buckets.clear();
  return { ok: true, retryAfterSec: 0 };
}

// Kunci gabungan IP + visitorId (kalau ada) — IP cukup baik di Vercel karena
// header x-forwarded-for diisi platform, bukan bebas dipalsukan user.
export function clientKey(req: Request, visitorId = ""): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${ip}:${visitorId}`;
}
