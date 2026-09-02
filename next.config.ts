import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // SAMEORIGIN: blokir clickjacking lintas-origin, tapi izinkan panel
          // admin (origin sama) meng-embed halaman untuk preview live.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
