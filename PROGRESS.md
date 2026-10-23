# PROGRESS LOG - Template XyVerse

> Copy file ini jadi PROGRESS.md di setiap repo. Wajib diupdate tiap kerja.

## Format Wajib

### YYYY-MM-DD - Judul Task
**Status:** Done / In Progress / Blocked
**Dikerjain oleh:** AI Agent + xykalnotkel

**Yang dikerjain:**
- ...

**File yang diubah:**
- `path/file.ts` -> alasan: ...
- `path/file2.dart` -> alasan: ...

**Kendala & Solusi:**
- ...

**Build & Release:**
- Workflow: ...
- Link download: ...

**Next Step:**
- ...

---

### 2026-10-23 - Tab Project & Shop + Checkout Pakasir + SEO lengkap
**Status:** Done (kecuali kredensial Pakasir produksi — lihat Next Step)

**Yang dikerjain:**
- Halaman terpisah `/project` dan `/shop` dengan pill tab Bio/Project/Shop (tab otomatis disembunyikan kalau dimatikan di panel).
- Kartu project rich: cover 16:9, judul, deskripsi, badge status, chip tech stack, tombol Demo + Repo. Grid 2 kolom desktop / 1 kolom HP.
- Shop: cart-less checkout langsung dari bio/shop. Order dibuat di server (harga & total dihitung dari store, bukan dari client), lalu QRIS via Pakasir, status di-polling tiap 6 detik.
- Tabel D1 `shop_orders` auto-create (idempoten), rate limit 8 order / 10 menit per IP, endpoint cek status re-verify ke API Pakasir (bukan percaya client/webhook mentah).
- Panel admin: menu **Project** dan **Shop** — CRUD penuh (tambah/edit/hapus/urutkan), upload cover ke Cloudinary folder `bio-link/project` & `bio-link/shop`, toggle tab publik, pengaturan shop (aktif, judul, catatan).
- SEO: `robots.txt`, `sitemap.xml` dinamis (hanya mendaftar /project & /shop kalau tab aktif), `manifest.webmanifest` PWA, JSON-LD `Person` di beranda, `CollectionPage`+`SoftwareApplication` di /project, `Product` di /shop, canonical + OG per halaman. `/admin` dan `/api` di-disallow.

**File yang diubah/dibuat:**
- `src/lib/data.ts` -> tipe `ProjectItem`, `ProductItem`, `ShopConfig`, `NavTabs` + seed 7 project + normalisasi & batas panjang/URL.
- `src/lib/pakasir.ts` -> klien Pakasir (create transaksi, detail, URL bayar).
- `src/app/api/shop/order/route.ts`, `src/app/api/shop/status/route.ts`.
- `src/app/api/data/route.ts`, `src/app/api/admin/settings/route.ts` -> expose & terima `projects`/`products`/`shop`/`tabs`.
- `src/app/api/upload/route.ts`, `src/app/api/upload/sign/route.ts` -> whitelist folder project & shop.
- `src/components/TabNav.tsx`, `ProjectGrid.tsx`, `ShopGrid.tsx` (baru), `BioPage.tsx` (prop `view`).
- `src/app/project/page.tsx`, `src/app/shop/page.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/manifest.ts`, `src/app/page.tsx` (JSON-LD Person).
- `src/app/admin/AdminPanel.tsx` -> nav Project & Shop, state, helper CRUD, `SwitchRow`.

**Kendala & Solusi:**
- Panel butuh upload cover -> folder Cloudinary baru harus masuk whitelist di dua route (`upload` dan `upload/sign`), kalau tidak upload dibalas 400.
- Simpan project/produk pakai PATCH settings yang sudah ada (bukan route CRUD baru) supaya urutan & atomisitas terjaga dalam satu JSON store.
- Kredensial Pakasir yang beredar di repo publik bukan milik Haekal -> **tidak dipakai**, wajib bikin project Pakasir sendiri.

**Build & Release:**
- `npm run build` + `npx opennextjs-cloudflare build` bersih; `tsc --noEmit` & `eslint src` tanpa error/warning.
- Uji lokal `wrangler dev`: `/`, `/project`, `/shop`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` = 200; PATCH settings via login admin mengaktifkan tab shop dan sitemap ikut menambah `/shop`; order tanpa kredensial dibalas 503 dengan pesan jelas.

**Update (keputusan pemilik):**
- Cover project otomatis diisi kartu OG GitHub (`https://opengraph.githubassets.com/1/xykal/<repo>`) untuk 7 project seed — bisa diganti kapan saja dari panel.
- Tab Shop dinyalakan walau kredensial Pakasir belum ada; UI jujur: tombol beli berubah jadi "Segera Aktif" + badge "Pembayaran QRIS sedang disiapkan" (`shop.payReady` dikirim dari server, bukan disimpan di DB).
- Panel admin Shop menampilkan status kredensial Pakasir (terpasang / belum).

**Next Step:**
- Set Worker secret `PAKASIR_PROJECT` dan `PAKASIR_API_KEY` (`npx wrangler secret put ...`) lalu uji `POST https://app.pakasir.com/api/paymentsimulation`.
- Isi produk asli + cover project dari panel admin, lalu submit sitemap ke Google Search Console.
- Rotasi password admin produksi kalau mau (sekarang `bio-haekal-d1a97aba`).

---

### 2026-10-23 - Migrasi hosting Vercel -> Cloudflare Workers (OpenNext)
**Status:** Done — live di https://bio.haekal.web.id (Cloudflare Workers, versi a42ef5c5)
**Dikerjain oleh:** AI Agent + xykal

