# 🔗 Bio Link — Haekal

Halaman bio-link (ala Linktree) untuk **Haekal**, dark/light modern, dengan **panel admin lengkap** di `/admin`.

**Live:** https://bio.haekal.web.id · Repo: `xykalnotkel/bio-link`

Dibangun dengan **Next.js 16** + **React 19** + **TypeScript** + **Tailwind v4**.
Penyimpanan: **Cloudflare D1**. Upload image: **Cloudinary**.

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
- Login **PIN angka (keypad)** — password default `0099`
- Kelola profil: nama, handle, bio, **avatar upload (tanpa URL)**, banner, warna aksen
- Kelola semua **sosial media**
- Kelola **link** (CRUD + reorder + toggle + tipe + gate)
- Atur **SEO / OpenGraph**: judul, deskripsi, **favicon upload**, **OG banner upload**, URL rules
- Atur **gaya font** masing-masing teks
- Atur **theme** (Dark/Light) & **branding** footer

## 🔐 Login Admin
- Buka `https://domain-mu/admin`
- Masukkan PIN (default `0099` — ubah lewat env `ADMIN_PASSWORD`)
- Input hanya angka, ala PIN/keypad → aman dari tebakan

## 🔒 Keamanan sesi admin
- Cookie sesi **ditandatangani HMAC** (`SESSION_SECRET`) + masa berlaku 7 hari — tidak bisa dipalsukan hanya dengan tahu nama cookie.
- Perbandingan PIN **constant-time**, login di-rate-limit (10 percobaan / 10 menit / IP).
- `/api/upload` wajib sesi admin, folder Cloudinary di-whitelist, gambar maks 4 MB.
- Gate grup/saluran memakai widget resmi `gate.js` dari `rules.xyc.my.id` (Shadow DOM, wajib scroll & setuju). Modal lokal hanya fallback bila widget gagal dimuat — tidak pakai iframe karena origin rules mengirim `X-Frame-Options: SAMEORIGIN`.

## 📦 Setup

```bash
npm install
npm run dev
```

### Environment variables
| Var | Keterangan |
|---|---|
| `ADMIN_PASSWORD` | PIN admin (default `0099` — **ganti!** ) |
| `SESSION_SECRET` | Rahasia tanda tangan cookie sesi (opsional, sangat disarankan) |
| `CLOUDFLARE_ACCOUNT_ID` | ID akun Cloudflare |
| `CLOUDFLARE_D1_DATABASE_ID` | ID database D1 |
| `CLOUDFLARE_API_TOKEN` | API token Cloudflare (izin D1) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

> Tanpa env D1 → otomatis pakai file lokal `data/store.json` (untuk dev).
> Tanpa env Cloudinary → tombol upload nonaktif, tapi URL manual tetap bisa.

## ☁️ Deploy
- Vercel project `bio-link` + custom domain `bio.haekal.web.id` (DNS Cloudflare) sudah terpasang.
- Deploy: `npx vercel --prod` atau connect repo ke Vercel.

## 🗄️ Storage: Cloudflare D1
Tabel `store(id INTEGER PRIMARY KEY, data TEXT NOT NULL)`. Seluruh JSON disimpan sebagai satu row (`id` = 1). Diakses via **REST API** (berfungsi dari runtime serverless mana pun).

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
│   ├── AdminPanel.tsx           # dashboard admin (PIN, settings)
│   ├── FontLoader.tsx           # injeksi Google Fonts runtime
│   └── Icons.tsx                # ikon SVG
└── lib/
    ├── data.ts                  # storage (Cloudflare D1 / file fallback)
    ├── auth.ts                  # PIN auth + session cookie
    └── fonts.ts                 # curated font set + google fonts builder
```
