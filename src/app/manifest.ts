import type { MetadataRoute } from "next";
import { readStore } from "@/lib/data";

export const dynamic = "force-dynamic";

// Manifest PWA: bikin halaman bisa "Add to Home Screen" dan tampil standalone.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = "Bio Link";
  let theme = "#08080d";
  let icon = "/icon.png";
  try {
    const store = await readStore();
    name = store.seo.title || store.profile.name || name;
    theme = store.background?.darkColor || theme;
    if (store.seo.favicon) icon = store.seo.favicon;
  } catch {
    /* default */
  }

  return {
    name,
    short_name: name.split("·")[0].trim().slice(0, 12) || "Bio",
    description: "Semua link, project, dan shop dalam satu halaman.",
    start_url: "/",
    display: "standalone",
    background_color: theme,
    theme_color: theme,
    icons: [
      { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
