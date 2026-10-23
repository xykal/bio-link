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

### 2026-10-23 (lanjutan 3) - SEO siap indeks + kata kunci + PIN admin
**Status:** Done

**Yang dikerjain:**
- **Kata kunci pencarian bisa diatur dari panel**: `SeoConfig.keywords` (maks 30, tiap 40 karakter) dipakai
  untuk `<meta name="keywords">` di `/`, `/project`, `/shop` dan untuk `knowsAbout` di JSON-LD Person —
  sinyal topik yang dibaca Google (meta keywords sendiri praktis diabaikan Google, tapi Bing/Yandex masih pakai).
- **Verifikasi Search Console tanpa sentuh kode**: field `googleVerification` -> otomatis jadi
  `<meta name="google-site-verification">`. Jadi cukup tempel nilai dari GSC di panel.
- **Canonical beranda** ditambahkan (`https://bio.haekal.web.id`) — sebelumnya hanya /project & /shop.
- **BreadcrumbList** di /project (Bio -> Project) supaya hasil pencarian menampilkan jejak navigasi.
- **JSON-LD Person** sekarang menyertakan `mainEntityOfPage` (WebSite + `inLanguage: id-ID`).
- Panel SEO dapat catatan sitemap/robots + pengingat submit ke Search Console.
- **Login admin diperkuat** karena PIN jadi pendek (`0099`): limiter per-IP 10x/10 menit tetap ada, ditambah
  **limiter global 60x/15 menit lintas IP** dan jeda 350 ms tiap password salah (memperlambat brute force).

**File yang diubah:**
- `src/lib/data.ts` (SeoConfig + seed + normalize), `src/app/page.tsx`, `src/app/project/page.tsx`,
  `src/app/shop/page.tsx`, `src/app/admin/AdminPanel.tsx`, `src/app/api/auth/login/route.ts`.

**Next Step:**
- Set Worker secret `ADMIN_PASSWORD=0099` (dilakukan di sesi ini) — kalau nanti mau lebih aman, ganti ke PIN 6 digit.
- Submit `https://bio.haekal.web.id/sitemap.xml` di Google Search Console (butuh akun Google pemilik domain).

---

### 2026-10-23 (lanjutan 2) - Bersih-bersih emoji & optimasi performa
**Status:** Done

**Keluhan pemilik:** "masih pakai emoji" + "web berat/lag".

**Emoji dihapus (diganti SVG inline, tanpa dependensi baru):**
- Tombol mute kartu donasi: 🔔/🔇 -> ikon speaker (stroke).
- Badge "★ Unggulan" di kartu project -> ikon bintang path.

**Optimasi performa (terukur, bukan tebakan):**
- **Cover project sekarang lokal**: 7 cover di-`public/covers/*.webp` (11-17 KB/WebP, total 116 KB) hasil render kartu OG GitHub yang di-cache. Sebelumnya tiap scroll memanggil `opengraph.githubassets.com` (≈130 KB PNG per gambar, bisa rate-limit 429 -> gambar gagal/hilang). Efek samping: bug "cover ada yang tidak muncul" ikut beres.
- **Fallback gambar diperbaiki**: `onError` sekarang benar-benar pindah kandidat (dulu memakai `attempt = a + 1` tanpa batas sehingga bisa menunjuk `undefined`). Rantai: cover lokal -> `github.com/<repo>.png` -> gradient + inisial.
- **Font Google dipangkas**: Inter & Space Grotesk sekarang **variable font** (`wght@400..700`, 1 file per family) — sebelumnya 4 file weight per family. Total request font turun dari ~11 menjadi ~5.
- **`backdrop-filter` dikurangi**: kartu project, tab nav, badge, dan kartu donasi tidak lagi pakai `backdrop-blur` (filter ini memaksa repaint besar tiap scroll). Sisa blur hanya di overlay modal/story.
- **Bayangan koin dibakar ke aset**: `filter: drop-shadow()` pada elemen yang dianimasikan (transform) memaksa raster ulang tiap frame — sekarang bayangan sudah menempel di WebP, CSS cukup `will-change: transform`.
- **Polling auto-refresh jadi gratis**: `/api/data` mengirim `ETag` (hash FNV-1a) dan membalas **304 tanpa body** kalau isi belum berubah. Klien mengirim `If-None-Match`. Terukur: 200 = 7,6 KB (brotli) -> 304 = **0 byte**.
- **Animasi berhenti saat tab disembunyikan** (`.anim-paused`), supaya morph blob & hue-rotate frame profil tidak terus memakan CPU/baterai di background.
- **Header cache aset**: `public/_headers` menambah aturan `/covers/*`, `/donation-coin.webp`, `/donation-coins.webp` -> `max-age=604800, stale-while-revalidate`.

