import type { Metadata } from "next";
import { readStore } from "@/lib/data";
import BioPage from "@/components/BioPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const store = await readStore();
  const { seo, profile } = store;
  const title = seo.title || profile.name || "Bio Link";
  const description = seo.description || profile.bio || "";
  const icons: Metadata["icons"] = seo.favicon ? { icon: seo.favicon } : undefined;
  const ogImages = seo.ogImage ? [{ url: seo.ogImage }] : undefined;

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
