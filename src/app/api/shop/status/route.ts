import { NextResponse } from "next/server";
import { d1Available, d1Query } from "@/lib/d1";
import { transactionStatus } from "@/lib/pakasir";

export const dynamic = "force-dynamic";

type OrderRow = {
  order_id: string;
  product_name: string;
  qty: number;
  amount: number;
  status: string;
  created_at: number;
  paid_at: number | null;
};

// Cek status pesanan: selalu konfirmasi ulang ke API Pakasir (webhook mentah
// tidak dipercaya), lalu simpan hasilnya kalau berubah jadi completed.
export async function GET(req: Request) {
  const orderId = new URL(req.url).searchParams.get("order") || "";
  if (!/^[A-Z0-9]{6,40}$/.test(orderId) || !d1Available()) {
    return NextResponse.json({ ok: false, error: "Order tidak valid" }, { status: 400 });
  }

  const rows = await d1Query(
    `SELECT order_id, product_name, qty, amount, status, created_at, paid_at
     FROM shop_orders WHERE order_id = ?`,
    [orderId]
  );
  const order = rows?.[0]?.results?.[0] as OrderRow | undefined;
  if (!order) {
    return NextResponse.json({ ok: false, error: "Pesanan tidak ditemukan" }, { status: 404 });
  }

  let status = order.status;
  if (status === "pending") {
    const check = await transactionStatus(order.order_id, order.amount).catch(() => ({
      status: "unknown" as const,
    }));
    if (check.status === "completed") {
      await d1Query(
        `UPDATE shop_orders SET status = 'completed', paid_at = ? WHERE order_id = ? AND status = 'pending'`,
        [Date.now(), orderId]
      );
      status = "completed";
    } else if (check.status === "canceled") {
      await d1Query(`UPDATE shop_orders SET status = 'canceled' WHERE order_id = ?`, [orderId]);
      status = "canceled";
    }
  }

  return NextResponse.json(
    {
      ok: true,
      orderId: order.order_id,
      productName: order.product_name,
      qty: order.qty,
      amount: order.amount,
      status,
      createdAt: order.created_at,
      paidAt: order.paid_at,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
