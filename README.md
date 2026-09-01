# 🔗 Bio Link — Haekal

Halaman bio-link (ala Linktree) untuk **Haekal**, dark-modern, lengkap dengan **panel admin** ber-URL rahasia.

**Live:** https://bio.haekal.web.id

Dibangun dengan **Next.js 16** + **React 19** + **TypeScript** + **Tailwind v4**, data disimpan di **Cloudflare D1**.

## ✨ Fitur

**Halaman Publik (`/`)**
- Profil: avatar, nama, handle, bio + warna aksen custom
- Ikon media sosial & quick buttons
- Daftar link rapi dengan hover effect
- Bonus: background glow gradient mengikuti warna aksen

**Panel Admin (URL rahasia)**
- **Alamat panel di-hash & tidak pernah muncul di UI** — cuma bisa diakses lewat URL yang kamu tahu
- Login dengan password (cookie httpOnly + di-hash path)
- Edit profil: nama, handle, bio, avatar, warna aksen
- Tambah / hapus / edit / **reorder** link
- **Toggle aktif/nonaktif** link — yang off otomatis hilang dari halaman publik
- 15+ pilihan ikon sosial media

## 🔐 Keamanan Panel Admin

- Path admin di-hash: `https://domain-mu/<ADMIN_SECRET_PATH>` (lihat `.env.example`)
- Path admin TIDAK ditautkan / ditampilkan dimana pun di halaman publik
- Setiap path random (termasuk `/admin`) otomatis `404`, bukan login UI
- Login di-lindungi password (`ADMIN_PASSWORD`)

## 🚀 Mulai Lokal

```bash
npm install
npm run dev
# halaman publik: http://localhost:3000
# panel admin   : http://localhost:3000/<ADMIN_SECRET_PATH>
```

> Tanpa env D1, data otomatis disimpan ke file lokal `data/store.json` (untuk dev).

## ☁️ Deploy ke Vercel (sudah ter-setup)

Project Vercel `bio-link` + custom domain `bio.haekal.web.id` (via Cloudflare DNS) sudah terpasang.

**Environment variables di Vercel:**
| Var | Keterangan |
|---|---|
| `ADMIN_PASSWORD` | Password masuk admin (jangan pernah di-commit) |
| `ADMIN_SECRET_PATH` | Path hashed untuk panel admin |
| `CLOUDFLARE_ACCOUNT_ID` | ID akun Cloudflare |
| `CLOUDFLARE_D1_DATABASE_ID` | ID database D1 |
| `CLOUDFLARE_API_TOKEN` | API token Cloudflare (izin D1) |

### Setup D1 (jika bikin ulang)
```bash
# buat database
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"bio-link"}'
# buat tabel
curl -X POST ".../d1/database/$DB_ID/query" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"sql":"CREATE TABLE IF NOT EXISTS store (id INTEGER PRIMARY KEY, data TEXT NOT NULL);"}'
```

Tombol deploy: biso pakai `vercel --prod` atau hubungkan repo ke Vercel. Setelah push ke GitHub, jalankan `npx vercel deploy --prod`.

## 📁 Struktur

```
src/
├── app/
│   ├── page.tsx                 # halaman publik bio-link
│   ├── [adminSecret]/page.tsx   # panel admin (path hashed → 404 utk path lain)
│   └── api/
│       ├── data/route.ts        # data publik (hanya link aktif)
│       ├── auth/                # login/logout/session
│       └── admin/               # CRUD link & profil (auth protected)
├── components/
│   ├── BioPage.tsx
│   ├── AdminPanel.tsx
│   └── Icons.tsx
└── lib/
    ├── data.ts                  # storage (Cloudflare D1 / file fallback)
    └── auth.ts                  # session + secret path
```

## 🛠️ Tech Stack
- Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · TypeScript
- Cloudflare D1 (REST API) untuk penyimpanan
- Session cookie auth (httpOnly) + path admin hashed
- Deploy: Vercel · DNS: Cloudflare