**Angka terukur di produksi (curl, brotli):**
- TTFB beranda ≈ **0,45-0,67 s**; HTML beranda ≈ **16 KB** terkompresi (76 KB mentah).
- JS awal ≈ **200 KB** terkompresi (React 19 + Next 16 runtime, dominan framework — bukan kode app).
- `/api/data`: 7,6 KB -> **0 B** dengan ETag.

**Next Step (kalau masih terasa berat):**
- Kalau mau lebih ringan lagi: pecah `BioPage` jadi island server + komponen kecil, atau matikan efek morph/hue-rotate secara default di HP kelas bawah.

---

### 2026-10-23 (lanjutan) - Cover project anti-gagal, auto-refresh, kartu donasi 3D
**Status:** Done

**Yang dikerjain:**
- **Cover project tidak ada yang gagal muat lagi**: `ProjectCover` mencoba berlapis — (1) gambar dari panel admin, (2) kartu OG GitHub `/1/<owner>/<repo>`, (3) `github.com/<repo>.png`, (4) gradient + inisial. Tiap gambar gagal → `onError` pindah ke kandidat berikutnya. URL repo diambil langsung dari `repoUrl`, jadi kalau link repo diganti di panel, cover ikut pindah otomatis (tidak ada gambar yatim). Cover komponen di-`key` dengan `id|image|repoUrl` sehingga attempt reset saat data berubah.
- **Auto-update tanpa reload**: BioPage polling `/api/data` tiap 20 detik (hanya saat tab terlihat) + refetch saat tab kembali fokus / `online`. Jadi begitu admin menyimpan link, project, produk, atau donasi, halaman yang sedang dibuka ikut berubah.
- **Kartu donasi baru** (`src/components/DonationBanner.tsx`): banner besar di bawah link, gradien emas→ungu, CTA "Dukung Sekarang", progress bar opsional (target & terkumpul diisi dari panel), plus badge status. Elemen 3D (tumpukan koin + koin tunggal) **melayang di luar kartu** dengan animasi float, twinkle, dan pop saat diklik. Ada **efek suara koin** dibuat pakai WebAudio (3 "tink" segitiga, tanpa file audio) + tombol mute. Menghormati `prefers-reduced-motion`.
- Aset koin 3D dibuat lewat image-gen lalu dibersihkan manual (background dibuang, crop, WebP): `public/donation-coins.webp` (95 KB) & `public/donation-coin.webp` (8 KB).
- Data: `DonationConfig` di `src/lib/data.ts` + `normalize()` (URL wajib lolos `isAllowedLinkUrl`), PATCH `/api/admin/settings` menerima `donation`, `/api/data` meneruskannya, panel admin dapat section **Kartu Donasi** (aktif, judul, subjudul, link, label tombol, keterangan, target, terkumpul, suara).
- Animasi dipindah dari `styled-jsx` ke `<style>` biasa supaya ikut ter-render di server (styled-jsx hanya inject saat hydration → kartu sempat diam).

**File yang diubah/dibuat:**
- `src/components/DonationBanner.tsx` (baru), `src/components/ProjectGrid.tsx`, `src/components/BioPage.tsx`
- `src/lib/data.ts`, `src/app/api/data/route.ts`, `src/app/api/admin/settings/route.ts`, `src/app/admin/AdminPanel.tsx`
- `public/donation-coins.webp`, `public/donation-coin.webp` (baru)

**Kendala & Solusi:**
- Gambar hasil generate punya background kotak-kotak/green-screen → dihapus semi-otomatis (numpy + scipy: ambang warna, despill, hapus komponen kecil, crop, WebP).
- `npm run build` sempat `exit 137` (OOM) karena proses `wrangler dev` masih hidup — matikan dulu sebelum build.
- Kartu donasi butuh ruang untuk elemen melayang → wrapper diberi `mt-14` dan offset negatif dijaga agar tidak menutupi link di atasnya.

**Build & Release:**
- `tsc --noEmit` + `eslint src` bersih; `npm run build` & `opennextjs-cloudflare build` sukses.
- Uji `wrangler dev`: `/`, `/project`, `/shop`, kedua aset WebP = 200; HTML SSR sudah memuat animasi (`donFloatA`) dan gambar.

**Update layout (revisi pemilik):** kartu dibuat lebih besar (padding 24px, judul 20–23px), dan elemen 3D
dipindah **benar-benar di luar kartu** — tumpukan koin di atas-kiri (dalam ruang kosong `pt`), koin tunggal
di bawah-kanan; tidak ada teks yang tertutup. Padding kartu 26px→28px diubah jadi `pt-[78px]`/`sm:pt-[100px]`
pada wrapper supaya koin punya tempat sendiri.

**Status produksi:** kartu donasi sudah **aktif** di https://bio.haekal.web.id dengan link `https://saweria.co/kallsptra`
(target 0 = progress bar disembunyikan).

**Next Step:**
- Isi target/terkumpul donasi dari panel (Shop → Kartu Donasi) kalau mau progress bar-nya tampil.
- Ganti link donasi kalau bukan Saweria `saweria.co/kallsptra`.

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
