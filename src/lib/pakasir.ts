// Klien Pakasir (https://pakasir.com/p/docs).
//
// Alur yang dipakai di sini sengaja sederhana dan aman:
//   1. Server membuat transaksi (API key tidak pernah sampai ke browser).
//   2. Browser diarahkan ke halaman pembayaran resmi Pakasir
//      (https://app.pakasir.com/pay/{project}/{amount}?order_id=...) atau
//      menampilkan QR string kalau nanti mau QR lokal.
//   3. Status dicek ulang lewat API detail (bukan percaya webhook mentah).

const HOST = "https://app.pakasir.com";

export const PAKASIR_PROJECT = process.env.PAKASIR_PROJECT || "";
const PAKASIR_API_KEY = process.env.PAKASIR_API_KEY || "";

export const pakasirConfigured = Boolean(PAKASIR_PROJECT && PAKASIR_API_KEY);

export type PakasirPayment = {
  project: string;
  order_id: string;
  amount: number;
  fee: number;
  total_payment: number;
  payment_method: string;
  payment_number: string;
  expired_at: string;
};

export type PakasirTransactionStatus = "pending" | "completed" | "canceled" | "unknown";

function normalizeMethod(method: string): string {
  const allowed = ["qris", "bni_va", "bri_va", "permata_va", "cimb_niaga_va"];
  return allowed.includes(method) ? method : "qris";
}

/** Halaman pembayaran hosted Pakasir (tanpa panggilan API). */
export function paymentPageUrl(orderId: string, amount: number, method = "qris"): string {
  const params = new URLSearchParams({ order_id: orderId });
  if (method !== "qris") params.set("method", method);
  return `${HOST}/pay/${PAKASIR_PROJECT}/${Math.max(1, Math.round(amount))}?${params.toString()}`;
}

/** Buat transaksi di Pakasir. Null kalau Pakasir belum dikonfigurasi. */
export async function createTransaction(
  orderId: string,
  amount: number,
  method = "qris"
): Promise<PakasirPayment | null> {
  if (!pakasirConfigured) return null;
  const res = await fetch(`${HOST}/api/transactioncreate/${normalizeMethod(method)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project: PAKASIR_PROJECT,
      order_id: orderId,
      amount: Math.max(1, Math.round(amount)),
      api_key: PAKASIR_API_KEY,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { payment?: PakasirPayment };
  if (!res.ok || !json.payment) {
    throw new Error(`Pakasir create gagal (HTTP ${res.status})`);
  }
  return json.payment;
}

/** Detail transaksi: satu-satunya sumber kebenaran status pembayaran. */
export async function transactionStatus(
  orderId: string,
  amount: number
): Promise<{ status: PakasirTransactionStatus; raw?: unknown }> {
  if (!pakasirConfigured) return { status: "unknown" };
  const params = new URLSearchParams({
    project: PAKASIR_PROJECT,
    amount: String(Math.max(1, Math.round(amount))),
    order_id: orderId,
    api_key: PAKASIR_API_KEY,
  });
  const res = await fetch(`${HOST}/api/transactiondetail?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  const json = (await res.json().catch(() => ({}))) as {
    transaction?: { status?: string };
  };
  const status = json.transaction?.status;
  if (status === "completed" || status === "pending" || status === "canceled") {
    return { status, raw: json.transaction };
  }
  return { status: "unknown", raw: json };
}

/**
 * Tempelkan status "pembayaran siap" ke config shop sebelum dikirim ke client.
 * Dipakai halaman server (bio/project/shop) supaya SSR tidak sempat menampilkan
 * tombol beli yang ujung-ujungnya 503 saat kredensial belum dipasang.
 */
export function withPayReady<T extends { shop: ShapelessShop }>(store: T): T {
  return { ...store, shop: { ...store.shop, payReady: pakasirConfigured } };
}

type ShapelessShop = { [key: string]: unknown };
