import type { Metadata, Viewport } from "next";
import { cache } from "react";
import { readStore } from "@/lib/data";
import { optImg } from "@/lib/img";
import BioPage from "@/components/BioPage";
import { withPayReady } from "@/lib/pakasir";

// SSR di edge Cloudflare. Dulu di Vercel halaman ini ISR 2 menit karena compute
// Hobby ada di AS; sekarang render terjadi di POP terdekat pemilik request dan
// data dibaca lewat binding D1 native, jadi tidak perlu cache HTML terpisah
// (yang di Cloudflare butuh R2 + DO queue). Micro-cache 10 detik di
// lib/storecache.ts tetap memangkas query D1 saat trafik ramai.
export const dynamic = "force-dynamic";

// Satu baca D1 per request (React cache = dedupe utk metadata, viewport, Home).
// Dibungkus try/catch supaya halaman TIDAK PERNAH 500 walau D1 sedang blip;
// kalau gagal, balik null dan BioPage fallback ke fetch client-side.
const getStore = cache(async () => {
  try {
    return await readStore();
  } catch {
    return null;
  }
});

// Warna chrome browser (mobile) mengikuti mode tema.
export async function generateViewport(): Promise<Viewport> {
  const store = await getStore();
  return {
    themeColor:
      store?.theme === "light"
        ? store.background?.lightColor || "#f7f7f9"
        : store?.background?.darkColor || "#08080d",
    viewportFit: "cover",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  const seo = store?.seo;
  const profile = store?.profile;
  const title = seo?.title || profile?.name || "Bio Link";
  const description = seo?.description || profile?.bio || "";
  // Favicon & OG default: asset AI di /public; bisa di-override lewat admin (seo).
  const icons: Metadata["icons"] = seo?.favicon
    ? { icon: optImg(seo.favicon, { w: 96, h: 96, crop: "fill" }) }
    : [{ url: "/favicon.png", type: "image/png" }];
  const ogImages = seo?.ogImage
    ? [{ url: optImg(seo.ogImage, { w: 1200, h: 630, crop: "fill" }) }]
    : [{ url: "https://bio.haekal.web.id/og-default.jpg", width: 1200, height: 630, alt: title }];

  const keywords = seo?.keywords?.length ? seo.keywords : undefined;

  return {
    title,
    description,
    keywords,
    icons,
    alternates: { canonical: "https://bio.haekal.web.id" },
    verification: seo?.googleVerification
      ? { google: seo.googleVerification }
      : undefined,
    // Marker deploy: biar gampang ngecek build mana yang live di prod.
    other: { "x-build": "r16-perf-edge" },
    openGraph: {
      title,
      description,
      images: ogImages,
      url: "https://bio.haekal.web.id",
      siteName: title,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description, images: ogImages },
  };
}

// Structured data profil: bantu Google menampilkan knowledge panel yang benar.
const personJsonLd = (store: Awaited<ReturnType<typeof getStore>>) => ({
  "@context": "https://schema.org",
  "@type": "Person",
  name: store?.profile.name || "Haekal",
  alternateName: store?.profile.handle || "@xykal",
  description: store?.profile.bio || "",
  url: "https://bio.haekal.web.id",
  image: store?.profile.avatar || "https://bio.haekal.web.id/icon.png",
  sameAs: Object.values(store?.social || {}).filter(Boolean),
  // knowsAbout: sinyal topik ke Google (dipakai dari daftar kata kunci panel).
  knowsAbout: store?.seo.keywords?.length ? store.seo.keywords : undefined,
  // Profil situs: bantu Google mengaitkan situs dengan orang yang sama.
  mainEntityOfPage: {
    "@type": "WebSite",
    name: store?.seo.title || "Haekal · Bio Link",
    url: "https://bio.haekal.web.id",
    inLanguage: "id-ID",
  },
});

export default async function Home() {
  const raw = await getStore();
  const initial = raw ? withPayReady(raw) : null;
  // Ring story abu tidak lagi dibaca dari cookie saat SSR: halaman kini
  // di-cache di edge (sama untuk semua orang). BioPage sudah mengambil
  // status dilihat dari localStorage + /api/data sejak awal di client.
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd(initial)) }}
      />
      <BioPage initial={initial} />
    </>
  );
}
