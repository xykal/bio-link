import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { cache } from "react";
import { readStore } from "@/lib/data";
import { optImg } from "@/lib/img";
import BioPage from "@/components/BioPage";

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
  return { themeColor: store?.theme === "light" ? "#f7f7f9" : "#08080d" };
}

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  const seo = store?.seo;
  const profile = store?.profile;
  const title = seo?.title || profile?.name || "Bio Link";
  const description = seo?.description || profile?.bio || "";
  const icons: Metadata["icons"] = seo?.favicon ? { icon: optImg(seo.favicon, { w: 96, h: 96, crop: "fill" }) } : undefined;
  const ogImages = seo?.ogImage ? [{ url: optImg(seo.ogImage, { w: 1200, h: 630, crop: "fill" }) }] : undefined;

  return {
    title,
    description,
    icons,
    // Marker deploy: biar gampang ngecek build mana yang live di prod.
    other: { "x-build": "r12c-mic-guard" },
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
  // Story yang udah dilihat visitor (dari cookie) -> render ring abu saat SSR.
  let initialViewed: string[] = [];
  try {
    const store = await cookies();
    const raw = store.get("bio_viewed")?.value || "";
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    if (Array.isArray(parsed)) initialViewed = parsed.filter((x) => typeof x === "string");
  } catch {
    initialViewed = [];
  }
  return <BioPage initial={initial} initialViewed={initialViewed} />;
}
