import type { Metadata } from "next";
import { readStore } from "@/lib/data";
import BioPage from "@/components/BioPage";

export const dynamic = "force-dynamic";

const SITE = "https://bio.haekal.web.id";

async function getStore() {
  try {
    return await readStore();
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  const name = store?.profile.name || "Haekal";
  const headline = store?.shop.headline || "Shop";
  const title = `${headline} ${name} — produk digital & jasa`;
  const description =
    store?.shop.note?.slice(0, 160) ||
    "Produk digital dan jasa dari Haekal. Pembayaran otomatis via QRIS.";
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/shop` },
    openGraph: {
      title,
      description,
      url: `${SITE}/shop`,
      siteName: store?.seo.title || name,
      type: "website",
      images: [{ url: `${SITE}/og-default.jpg`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
    // Halaman shop tidak perlu diindeks kalau shop-nya masih ditutup.
    robots: store?.shop.enabled ? undefined : { index: false, follow: true },
  };
}

export default async function ShopPage() {
  const store = await getStore();
  const products = (store?.products || [])
    .filter((p) => p.enabled)
    .sort((a, b) => a.order - b.order);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: store?.shop.headline || "Shop",
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.name,
        description: p.description,
        ...(p.image ? { image: p.image } : {}),
        ...(p.category ? { category: p.category } : {}),
        offers: {
          "@type": "Offer",
          price: p.price,
          priceCurrency: "IDR",
          availability:
            p.stock === 0
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
          url: `${SITE}/shop`,
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BioPage initial={store} view="shop" />
    </>
  );
}
