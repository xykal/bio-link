# 🔗 Bio Link — Haekal

Halaman bio-link (ala Linktree) untuk **Haekal**, dark/light modern, dengan **panel admin lengkap** di `/admin`.

**Live:** https://bio-link.dikanjut.workers.dev (custom domain `bio.haekal.web.id` menyusul) · Repo: `xykal/bio-link`

Dibangun dengan **Next.js 16** + **React 19** + **TypeScript** + **Tailwind v4**.
Hosting: **Cloudflare Workers** (adapter `@opennextjs/cloudflare`).
Penyimpanan: **Cloudflare D1** via **binding native**. Upload image: **Cloudinary**.

## ✨ Fitur

**Halaman Publik (`/`)**
- Profil: avatar (upload), banner, nama, handle, bio + warna aksen custom
- **Bentuk avatar**: circle, squircle, rounded, **blob morphing animasi**, hexagon, star, heart
- Theme **Dark / Light** (bisa diatur dari dashboard)
- **Logo sosial media ASLI** (brand resmi, Simple Icons - 12 platform)
- Daftar link rapi dengan badge `Join Grup` / `Link Saluran`
- **Gate popup** — men-embed & membuka **rules asli** `rules.xyc.my.id/docs` sebelum masuk link grup/saluran
- **Gaya font per elemen** (nama, handle, bio, judul link, label, branding)
- Footer branding "Made by XySpace Tch"

**Panel Admin (`/admin`)**
- Login **password/passphrase** (bukan keypad angka); default `0099` hanya untuk development lokal, tidak pernah dipakai otomatis di production
- Menu **persisten di URL** (`/admin#link`, `/admin#story`, …) — refresh/back tidak balik ke awal; mobile pakai **drawer hamburger**, desktop pakai **sidebar**
- Kelola profil: nama, handle, bio, **avatar upload (tanpa URL)**, banner, warna aksen
- Kelola semua **sosial media**
- Kelola **link** (CRUD + reorder + toggle + tipe + gate)
- Atur **SEO / OpenGraph**: judul, deskripsi, **favicon upload**, **OG banner upload**, URL rules
- Atur **gaya font** masing-masing teks
- Atur **theme** (Dark/Light) & **branding** footer
- Menu **Perawatan**: status server (ping D1, ukuran store, cache, runtime), **bersihkan cache** server/browser, rawat server (hapus story kadaluwarsa + analytics lama), dan **perawatan berkala otomatis** via Vercel Cron (03:15 WIB)

## 🔐 Login Admin
- Buka `https://domain-mu/admin` dan masukkan password/passphrase admin.
- `ADMIN_PASSWORD` wajib diatur di production. Nilai `0099` hanya fallback development lokal dan tidak dapat digunakan untuk login production.
- Gunakan passphrase unik yang panjang; ganti password melalui pengaturan environment deployment.

## 🔒 Keamanan sesi admin
- Cookie sesi **ditandatangani HMAC** (`SESSION_SECRET`) + masa berlaku 7 hari. `SESSION_SECRET` wajib ada di production; bila belum dikonfigurasi, login ditolak (fail-closed).
- Perbandingan password **constant-time**; login dibatasi 10 percobaan per 10 menit per IP.
- Mutasi admin memeriksa sesi dan origin same-site untuk mengurangi risiko CSRF.
- Rate limit cerita, klik/kunjungan publik, login, dan cron memakai D1 bersama saat tersedia; mode development memakai fallback memory yang dibatasi.
- URL link hanya mengizinkan `http`, `https`, `mailto`, `tel`, dan `sms`; protokol berbahaya seperti `javascript:` ditolak.
- `/api/upload` wajib sesi admin, folder Cloudinary di-whitelist, gambar maks 4 MB.
- Gate grup/saluran memakai widget resmi `gate.js` dari `rules.xyc.my.id` (Shadow DOM, wajib scroll & setuju). Modal lokal hanya fallback bila widget gagal dimuat — tidak pakai iframe karena origin rules mengirim `X-Frame-Options: SAMEORIGIN`.

## 🧰 Perawatan (menu baru di panel admin)

Menu **Perawatan** (`/admin#perawatan`) merawat hosting/server tanpa buka dashboard Cloudflare/Vercel:

| Blok | Isi |
|---|---|
| **Status Server** | Ping latency D1, ukuran store & analytics, kondisi cache, runtime Node, serta status SESSION_SECRET, CRON_SECRET, dan ADMIN_PASSWORD |
| **Bersihkan Cache** | Micro-cache server D1 (TTL 10 dtk, otomatis dibuang saat ada perubahan) + cache browser perangkat (identitas visitor `bio_*`) |
| **Rawat Server** | Hapus story kadaluwarsa (media Cloudinary ikut di-destroy), bersihkan analytics lama sesuai retensi, atau **rawat penuh** sekali klik |
| **Perawatan Berkala Otomatis** | Cloudflare Cron Trigger (`wrangler.jsonc`, 20:15 UTC = 03:15 WIB) menjalankan rawat penuh harian; bisa dimatikan sementara & atur retensi (7–365 hari) dari panel |
| **Riwayat Perawatan** | 30 catatan terakhir (manual/otomatis) beserta hasilnya |

Endpoint cron: `GET /api/cron/maintenance` memakai `Authorization: Bearer <CRON_SECRET>`. Di production, endpoint ditutup bila `CRON_SECRET` belum diatur; query-string secret tidak diterima. Tetap dibatasi 3 request per 10 menit.

