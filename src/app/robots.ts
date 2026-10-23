import type { MetadataRoute } from "next";

const SITE = "https://bio.haekal.web.id";

// robots.txt: halaman admin & API tidak perlu dirayapi mesin pencari.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
