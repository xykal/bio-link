# Audit Worker akun — 23 Okt 2026

Sumber: Cloudflare GraphQL `workersInvocationsAdaptive`, 30 hari (24 Sep – 23 Okt 2026).
Kuota free plan = **100.000 request/hari per AKUN** (bukan per Worker).

## Ringkasan

| Worker | 30 hari | Hari aktif | Hari ini | Error | Terakhir | Status |
|---|---:|---:|---:|---:|---|---|
| xydesk-remote-web | 548.818 | 25 | 121.823 | 18.190 | 23 Okt | **AKAN DIHAPUS** (migrasi Firebase) |
| rdpfree-next | 149.342 | 14 | 2.664 | 556 | 23 Okt | aktif |
| xycloud-api | 60.613 | 30 | 1.289 | 2 | 23 Okt | aktif |
| xydesk-signaling | 15.203 | 30 | 23 | 9 | 23 Okt | **AKAN DIHAPUS** |
| xydesk-web | 13.949 | 30 | 87 | 0 | 23 Okt | **AKAN DIHAPUS** |
| dlaja-dash | 6.213 | 28 | 269 | 4 | 23 Okt | aktif |
| wa-release-bot-web | 5.596 | 25 | 114 | 0 | 23 Okt | aktif |
| xydl-proxy | 3.816 | 29 | 13 | 0 | 23 Okt | aktif |
| appsperms-dl | 3.580 | 29 | 157 | 0 | 23 Okt | aktif |
| dykal | 2.703 | 30 | 5 | 0 | 23 Okt | aktif (webhook push) |
| rendiv-studio | 2.544 | 21 | 0 | 0 | 22 Okt | jarang |
| nyawit-live | 2.088 | 2 | 1.399 | 2 | 23 Okt | aktif |
| xydesk-admin | 1.623 | 29 | 1 | 0 | 23 Okt | **AKAN DIHAPUS** |
| xyspace-assets-api | 1.439 | 30 | 8 | 0 | 23 Okt | aktif (CDN) |
| bio-link | 1.282 | 1 | 1.282 | 0 | 23 Okt | aktif |
| dlaja-web | 821 | 1 | 821 | 0 | 23 Okt | aktif |
| pautin-sec | 742 | 30 | 6 | 0 | 23 Okt | aktif |
| xydesk-news | 396 | 21 | 0 | 0 | 20 Okt | **AKAN DIHAPUS** |
| rilisin | 392 | 1 | 0 | 83 | 2 Okt | mati |
| tokoku | 251 | 30 | 8 | 12 | 23 Okt | aktif |
| wa-release-bot-lagu | 186 | 10 | 0 | 0 | 14 Okt | mati |
| veyra-neon-district | 176 | 3 | 0 | 27 | 20 Okt | mati |
| fluxa-share | 166 | 1 | 166 | 0 | 23 Okt | aktif |
| **dykal-push** | 0 | 0 | 0 | 0 | — | **DIHAPUS 23 Okt** |
| **kainet-flow-api** | 1 | 1 | 0 | 0 | 24 Sep | **DIHAPUS 23 Okt** |
| **xydownloader-api** | 6 | 3 | 0 | 0 | 27 Sep | **DIHAPUS 23 Okt** |

Sisa 31 script (dari 34). Script tanpa trafik & tanpa domain yang **belum** dihapus
karena menyimpan **secret yang tidak bisa dibaca ulang** lewat API:

| Worker | Alasan ditahan |
|---|---|
| autoclipp-auth | 9 secret (JWT, Google OAuth, OpenRouter, Resend) — hapus = kunci hilang permanen |
| xy-image-api | secret `API_KEY` + binding AI |
| xyverse-ops-db | secret `ACCESS_TOKEN` + D1 |
| xydesk-news | 10 secret (OneSignal, Resend, Google OAuth, D1) — ikut paket migrasi XyDesk |
| rendiv-studio | secret `GITHUB_TOKEN` + KV |
| wa-release-bot-lagu | secret `GROQ_API_KEY` + KV |
| veyra-neon-district | Durable Object `CITY` (data pemain hilang kalau dihapus) |
| xy-mail-handler | kosong, tapi kemungkinan handler Email Routing — cek dulu |
| xystock | punya domain `xystock.xystudio.my.id` (produk?) |

## Catatan penting

1. **Menghapus Worker tidak menambah kuota.** Kuota free = total request seluruh
   akun. Worker mati menyumbang ~0, jadi pembersihan ini soal kerapian, bukan
   penyelamat kuota. Yang menyelamatkan kuota cuma: mengurangi polling,
   menghapus Worker yang *ramai* (xydesk), atau upgrade ke paid.
2. **Hari ini adalah anomali.** Rata-rata `xydesk-remote-web` = 21.953/hari
   (548.818 / 25 hari), tapi hari ini 121.823 = **5,6x lipat**, dan lonjakannya
   mulai mendadak jam 05:00 UTC. Perlu dicek apa yang rilis/berubah jam itu.
3. Backup kode + settings untuk semua Worker yang dihapus ada di
   `/home/user/worker-backup/` (`.js` + `.settings.json`).

## Rencana offboard XyDesk (setelah migrasi Firebase selesai)

Hapus berurutan, lalu lepas domainnya:

```bash
# 1. Worker (masing-masing punya repo, jadi masih bisa deploy ulang)
for w in xydesk-remote-web xydesk-web xydesk-admin xydesk-signaling xydesk-news xydesk-api; do
  curl -s -X DELETE -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/workers/scripts/$w"
done

# 2. Durable Object & D1 ikut terhapus bersama script; KV `UNIQUE_DOWNLOADS`
#    dan D1 `xydesk-news` dihapus terpisah kalau sudah tidak dipakai.

# 3. Domain custom (7 hostname) lepas otomatis saat script dihapus.
```

Dampak: **−121.823 request/hari** (dari ±130k turun ke ±8-10k). Akun aman
tanpa perlu bayar.

## Alternatif tanpa kartu kredit (pengganti R2)

R2 memang minta kartu. Tapi ada dua jalur gratis tanpa kartu:

**A. Halaman statis di Pages (0 request Worker).**
Request ke aset statis Cloudflare **tidak dihitung** sebagai invocation Worker.
Jadi angka "sesi aktif" cukup ditulis ke file JSON statis oleh **GitHub Actions
cron** (tiap 5 menit, hit endpoint Worker 1x), lalu di-publish ke project Pages
yang sudah ada. Landing cukup `fetch('/stats.json')` — 1.000 tab kebuka pun
tetap 0 kuota Worker.

**B. Hapus widget-nya.** Karena XyDesk mau pindah ke Firebase, menaruh
infrastruktur baru untuk fitur ini justru pemborosan. Setelah migrasi, Worker
`xydesk-remote-web` dihapus dan masalahnya selesai sendiri.
