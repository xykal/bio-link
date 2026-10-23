"use client";

import { useEffect, useMemo, useState } from "react";
import { optImg } from "@/lib/img";
import type { ProductItem, ShopConfig } from "@/lib/data";

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

type OrderResult = {
  ok: boolean;
  error?: string;
  orderId?: string;
  amount?: number;
  total?: number;
  qris?: string;
  expiredAt?: string;
  payUrl?: string;
  product?: { name: string; qty: number; price: number };
};

export default function ShopGrid({
  products,
  shop,
  isLight,
}: {
  products: ProductItem[];
  shop: ShopConfig;
  isLight?: boolean;
}) {
  const [active, setActive] = useState<ProductItem | null>(null);
  const [qty, setQty] = useState(1);
  const [buyer, setBuyer] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [status, setStatus] = useState<string>("");

  // payReady === false -> kredensial Pakasir belum dipasang di Worker.
  const payReady = shop.payReady !== false;

  const items = useMemo(
    () => products.slice().sort((a, b) => a.order - b.order),
    [products]
  );

  // Polling status selama modal terbuka & belum lunas (maks 20x).
  useEffect(() => {
    if (!order?.orderId || status === "completed" || status === "canceled") return;
    let tries = 0;
    const timer = window.setInterval(async () => {
      tries += 1;
      try {
        const res = await fetch(`/api/shop/status?order=${order.orderId}`);
        const json = await res.json();
        if (json?.status) setStatus(json.status);
      } catch {
        /* diamkan, coba lagi di tick berikutnya */
      }
      if (tries >= 20) window.clearInterval(timer);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [order?.orderId, status]);

  async function submit() {
    if (!active) return;
    if (!payReady) {
      setError("Pembayaran belum aktif. Coba lagi nanti ya.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/shop/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: active.id, qty, buyer, contact, note }),
      });
      const json = (await res.json()) as OrderResult;
      if (!json.ok) {
        setError(json.error || "Gagal membuat pesanan.");
      } else {
        setOrder(json);
        setStatus("pending");
      }
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setActive(null);
    setOrder(null);
    setStatus("");
    setError("");
    setQty(1);
    setNote("");
  }

  if (!shop.enabled) {
    return (
      <p
        className={`mt-6 w-full rounded-2xl border px-4 py-6 text-center text-sm ${
          isLight ? "border-black/10 text-black/50" : "border-white/10 text-white/40"
        }`}
      >
        Shop sedang ditutup. Cek lagi nanti ya.
      </p>
    );
  }

  return (
    <div className="mt-6 w-full">
      <p className={`text-center text-[12.5px] leading-relaxed ${isLight ? "text-black/60" : "text-white/55"}`}>
        {shop.note}
      </p>

      {payReady === false && (
        <p
          className={`mx-auto mt-3 w-fit rounded-full border px-3 py-1 text-[11.5px] font-semibold ${
            isLight
              ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
              : "border-amber-400/30 bg-amber-400/10 text-amber-300"
          }`}
        >
          Pembayaran QRIS sedang disiapkan — tombol beli aktif setelahnya.
        </p>
      )}

      {items.length === 0 ? (
        <p
          className={`mt-4 rounded-2xl border px-4 py-6 text-center text-sm ${
            isLight ? "border-black/10 text-black/50" : "border-white/10 text-white/40"
          }`}
        >
          Belum ada produk. Tambahkan dari panel admin → Shop.
        </p>
      ) : (
        <div className="mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((p) => {
            const soldOut = p.stock === 0;
            return (
              <article
                key={p.id}
                className={`flex flex-col overflow-hidden rounded-2xl border ${
                  isLight ? "border-black/10 bg-white/70" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={optImg(p.image, { w: 600, h: 450, crop: "fill" })}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-2xl font-black opacity-40"
                      style={{ background: "linear-gradient(135deg,#1a1a24,#0b0b12)" }}
                      aria-hidden
                    >
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {p.badge && (
                    <span className="absolute left-2 top-2 rounded-full border border-white/20 bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                      {p.badge}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-[15px] font-bold leading-tight">{p.name}</h3>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-[12.5px] opacity-70">{p.description}</p>
                  )}
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-[15px] font-extrabold">{rupiah(p.price)}</span>
                    {p.originalPrice > p.price && (
                      <span className="text-[11.5px] line-through opacity-40">
                        {rupiah(p.originalPrice)}
                      </span>
                    )}
                  </div>
                  {p.stock >= 0 && (
                    <span className="mt-1 text-[11px] opacity-50">
                      {soldOut ? "Stok habis" : `Stok ${p.stock}`}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={soldOut || !payReady}
                    onClick={() => {
                      setActive(p);
                      setOrder(null);
                      setStatus("");
                      setError("");
                    }}
                    className="mt-3 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: "#8b5cf6" }}
                  >
                    {soldOut ? "Stok Habis" : payReady ? "Beli Sekarang" : "Segera Aktif"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Pesan ${active.name}`}
          onClick={close}
        >
          <div
            className={`w-full max-w-sm rounded-t-2xl p-5 sm:rounded-2xl ${
              isLight ? "bg-white text-zinc-900" : "bg-[#12121a] text-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {!order ? (
              <>
                <h2 className="text-base font-bold">Pesan {active.name}</h2>
                <p className="mt-1 text-[12.5px] opacity-60">
                  {rupiah(active.price)} × {qty} = <b>{rupiah(active.price * qty)}</b>
                </p>

                <label className="mt-4 block text-[12px] font-semibold opacity-70">Jumlah</label>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg border border-current/20"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg border border-current/20"
                    onClick={() =>
                      setQty((q) =>
                        Math.min(active.stock > 0 ? active.stock : 20, Math.min(20, q + 1))
                      )
                    }
                  >
                    +
                  </button>
                </div>

                <label className="mt-4 block text-[12px] font-semibold opacity-70" htmlFor="buyer">
                  Nama
                </label>
                <input
                  id="buyer"
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-current/15 bg-transparent px-3 py-2 text-sm outline-none"
                  placeholder="Nama kamu"
                />

                <label className="mt-3 block text-[12px] font-semibold opacity-70" htmlFor="contact">
                  WhatsApp / Email
                </label>
                <input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-current/15 bg-transparent px-3 py-2 text-sm outline-none"
                  placeholder="08xx atau email"
                />

                <label className="mt-3 block text-[12px] font-semibold opacity-70" htmlFor="note">
                  Catatan (opsional)
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-current/15 bg-transparent px-3 py-2 text-sm outline-none"
                  placeholder="Detail pesanan / akun tujuan"
                />

                {error && <p className="mt-3 text-[12px] font-medium text-red-400">{error}</p>}

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="flex-1 rounded-lg border border-current/20 px-3 py-2 text-[12.5px] font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={submit}
                    className="flex-1 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60"
                    style={{ background: "#8b5cf6" }}
                  >
                    {busy ? "Memproses…" : "Bayar QRIS"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-base font-bold">Pesanan dibuat #{order.orderId}</h2>
                <p className="mt-1 text-[12.5px] opacity-70">
                  {order.product?.name} × {order.product?.qty} — total{" "}
                  <b>{rupiah(order.total || order.amount || 0)}</b>
                </p>
                <p
                  className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    status === "completed"
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                      : status === "canceled"
                        ? "border-red-500/40 bg-red-500/15 text-red-400"
                        : "border-amber-500/40 bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {status === "completed"
                    ? "Lunas"
                    : status === "canceled"
                      ? "Dibatalkan"
                      : "Menunggu pembayaran"}
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  <a
                    href={order.payUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg px-3 py-2 text-center text-[13px] font-semibold text-white"
                    style={{ background: "#8b5cf6" }}
                  >
                    Buka halaman pembayaran
                  </a>
                  {order.qris && (
                    <details className="rounded-lg border border-current/15 px-3 py-2">
                      <summary className="cursor-pointer text-[12px] font-semibold opacity-70">
                        Salin kode QRIS
                      </summary>
                      <p className="mt-2 break-all font-mono text-[10.5px] opacity-70">{order.qris}</p>
                    </details>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg border border-current/20 px-3 py-2 text-[12.5px] font-semibold"
                  >
                    Tutup
                  </button>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed opacity-50">
                  Halaman ini mengecek status otomatis tiap 6 detik. Simpan nomor pesanan untuk
                  ditanyakan ke admin.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
