import { NextResponse } from "next/server";
import { readStore } from "@/lib/data";
import { clientIp, sharedRateLimit } from "@/lib/ratelimit";
import { createTransaction, pakasirConfigured, paymentPageUrl } from "@/lib/pakasir";
import { d1Available, d1Query } from "@/lib/d1";

export const dynamic = "force-dynamic";

// Order shop disimpan di tabel terpisah (bukan di JSON store) supaya baris
// utama D1 tidak membengkak dan aman ditulis bersamaan.
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS shop_orders (
  order_id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  buyer TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  paid_at INTEGER
)`;

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await d1Query(CREATE_TABLE);
  tableReady = true;
}

function makeOrderId() {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BL${Date.now().toString(36).toUpperCase()}${rand}`;
}

export async function POST(req: Request) {
  if (!pakasirConfigured) {
    return NextResponse.json(
      { ok: false, error: "Pembayaran belum aktif (PAKASIR_PROJECT/API_KEY belum diset)." },
      { status: 503 }
    );
  }
  if (!d1Available()) {
    return NextResponse.json(
      { ok: false, error: "Order butuh storage D1." },
      { status: 503 }
    );
  }

  const rl = await sharedRateLimit(`shop:${clientIp(req)}`, 8, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak percobaan. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId : "";
  const qty = Math.max(1, Math.min(20, Math.round(Number(body.qty) || 1)));
  const buyer = typeof body.buyer === "string" ? body.buyer.trim().slice(0, 60) : "";
  const contact = typeof body.contact === "string" ? body.contact.trim().slice(0, 80) : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : "";

  const store = await readStore();
  if (!store.shop.enabled) {
    return NextResponse.json({ ok: false, error: "Shop sedang ditutup." }, { status: 403 });
  }
  const product = store.products.find((p) => p.id === productId && p.enabled);
  if (!product) {
    return NextResponse.json({ ok: false, error: "Produk tidak ditemukan." }, { status: 404 });
  }
  if (product.price <= 0) {
    return NextResponse.json({ ok: false, error: "Harga produk belum diatur." }, { status: 400 });
  }
  if (product.stock === 0) {
    return NextResponse.json({ ok: false, error: "Stok habis." }, { status: 409 });
  }
  if (qty > 1 && product.stock > 0 && qty > product.stock) {
    return NextResponse.json({ ok: false, error: "Jumlah melebihi stok." }, { status: 409 });
  }
  if (!buyer || !contact) {
    return NextResponse.json(
      { ok: false, error: "Nama dan kontak (WA/email) wajib diisi." },
      { status: 400 }
    );
  }

  const amount = product.price * qty;
  const method = store.shop.methods[0] || "qris";
  const orderId = makeOrderId();

  await ensureTable();
  await d1Query(
    `INSERT INTO shop_orders (order_id, product_id, product_name, qty, amount, status, buyer, contact, note, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    [orderId, product.id, product.name, qty, amount, buyer, contact, note, Date.now()]
  );

  try {
    const payment = await createTransaction(orderId, amount, method);
    return NextResponse.json(
      {
        ok: true,
        orderId,
        amount,
        total: payment?.total_payment ?? amount,
        qris: payment?.payment_number ?? "",
        expiredAt: payment?.expired_at ?? "",
        payUrl: payment?.payment_number
          ? `https://app.pakasir.com/pay/${process.env.PAKASIR_PROJECT}/${amount}?order_id=${orderId}`
          : paymentPageUrl(orderId, amount, method),
        product: { name: product.name, qty, price: product.price },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    await d1Query(`UPDATE shop_orders SET status = 'failed' WHERE order_id = ?`, [orderId]);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? `Gagal membuat pembayaran: ${error.message}` : "Gagal membuat pembayaran.",
      },
      { status: 502 }
    );
  }
}
