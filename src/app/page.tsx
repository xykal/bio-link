import type { Metadata, Viewport } from "next";
import { readStore } from "@/lib/data";
import { optImg } from "@/lib/img";
import BioPage from "@/components/BioPage";

export const dynamic = "force-dynamic";

// Warna chrome browser (mobile) mengikuti mode tema.
export async function generateViewport(): Promise<Viewport> {
  const store = await readStore();
  return { themeColor: store.theme === "light" ? "#f7f7f9" : "#08080d" };
}

export async function generateMetadata(): Promise<Metadata> {
  const store = await readStore();
  const { seo, profile } = store;
  const title = seo.title || profile.name || "Bio Link";
  const description = seo.description || profile.bio || "";
  const icons: Metadata["icons"] = seo.favicon ? { icon: optImg(seo.favicon, { w: 96, h: 96, crop: "fill" }) } : undefined;
  const ogImages = seo.ogImage ? [{ url: optImg(seo.ogImage, { w: 1200, h: 630, crop: "fill" }) }] : undefined;

  return {
    title,
    description,
    icons,
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
  let initial = null;
  try {
    initial = await readStore();
  } catch {
    initial = null;
  }
  return <BioPage initial={initial} />;
}
