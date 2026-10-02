// Shared Cloudflare D1 REST helper.
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CF_DB = process.env.CLOUDFLARE_D1_DATABASE_ID || "";
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

export const useD1 = Boolean(CF_ACCOUNT && CF_DB && CF_TOKEN);
export type D1ResultSet = { results?: unknown[] };

async function d1QueryOnce(sql: string, params: unknown[] = []): Promise<D1ResultSet[]> {
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

export async function d1Query(sql: string, params: unknown[] = []): Promise<D1ResultSet[]> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await d1QueryOnce(sql, params);
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
