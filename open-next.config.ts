import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Semua halaman butuh data D1 yang berubah dari panel admin, jadi halaman publik
// dijalankan SSR (dynamic) di edge dan tidak memakai Incremental Cache.
// Konsekuensinya tidak perlu R2 bucket / DO queue / tag cache sama sekali —
// cocok buat akun yang R2-nya belum diaktifkan. Kalau nanti mau ISR lagi,
// buat R2 bucket + aktifkan `r2IncrementalCache` + `doQueue` di sini.
export default defineCloudflareConfig({});
