// Shared Cloudflare D1 helper.
//
// Dua jalur akses:
//  1. BINDING NATIVE (`env.DB` dari wrangler.jsonc) — dipakai saat app jalan di
//     Cloudflare Workers (OpenNext). Query terjadi di dalam jaringan Cloudflare,
//     tanpa hop HTTPS, tanpa perlu API token di dalam Worker.
//  2. REST API (accounts/<id>/d1/database/<id>/query) — fallback untuk dev lokal
//     di luar Worker (mis. `next dev`/`next start` dengan Node) atau deploy lama.
//
// Pemilihan dilakukan lazy per-query, bukan saat modul di-import: binding baru
// tersedia setelah request masuk (AsyncLocalStorage), jadi `const useD1` di level
// modul bakal salah nilai.

import { getCloudflareContext } from "@opennextjs/cloudflare";

type D1BindingResult = { results?: unknown[] };
type D1BindingStatement = {
  bind: (...values: unknown[]) => { all: () => Promise<D1BindingResult> };
};
type D1Binding = {
  prepare: (sql: string) => D1BindingStatement;
};

const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CF_DB = process.env.CLOUDFLARE_D1_DATABASE_ID || "";
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

/** True kalau REST API D1 dikonfigurasi lewat environment. */
export const useD1Rest = Boolean(CF_ACCOUNT && CF_DB && CF_TOKEN);

export type D1ResultSet = { results?: unknown[] };

/**
 * Ambil binding D1 dari konteks request Cloudflare.
 * Mengembalikan null kalau tidak sedang jalan di Worker (dev Node, CI, dll).
 */
function d1Binding(): D1Binding | null {
  try {
    const env = getCloudflareContext()?.env as unknown as Record<string, unknown> | undefined;
    const db = env?.DB as D1Binding | undefined;
    return db && typeof db.prepare === "function" ? db : null;
  } catch {
    // Di luar Worker (next dev tanpa wrangler, CI `next start`) konteks tidak ada.
    return null;
  }
}

async function d1QueryBinding(
  db: D1Binding,
  sql: string,
  params: unknown[] = []
): Promise<D1ResultSet[]> {
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql).bind();
  const result = await stmt.all();
  return [{ results: result?.results ?? [] }];
}

async function d1QueryRestOnce(sql: string, params: unknown[] = []): Promise<D1ResultSet[]> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`;
  const body = params.length ? { sql, params } : { sql };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(`D1 query failed (HTTP ${res.status})`);
  }
  return json.result as D1ResultSet[];
}

/** Ada storage bersama yang bisa dipakai? (binding native atau REST) */
export function d1Available(): boolean {
  return d1Binding() !== null || useD1Rest;
}

export async function d1Query(sql: string, params: unknown[] = []): Promise<D1ResultSet[]> {
  const db = d1Binding();
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Binding native: satu panggilan langsung, tanpa retry jaringan berlebih.
      if (db) return await d1QueryBinding(db, sql, params);
      if (!useD1Rest) throw new Error("D1 tidak dikonfigurasi");
      return await d1QueryRestOnce(sql, params);
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
