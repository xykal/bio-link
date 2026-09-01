# 🔗 Bio Link

Halaman bio-link (ala Linktree) yang rapi, dark-modern, lengkap dengan **panel admin** untuk mengelola profil dan link kamu tanpa ribet.

Dibangun dengan **Next.js 16** + **React 19** + **TypeScript** + **Tailwind CSS v4**.

## ✨ Fitur

**Halaman Publik (`/`)**
- Profil: avatar, nama, handle, bio
- Warna aksen bisa diubah (gradient ring & tombol mengikuti warna)
- Ikon media sosial & quick buttons
- Daftar link rapi dengan hover effect

**Panel Admin (`/admin`)**
- Login dengan password (cookie httpOnly session)
- Edit profil: nama, handle, bio, avatar URL, warna aksen
- Tambah / hapus link
- Update link inline
- **Reorder** urutan link (naik/turun) — bisa disimpan di `/admin/links/reorder`
- **Toggle aktif/nonaktif** link (yang nonaktif otomatis hilang dari halaman publik)
- 15+ pilihan ikon sosial media

## 🚀 Mulai Cepat

```bash
npm install
npm run dev
```

Buka **http://localhost:3000** untuk halaman publik dan **http://localhost:3000/admin** untuk panel admin.

> Default password admin: `admin123` (ubah lewat env `ADMIN_PASSWORD` sebelum produksi)

## 🔑 Setup Password

Buat file `.env.local`:

```bash
cp .env.example .env.local
# lalu ubah ADMIN_PASSWORD
```

## 🗄️ Penyimpanan Data

Data disimpan di file `data/store.json` (filesystem). Di development/lokal ini langsung ter-write. **Untuk produksi di Vercel**, lihat catatan di bawah — karena filesystem tidak persisten di serverless, kamu perlu pindah ke database (mis. Postgres/Supabase) atau storage lain.

## 📦 Script

| Command | Fungsi |
|---|---|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build untuk produksi |
| `npm run start` | Jalankan hasil build |
| `npm run lint` | Lint dengan ESLint |

## ☁️ Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Import repo di [vercel.com](https://vercel.com) → create New Project.
3. Tambahkan environment variable `ADMIN_PASSWORD`.
4. Deploy. 🎉

> ⚠️ **Catatan penting Vercel:** karena data memakai file sistem (`data/store.json`), perubahan admin tidak persisten pada fungsi serverless yang stateless. Untuk pemakaian nyata di Vercel, ganti `src/lib/data.ts` agar membaca/menulis ke PostgreSQL (mis. Supabase) atau Vercel KV/Blob. Bagian frontend & API sudah siap — tinggal swap layer datanya.

## 📁 Struktur

```
src/
├── app/
│   ├── page.tsx              # halaman publik bio-link
│   ├── admin/page.tsx        # panel admin
│   └── api/
│       ├── data/route.ts     # data publik (hanya link aktif)
│       ├── auth/             # login/logout/session
│       └── admin/            # CRUD link & profil (auth protected)
├── components/
│   ├── BioPage.tsx           # UI halaman publik
│   ├── AdminPanel.tsx        # UI panel admin
│   └── Icons.tsx             # ikon SVG sosial media
└── lib/
    ├── data.ts               # layer penyimpanan (filesystem)
    └── auth.ts               # autentikasi session cookie
```

## 🛠️ Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4
- TypeScript
- Session cookie auth (httpOnly)
