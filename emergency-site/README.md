# Halaman darurat statis (Cloudflare Pages)

Dipakai kalau kuota harian Cloudflare Workers akun habis (free plan: 100.000
request/hari, dihitung **per akun** — bukan per Worker). Kalau kuota habis,
SEMUA Worker di akun ini membalas `429 "This website has been temporarily rate
limited"`, termasuk bio-link.

Halaman ini sengaja **statis** (0 request Worker) dan di-deploy ke Cloudflare
Pages, yang limitnya terpisah dari Workers.

- Project Pages: `bio-link-emergency`
- Isi: profil, link, daftar project (cover di-inline base64), kartu donasi
- Tidak ada JS, tidak ada fetch, tidak ada database → tetap hidup walau D1/Worker mati

## Pasang (saat kuota habis)

```bash
bash scripts/emergency-static.sh on
```

## Kembalikan ke Worker asli (setelah 00:00 UTC / kuota reset)

```bash
bash scripts/emergency-static.sh off
```

Skrip itu menghapus domain Pages + CNAME sementara, lalu men-deploy Worker
`bio-link` supaya `bio.haekal.web.id` kembali dilayani aplikasi Next.js.

## Regenerate isi halaman

Isi project diambil manual dari `src/lib/data.ts` (title, description, cover,
stack, demo/repo URL) lalu di-inline. Kalau project di panel admin berubah,
regenerate supaya halaman darurat tetap akurat.
