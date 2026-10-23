import type { MetadataRoute } from "next";
import { readStore } from "@/lib/data";

const SITE = "https://bio.haekal.web.id";

export const dynamic = "force-dynamic";

// Sitemap ikut isi store: tab Project/Shop hanya didaftarkan kalau memang aktif,
// supaya Google tidak menemukan halaman kosong.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  let tabs = { projects: true, shop: false };
  let shopEnabled = false;
  try {
    const store = await readStore();
    tabs = store.tabs;
    shopEnabled = store.shop.enabled;
  } catch {
    /* pakai default: hanya halaman bio */
  }

  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
  ];
  if (tabs.projects) {
    entries.push({
      url: `${SITE}/project`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }
  if (tabs.shop && shopEnabled) {
    entries.push({
      url: `${SITE}/shop`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }
  return entries;
}
