import type { Metadata, Viewport } from "next";
import { cache } from "react";
import { readStore } from "@/lib/data";
import { optImg } from "@/lib/img";
import BioPage from "@/components/BioPage";

// ISR 2 menit: HTML dilayani dari cache edge (Vercel POP terdekat), data
// di-refresh di belakang layar. Compute Vercel Hobby ada di AS — tanpa ini
// setiap pengunjung Indonesia menunggu PP Pasifik buat HTML yang isinya
// sama. Setiap simpan admin memanggil revalidatePath("/") di writeStore,
// jadi perubahan tetap instan; preview admin pakai cache-buster sendiri.
export const revalidate = 120;

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
  return { themeColor: store?.theme === "light" ? "#f7f7f9" : "#08080d" };
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

  return {
    title,
    description,
    icons,
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

export default async function Home() {
  const initial = await getStore();
  // Ring story abu tidak lagi dibaca dari cookie saat SSR: halaman kini
  // di-cache di edge (sama untuk semua orang). BioPage sudah mengambil
  // status dilihat dari localStorage + /api/data sejak awal di client.
  return <BioPage initial={initial} />;
}