Di Cloudflare, cron dipanggil oleh handler `scheduled()` di `worker.ts` (Worker hasil generate OpenNext hanya mengekspor `fetch`, jadi tanpa wrapper ini Cron Trigger akan error `Handler does not export a scheduled() function`).

## 📦 Setup

Butuh **Node.js 22+** (wrangler 4.x menolak Node 20).

```bash
npm ci
cp .env.example .env.local  # isi hanya layanan yang dipakai; jangan commit nilai asli
cp .dev.vars.example .dev.vars  # dipakai wrangler dev/preview (binding D1 lokal)
npm run dev
```

Preview di runtime Worker yang asli (workerd + D1 lokal):

```bash
npx wrangler d1 execute bio-link --local --file=./db/schema.sql   # sekali saja
npm run preview
```

Tes browser (server harus berjalan di port 3111; instal Chromium sekali):

```bash
npx playwright install chromium
npm run test:responsive          # 320, 360, 390, 430, 768, 1024, 1440px + tambah/edit link
npm test                         # tes manual r15: perpindahan story & voice note
```

### Environment variables
| Var | Keterangan |
|---|---|
| `ADMIN_PASSWORD` | Password/passphrase admin; wajib di production (tidak ada default production) |
| `SESSION_SECRET` | Rahasia acak untuk HMAC sesi; wajib di production (minimal 32 byte acak) |
| `CRON_SECRET` | Rahasia acak terpisah untuk otorisasi Vercel Cron; wajib di production |
| `CLOUDFLARE_ACCOUNT_ID` | ID akun Cloudflare (hanya untuk fallback REST / dev) |
| `CLOUDFLARE_D1_DATABASE_ID` | ID database D1 (hanya untuk fallback REST / dev) |
| `CLOUDFLARE_API_TOKEN` | API token Cloudflare dengan izin D1 (hanya untuk fallback REST / dev) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

> Di Cloudflare Workers, D1 diakses lewat **binding `DB`** (`wrangler.jsonc`) — tidak perlu API token di dalam Worker dan tidak ada hop HTTPS. Env `CLOUDFLARE_*` hanya dipakai sebagai fallback REST di luar Worker.
> Tanpa D1 (binding maupun env) → otomatis pakai file lokal `data/store.json` untuk development.
> Rate-limit bersama memakai tabel D1 `api_rate_limits` yang dibuat otomatis; tanpa D1, fallback hanya berlaku per instance.
> Tanpa env Cloudinary → tombol upload nonaktif, tapi URL manual tetap bisa.

## ☁️ Deploy (Cloudflare Workers)

```bash
npx tsc --noEmit && npm run lint        # gate lokal
CLOUDFLARE_API_TOKEN=xxx SECRETS_FILE=./secrets.json ./scripts/deploy-cf.sh
```

Script itu: cek token → upload secret (`ADMIN_PASSWORD`, `SESSION_SECRET`, `CRON_SECRET`, `CLOUDINARY_*`) → build OpenNext + deploy → verifikasi `/`, `/api/data`, `/admin`. Manual: `npx wrangler secret bulk secrets.json` lalu `npm run deploy`.
Langkah lengkap + troubleshooting ada di [`docs/DEPLOY-CLOUDFLARE.md`](docs/DEPLOY-CLOUDFLARE.md).

- Worker: `bio-link`, custom domain `bio.haekal.web.id`, Cron Trigger `15 20 * * *` (03:15 WIB).
- Konfigurasi ada di `wrangler.jsonc`; entry Worker di `worker.ts` (fetch + scheduled).
- Halaman publik `force-dynamic` (SSR di edge) — tidak butuh R2/ISR cache. Mau ISR? Aktifkan R2 lalu pasang `r2IncrementalCache` + `doQueue` di `open-next.config.ts`.
- CI: `.github/workflows/deploy-cloudflare.yml` deploy otomatis tiap push ke `main` (butuh repo secret `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID`).
- Login production fail-closed: `ADMIN_PASSWORD`/`SESSION_SECRET` wajib ada sebagai Worker secret.

## 🗄️ Storage: Cloudflare D1
Tabel `store(id INTEGER PRIMARY KEY, data TEXT NOT NULL)` + `api_rate_limits`. Seluruh JSON disimpan sebagai satu row (`id` = 1, analytics di `id` = 2). Skema ada di `db/schema.sql`.
Di Worker, akses lewat **binding native `env.DB`**; fallback **REST API** dipakai kalau binding tidak ada (dev Node/CI).

## 📁 Struktur
```
src/
├── app/
│   ├── page.tsx                 # halaman publik + generateMetadata (SEO/OG)
│   ├── admin/page.tsx           # panel admin
│   └── api/
│       ├── data/route.ts        # data publik (links enabled + config)
│       ├── upload/route.ts      # upload image ke Cloudinary (signed)
│       ├── auth/                # login/logout/session
│       └── admin/               # profile / links / settings CRUD
├── components/
│   ├── BioPage.tsx              # halaman publik (theme, gate, fonts, branding)
│   ├── AdminPanel.tsx           # dashboard admin (password, links/settings)
│   ├── FontLoader.tsx           # injeksi Google Fonts runtime
│   └── Icons.tsx                # ikon SVG
└── lib/
    ├── data.ts                  # storage (Cloudflare D1 / file fallback)
    ├── auth.ts                  # password auth, same-origin checks, session cookie
    └── fonts.ts                 # curated font set + google fonts builder
```
