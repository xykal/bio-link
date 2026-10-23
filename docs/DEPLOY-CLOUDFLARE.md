# Deploy Cloudflare Workers — checklist

Migrasi dari Vercel ke **Cloudflare Workers** (adapter `@opennextjs/cloudflare` 1.20.12, Next.js 16.4.2).

## Status saat ini

| Item | Status |
|---|---|
| Kode + konfigurasi Worker | ✅ selesai, typecheck/build/lint hijau |
| Uji runtime `wrangler dev` (workerd + D1 lokal) | ✅ `/`, `/api/data`, `/admin`, cron 200 |
| CI `Build` (typecheck, lint, build, Playwright e2e) | ✅ hijau |
| CI `Deploy Cloudflare` | ❌ gagal di step wrangler — **API token Cloudflare tidak valid** |
| Worker live di akun Cloudflare | ⏳ belum (menunggu token) |
| Custom domain `bio.haekal.web.id` | ⏳ belum (menunggu token / dashboard) |

Produksi lama di Vercel sedang mati: `https://bio.haekal.web.id` membalas **402 DEPLOYMENT_DISABLED**.

## 1. Buat API token Cloudflare baru

Dashboard → **My Profile → API Tokens → Create Token**, lalu pilih permission berikut
(Custom token, bukan template):

| Scope | Permission |
|---|---|
| Account → Workers Scripts | **Edit** |
| Account → D1 | **Edit** |
| Account → Workers R2 Storage | Read (opsional, hanya kalau nanti pakai ISR/R2) |
| Zone → Workers Routes | **Edit** |
| Zone → DNS | **Edit** (untuk custom domain `bio.haekal.web.id`) |
| Account → Account Settings | Read |

Batasi Zone Resources ke `haekal.web.id` saja, dan Account Resources ke akun
`a678fee6e0a026ccd2fd978cdf07806a`.

Simpan token:
- lokal: `export CLOUDFLARE_API_TOKEN=...`
- GitHub: `Settings → Secrets and variables → Actions` → update `CLOUDFLARE_API_TOKEN`

## 2. Set Worker secret (sekali saja)

Nilai siap pakai ada di `/home/user/secrets.json` (di luar repo, jangan di-commit):

```bash
cd /home/user/repo
npx wrangler secret bulk /home/user/secrets.json
# ADMIN_PASSWORD, SESSION_SECRET, CRON_SECRET, CLOUDINARY_CLOUD_NAME,
# CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
```

## 3. Deploy

```bash
npm run deploy      # opennextjs-cloudflare build + deploy
```

Atau push ke `main` → workflow **Deploy Cloudflare** jalan otomatis.

Yang ikut terpasang dari `wrangler.jsonc`:
- Worker `bio-link`, `main: ./worker.ts` (fetch + `scheduled()`)
- binding D1 `DB` → database `bio-link` (`7ba20cf2-1b91-40f2-94c2-a69d5e249143`, data lama tetap dipakai)
- Cron Trigger `15 20 * * *` (03:15 WIB) → `GET /api/cron/maintenance`
- custom domain `bio.haekal.web.id`

## 4. Kalau custom domain gagal (token tanpa izin DNS/Workers Routes)

Dashboard → **Workers & Pages → bio-link → Settings → Domains & Routes → Add custom domain** →
`bio.haekal.web.id`. Cloudflare akan membuat record DNS-nya sendiri, tapi record
lama (CNAME ke `cname.vercel-dns.com`) harus dihapus dulu:

```bash
# cek dulu, catat nilainya buat rollback
dig +short bio.haekal.web.id CNAME
```

Di sisi Vercel: **Project → Settings → Domains → hapus `bio.haekal.web.id`** supaya
tidak rebutan (boleh setelah Cloudflare hijau).

## 5. Verifikasi setelah live

```bash
curl -sI https://bio.haekal.web.id | grep -i "x-opennext\|server"   # harus ada x-opennext
curl -s  https://bio.haekal.web.id/api/data | head -c 200           # JSON profil
curl -s -o /dev/null -w "%{http_code}\n" https://bio.haekal.web.id/admin
curl -s -H "Authorization: Bearer $CRON_SECRET" https://bio.haekal.web.id/api/cron/maintenance
```

Cek juga:
- Login `/admin` pakai `ADMIN_PASSWORD` dari `secrets.json` (cookie ber-flag `Secure` di HTTPS).
- Simpan satu perubahan di panel → refresh halaman publik → perubahan langsung tampil (SSR, tidak ada cache 2 menit lagi).
- Workers → bio-link → **Logs** (observability sudah aktif) untuk melihat eksekusi cron.

## Catatan teknis

- **D1** diakses lewat binding native `env.DB`; env `CLOUDFLARE_*` (REST) hanya fallback dev/CI, jadi token API tidak perlu ditanam di Worker.
- **Tidak ada R2/ISR**: halaman publik `force-dynamic` (SSR di edge). Kalau nanti mau ISR lagi: aktifkan R2 → tambah binding `NEXT_INC_CACHE_R2_BUCKET` + `doQueue` + `D1NextModeTagCache` di `wrangler.jsonc`, lalu set `revalidate` di `src/app/page.tsx`.
- **Cron** dipanggil dari `scheduled()` di `worker.ts` karena Worker hasil generate OpenNext hanya mengekspor `fetch`.
- **Rate limit/login** memakai `cf-connecting-ip` (Cloudflare mengisi header ini; `x-forwarded-for` bisa dipalsukan klien).
- Rollback: `npx wrangler rollback` (Worker) atau pasang balik domain ke Vercel kalau benar-benar perlu.
