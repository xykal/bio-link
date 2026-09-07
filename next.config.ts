import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=self, microphone=self, geolocation=()" },
          // SAMEORIGIN: blokir clickjacking lintas-origin, tapi izinkan panel
          // admin (origin sama) meng-embed halaman untuk preview live.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        // Aset publik statis (favicon, OG banner) tidak di-hash namanya, jadi
        // jangan immutable — cukup seminggu, cukup lama buat visitor balik
        // arun tanpa unduh ulang, cukup singkat buat update terasa.
        source: "/(favicon.png|favicon.ico|icon.png|og-default.jpg|og-default.png|apple-touch-icon.png)",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
      {
        // Halaman publik: di-cache di edge (Cloudflare + Vercel) 2 menit +
        // stale-while-revalidate. Server compute Vercel Hobby ada di AS, jadi
        // tanpa ini tiap pengunjung Indonesia menunggu PP lautan Pasifik
        // cuma buat HTML yang isinya sama. Browser tetap max-age=0 (selalu
        // revalidasi ke edge yang dekat); perubahan admin nongol maks 2 menit
        // — dan preview di panel admin memakai cache-buster sendiri.
        source: "/",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=120, stale-while-revalidate=300" },
        ],
      },
    ];
  },
};

export default nextConfig;
