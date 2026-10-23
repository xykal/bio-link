import type { Metadata } from "next";
import { readStore } from "@/lib/data";
import BioPage from "@/components/BioPage";
import { withPayReady } from "@/lib/pakasir";
import { withTechIndex } from "@/lib/techResolve";

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
  const title = `Project ${name} — portofolio & karya`;
  const description =
    "Kumpulan project yang sedang dan sudah dikerjakan: aplikasi Android, tools RDP, game 3D, sampai platform web.";
  return {
    title,
    description,
    keywords: store?.seo.keywords?.length ? store.seo.keywords : undefined,
    alternates: { canonical: `${SITE}/project` },
    openGraph: {
      title,
      description,
      url: `${SITE}/project`,
      siteName: store?.seo.title || name,
      type: "website",
      images: [{ url: `${SITE}/og-default.jpg`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProjectPage() {
  const store = await getStore();
  const projects = (store?.projects || []).filter((p) => p.enabled).sort((a, b) => a.order - b.order);

  // Structured data: daftar project sebagai ItemList + setiap project sebagai
  // SoftwareApplication, supaya Google paham ini portofolio (bukan halaman spam).
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${SITE}/project#page`,
        name: `Project ${store?.profile.name || "Haekal"}`,
        url: `${SITE}/project`,
        isPartOf: { "@type": "WebSite", name: store?.seo.title || "Bio Link", url: SITE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Bio", item: SITE },
          { "@type": "ListItem", position: 2, name: "Project", item: `${SITE}/project` },
        ],
      },
      {
        "@type": "ItemList",
        numberOfItems: projects.length,
        itemListElement: projects.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "SoftwareApplication",
            name: p.title,
            description: p.description,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Web, Android, Windows",
            url: p.demoUrl || p.repoUrl || `${SITE}/project`,
            ...(p.image ? { image: p.image } : {}),
            ...(p.repoUrl ? { codeRepository: p.repoUrl } : {}),
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BioPage initial={store ? withTechIndex(withPayReady(store)) : null} view="project" />
    </>
  );
}
