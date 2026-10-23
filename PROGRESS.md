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

### 2026-10-23 - Migrasi hosting Vercel -> Cloudflare Workers (OpenNext)
**Status:** In Progress (kode + konfigurasi selesai, verifikasi runtime lolos; deploy menunggu API token Cloudflare pulih dari rate-limit)
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

**Next Step:**
- Deploy ke Cloudflare (`npm run deploy`) begitu token API bisa dipakai lagi; set Worker secret `ADMIN_PASSWORD`, `SESSION_SECRET`, `CRON_SECRET`, `CLOUDINARY_*`.
- Pasang custom domain `bio.haekal.web.id` di Worker + hapus domain dari project Vercel.
- Simpan `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` sebagai secret repo GitHub untuk workflow deploy.
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
