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

## F. Follow-up implementation (2026-10-02)

The entries above describe the earlier audit snapshot. The follow-up is committed to `main` (through `d62f038`) and deployed to production at `https://bio.haekal.web.id`.

- Admin authentication now uses a password/passphrase input. Production login fails closed unless both `ADMIN_PASSWORD` and `SESSION_SECRET` are configured. Same-origin checks cover authenticated admin mutations and uploads; the cron endpoint requires a bearer secret in production and no longer accepts a query-string secret.
- D1 access now uses a shared parameterized REST helper with HTTP/API error checks and retries. Login, story interactions, cron, and public visit/click tracking use an atomic D1-backed rate limiter when D1 is configured, with a bounded in-memory fallback for local development.
- Link creation and editing share one admin form. The API validates title length and allows only `http`, `https`, `mailto`, `tel`, and `sms` URL schemes; stored link data is also normalized.
- The public tech-stack icons retain their original overlapping single-row look; the overlap tightens only as needed on narrow screens so icons stay inside the viewport. Public content top-aligns when taller than the screen. The root/body can now grow with page content instead of forcing a viewport-height background, so the page scrolls and its background continues to the bottom. Admin section headers/story controls wrap on narrow screens; dynamic viewport sizing and safe-area spacing were added for mobile.
- Added `tests/responsive-links.mjs` and `npm run test:responsive`. It checks the public page at 320, 360, 390, 430, 768, 1024, and 1440 px; every admin section at 320, 768, and 1440 px; add/edit link; unsafe URL rejection; and cross-origin mutation rejection.

Local verification completed: `npm run lint`, `npx tsc --noEmit`, `npm run build`, and the responsive/link e2e all pass. A production-mode check without auth environment variables returned 503 for login, 401 for admin access, and 401 for the cron endpoint. Vercel production was checked without reading secret values: `ADMIN_PASSWORD` and `CRON_SECRET` were already present; a new encrypted `SESSION_SECRET` was added for production, preview, and development. Live smoke checks returned 200 for `/`, `/admin`, and `/api/data`; unauthenticated `/api/admin` and cron returned 401, and cross-origin admin mutation returned 403. A Playwright smoke check confirmed public and admin-login layouts at 320, 390, 768, and 1440 px. Existing admin sessions will need to sign in again after the new session secret takes effect. After the visual corrections, production Playwright checks at 320, 390, 768, and 1280 px confirmed the stack remains a single overlapping row, fits inside its container, and the profile heading is not clipped. At 1280×585, the page scrolls to the bottom and the background layer spans the full 1082 px document height.

## G. Admin appearance, profile frames, and deeper analytics (2026-10-02)

Implemented in commit `2d75458`:

- Removed the duplicate **Sosial Media** editor from the Link tab. Social URLs already represented as ordinary link cards remain manageable in the existing Link list; stored legacy social fields were not deleted.
- Added **Tampilan & SEO → Background halaman & warna browser**. Admin can choose dark/light base colors and accent-glow strength. The active base color is exposed as the browser `theme-color` meta value and updated on the client when public data refreshes.
- Added Ponsel, Tablet, and Desktop widths to the live Admin preview (390, 768, and 1280 px).
- Added ready-to-use avatar frame presets (Morphing, Kartun, Kertas, Neon, Glass, Minimal). The decoration follows the selected profile shape, including the custom SVG shape. The chosen mode requires no external AI key or per-generation fee, per the owner's preference.
- Profile editing now supports both dragging the crop inside the avatar and dragging the whole frame around the banner/profile layout; there are no coordinate input fields.
- Link click analytics now retain up to 500 recent events with link ID/title, timestamp, referrer host, UTM source/medium/campaign, and device. The Admin shows per-link/source summaries and recent click history. Visit logs also show source/UTM/device. Full referrer URLs and IPs are not stored. Old aggregate totals are preserved; per-click source detail begins with events collected after this update.

Local verification: `npm run lint`, `npx tsc --noEmit`, `npm run build`, and the expanded responsive Playwright suite passed. The suite covered profile frame clipping at 320–1440 px, all Admin sections at 320/768/1440 px, link CRUD, CSRF/URL validation, detailed click attribution, draggable avatar placement, device-width preview, and background-to-browser-meta synchronization. Vercel deployment `https://bio-link-2cig5i6w3-xykalnotkels-projects.vercel.app` is Ready and aliased to `https://bio.haekal.web.id`; production smoke checks returned 200 and confirmed the page scrolls to the footer, the background spans the full document, and the active browser theme color is `#08080d`.
