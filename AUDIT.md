# Audit Bio Link — XyDev (2026-09-02)

Base: `main` @ `17440f1` · Branch: `xydev/biolink-hardening` · Semua klaim diverifikasi
langsung terhadap **production** (`bio.haekal.web.id`) dan runtime lokal (`next build` + `next start`).

## A. Temuan kritis (terbukti di production, sudah difix)

| # | Temuan | Bukti production | Fix |
|---|--------|------------------|-----|
| 1 | **Sesi admin bisa dipalsukan tanpa PIN.** Cookie sesi bernilai konstan `authenticated`; nama+nilai terlihat di repo publik. | `curl -H 'Cookie: bio_admin_session=authenticated' /api/admin` → **200 + seluruh store** | Cookie kini **HMAC-signed** (`SESSION_SECRET`) + exp 7 hari; PIN dibandingkan constant-time; login rate-limit 10/10 menit/IP. Tes lokal: forge → 401, cookie sah → 200, cookie dipotong tanda tangan → 401, brute force → 429. |
| 2 | **PIN default `0099` masih aktif di production.** | `POST /api/auth/login {"password":"0099"}` → `{"ok":true}` | Rate-limit + signed session memitigasi; **owner wajib ganti `ADMIN_PASSWORD` di env Vercel** (tidak bisa diubah dari kode). |
| 3 | **`/api/upload` terbuka tanpa login.** `isAuthenticated()` dipanggil tanpa `await` → Promise truthy → cek auth tidak pernah menolak. | POST tanpa cookie lolos auth dan sampai ke Cloudinary (ditolak hanya karena file uji tidak valid: `Invalid image file`) | `await isAuthenticated()`, whitelist folder (`bio-link/{avatar,banner,favicon,og}`), maks 4 MB, wajib `image/*`. |

## B. Gate integrasi yang rusak (inti permintaan user)

1. **Iframe diblokir XFO.** Modal gate meng-embed `rulesUrl` (= `https://rules.xyc.my.id/docs`
   di store live) lewat `<iframe>`, padahal origin rules mengirim
   `X-Frame-Options: SAMEORIGIN` (dicek via curl). Browser menolak render →
   aturan **tidak pernah terlihat**; pengunjung cuma melihat kotak kosong.
2. **Konten salah.** `/docs` adalah dokumentasi API, bukan halaman kebijakan (`/`).
3. **Tanpa penegakan.** Tombol "Join Grup" aktif langsung — tidak ada kewajiban baca/setuju.

**Fix:** link ber-gate kini memanggil widget resmi `XycGate.open(url, "_blank")` dari
`<origin-rules>/gate.js` (dimuat dinamis): kebijakan asli ditarik lewat API (CORS terbuka),
dirender di Shadow DOM, wajib scroll ke bawah + Setuju, persetujuan diingat 30 hari.
Modal lama dipertahankan hanya sebagai **fallback** bila widget gagal dimuat, **tanpa iframe**.

Kompatibel dengan gate.js versi lama (production) maupun versi hardening
(branch `xydev/security-hardening` di xycloud-policy) — API `XycGate.open(href, target)` sama.

## C. Perbaikan lain

- `/api/data` **hilang dari repo** padahal `BioPage` fetch ke situ (live deploy berasal dari
  source di luar repo). Rute dikembalikan (public shape, `no-store`).
- Build blocker: `layout.tsx` memakai `LayoutProps<"/">` tanpa import → `tsc` gagal →
  `next build` gagal di baseline. Diganti `{ children: React.ReactNode }`.
- Lint dibersihkan 11 error → 0: `any` di AdminPanel/data.ts diketik, dead code
  (`nicknameLinks` + typo `"$spotify"`, `SvgProps`, `base`, param `ok`) dihapus,
  setState-in-effect dirapikan.
- Security headers via `next.config.ts`: `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`.
- Default `rulesUrl` → `https://rules.xyc.my.id/` (halaman aturan, bukan `/docs`).
  Store live masih menyimpan `/docs` — **admin disarankan menggantinya di panel SEO**.

## D. Verifikasi akhir (lokal, `next build` + `next start`, 12/12 PASS)

Build + typecheck + lint bersih; rute `/`, `/admin`, `/api/data` 200; header hadir;
forge cookie 401; upload tanpa auth 401; PIN salah 401; cookie sah 200;
cookie tanpa tanda tangan 401; brute-force 429.

## E. Tindakan yang WAJIB dilakukan owner saat deploy

1. Set env `ADMIN_PASSWORD` baru (jangan `0099`) dan `SESSION_SECRET` acak
   (`openssl rand -hex 32`) di Vercel bio-link.
2. Deploy branch ini → semua sesi lama (termasuk yang dipalsukan) otomatis hangus.
3. Ganti `rulesUrl` di panel admin SEO ke `https://rules.xyc.my.id/` (untuk fallback modal).
4. Merge branch `xydev/security-hardening` di xycloud-policy bila gate hardening diinginkan;
   bio-link kompatibel dengan kedua versi gate.js.
