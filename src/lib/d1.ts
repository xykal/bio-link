// Helper Cloudflare D1 (REST API) bersama. Dipakai data.ts & analytics.ts.
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CF_DB = process.env.CLOUDFLARE_D1_DATABASE_ID || "";
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

export const useD1 = Boolean(CF_ACCOUNT && CF_DB && CF_TOKEN);

export type D1ResultSet = { results?: unknown[] };

async function d1QueryOnce(sql: string): Promise<D1ResultSet[]> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`D1 error: ${JSON.stringify(json.errors || json)}`);
  return json.result;
}

// Retry untuk blip transient Cloudflare D1 (internal error sesaat).
export async function d1Query(sql: string): Promise<D1ResultSet[]> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await d1QueryOnce(sql);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