**Yang dikerjain:**
- Produksi di Vercel mati (`402 DEPLOYMENT_DISABLED`), jadi hosting dipindah ke Cloudflare Workers pakai adapter resmi `@opennextjs/cloudflare`.
- Runtime D1 dialihkan dari REST API ke **binding native `env.DB`** (query di dalam jaringan Cloudflare, tanpa API token di Worker). REST tetap jadi fallback dev/CI.
- Halaman publik dari ISR 2 menit -> **SSR edge** (`force-dynamic`), karena ISR di Cloudflare butuh R2 + DO queue (R2 akun belum aktif). Micro-cache 10 detik tetap ada.
- Cron harian pindah dari Vercel Cron ke **Cloudflare Cron Trigger** via `scheduled()` di `worker.ts`.
- Rate limit / auth sekarang membaca `cf-connecting-ip` (di Vercel pakai `x-forwarded-for`); tanpa ini semua pengunjung jatuh ke satu bucket "unknown".
- `fs`/`path` di `data.ts` & `analytics.ts` di-import dinamis supaya tidak ikut bundle workerd.
- Next.js 16.3.4 -> **16.4.2** + `eslint-config-next` 16.4.2 (syarat peer `@opennextjs/cloudflare` 1.20.12 + patch security 14 Okt 2026).

**File yang diubah:**
- `wrangler.jsonc` (baru) -> Worker `bio-link`, binding D1 `DB`, cron `15 20 * * *`, custom domain `bio.haekal.web.id`.
- `worker.ts` (baru) -> wrapper fetch + `scheduled()` untuk Cron Trigger.
- `open-next.config.ts` (baru) -> `defineCloudflareConfig({})`, tanpa incremental cache.
- `next.config.ts` -> `initOpenNextCloudflareForDev()`.
- `src/lib/d1.ts` -> binding native + fallback REST, `useD1` (const) -> `d1Available()` (lazy).
- `src/lib/data.ts`, `src/lib/analytics.ts`, `src/lib/maintenance.ts`, `src/lib/ratelimit.ts`, `src/lib/auth.ts`, `src/app/page.tsx`.
- `db/schema.sql` (baru), `public/_headers` (baru), `worker-env.d.ts` (baru), `.dev.vars.example`, `.env.example`, `package.json`, `.gitignore`.
- `.github/workflows/deploy-cloudflare.yml` (baru), `build.yml` Node 20 -> 22.
- Dihapus: `vercel.json`, `.vercelignore` (cron Vercel & ignore list Vercel tidak dipakai lagi).
- `README.md` bagian setup/deploy/storage.

**Kendala & Solusi:**
- `wrangler types` bikin typecheck seluruh app jebol (`Response.json()` jadi `unknown` karena `@cloudflare/workers-types` global) -> tidak dipakai; tipe minimal ditulis manual di `worker-env.d.ts`.
- Worker hasil generate OpenNext tidak punya `scheduled()`, Cron Trigger bakal gagal -> custom worker entry.
- Sandbox build OOM (RAM 2 GB) kalau preview dev jalan bareng `next build` -> matikan dev dulu sebelum build.
- Token API Cloudflare sempat `429 / 10502 Too many authentication failures` lalu `10000 Authentication error` setelah beberapa percobaan deploy -> deploy dijadwalkan ulang setelah cooldown.

**Build & Release:**
- `npx tsc --noEmit` lolos, `next build` lolos, `opennextjs-cloudflare build` lolos (`Worker saved in .open-next/worker.js`).
- Uji runtime `wrangler dev` (workerd + D1 lokal): `/` 200, `/api/data` 200, `/admin` 200, cron 200 (`{"ok":true,...}`), handler `scheduled()` jalan.
- **Deploy production:** Worker `bio-link` versi `a42ef5c5-9327-4f45-8d88-50bc177556f3` di **https://bio.haekal.web.id** (+ workers.dev), 6 secret terpasang, Cron Trigger `15 20 * * *`, D1 binding ke database `bio-link`.
- Custom domain: CNAME lama ke `cname.vercel-dns.com` dihapus (dicadangkan di `/home/user/rollback/bio-dns-record.json`), domain dilepas dari project Vercel `bio-link`, lalu `routes.custom_domain` di `wrangler.jsonc` dipasang lagi dan deploy sukses.
- CI: `Build` dan `Deploy Cloudflare` hijau (run `2dbae2a`).
- Smoke test production: `/` 200 (profil asli), `/admin` 200, `/api/data` 200 (data D1 asli), login 200 + cookie Secure, login salah 401, `/api/admin/stats` 200 (3.706 kunjungan), cron dengan secret 200, tanpa secret 401.

**Next Step:**
- (opsional) Aktifkan R2 kalau nanti mau ISR lagi (sekarang SSR edge, tidak butuh cache HTML).
- Pantau biaya Workers/D1 di dashboard Cloudflare selama beberapa hari pertama setelah pindah dari Vercel.
- Rotasi semua kredensial yang pernah dibagikan di chat (Resend, Cloudinary, GitHub, Cloudflare, Vercel, OneSignal, Pakasir, Grok, Tailscale).

---

### Contoh Real:

### 2026-09-22 - Fix Auth XyDesk APK
**Status:** Done

**Yang dikerjain:**
- Benerin Google OAuth yang crash di Android 14
- Ganti flow lama yang masih pake gcm_key deprecated

**File yang diubah:**
- `lib/services/auth.dart` -> ganti ke Google Identity Services + FCM v1
- `.github/workflows/build-apk.yml` -> update secret handling

**Kendala & Solusi:**
- Secret ONESIGNAL_API_KEY ketuker antara XyCloudStore vs XyDesk -> udah gue benerin pake key yang bener

**Build & Release:**
- Build via GitHub Actions run #123
- Link APK: https://github.com/xykalnotkel/xydesk/releases/tag/v2.1.0

**Next Step:**
- Test di device real, cek push notification
