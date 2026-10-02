import crypto from "crypto";
import { d1Query, useD1 } from "./d1";

const buckets = new Map<string, { hits: number[]; seenAt: number }>();
const WINDOW_CLEANUP_MS = 5 * 60_000;
let rateTableReady: Promise<void> | null = null;
let lastCleanupAt = 0;

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);
  const hits = (entry?.hits || []).filter((time) => now - time < windowMs);
  hits.push(now);
  buckets.set(key, { hits, seenAt: now });

  if (buckets.size > 5000) {
    for (const [bucketKey, bucket] of buckets) {
      if (now - bucket.seenAt > windowMs * 2) buckets.delete(bucketKey);
    }
    while (buckets.size > 5000) {
      const oldest = buckets.keys().next().value as string | undefined;
      if (!oldest) break;
      buckets.delete(oldest);
    }
  }

  if (hits.length > limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)),
    };
  }
  return { ok: true, retryAfterSec: 0 };
}

async function ensureRateTable(): Promise<void> {
  if (!rateTableReady) {
    rateTableReady = d1Query(
      "CREATE TABLE IF NOT EXISTS api_rate_limits (bucket TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL, expires_at INTEGER NOT NULL)"
    ).then(() => undefined).catch((error) => {
      rateTableReady = null;
      throw error;
    });
  }
  await rateTableReady;
}

export async function sharedRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (!useD1) return rateLimit(key, limit, windowMs);

  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const bucket = crypto.createHash("sha256").update(key).digest("hex");
  await ensureRateTable();

  if (now - lastCleanupAt >= WINDOW_CLEANUP_MS) {
    lastCleanupAt = now;
    void d1Query("DELETE FROM api_rate_limits WHERE expires_at <= ?", [now]).catch(() => {
      lastCleanupAt = 0;
    });
  }

  const rows = await d1Query(
    `INSERT INTO api_rate_limits (bucket, window_start, count, expires_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(bucket) DO UPDATE SET
       count = CASE
         WHEN api_rate_limits.window_start = excluded.window_start
           THEN MIN(api_rate_limits.count + 1, ?)
         ELSE 1
       END,
       window_start = excluded.window_start,
       expires_at = excluded.expires_at
     RETURNING count`,
    [bucket, windowStart, windowStart + windowMs * 2, limit + 1]
  );
  const first = rows?.[0]?.results?.[0] as { count?: unknown } | undefined;
  if (typeof first?.count !== "number") throw new Error("D1 rate-limit result missing count");
  if (first.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

export function clientKey(req: Request, visitorId = ""): string {
  return `${clientIp(req)}:${visitorId}`;
}
