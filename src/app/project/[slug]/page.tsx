import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readStore, type ProjectItem } from "@/lib/data";
import { optImg } from "@/lib/img";

const SITE = "https://bio.haekal.web.id";

// SSR di edge; data dibaca dari D1 tiap request (store kecil, sudah di-cache 10 dtk).
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

async function getStore() {
  try {
    return await readStore();
  } catch {
    return null;
  }
}

function findProject(projects: ProjectItem[], slug: string): ProjectItem | null {
  const key = decodeURIComponent(slug).toLowerCase();
  return (
    projects.find((p) => p.enabled && p.slug === key) ||
    // URL lama berbasis id tetap dilayani supaya tidak 404 setelah migrasi slug.
    projects.find((p) => p.enabled && p.id === key) ||
    null
  );
}

const STATUS_LABEL: Record<string, string> = {
  live: "Live",
  beta: "Beta",
  soon: "Segera",
  archived: "Arsip",
};

const STATUS_STYLE: Record<string, string> = {
  live: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  beta: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  soon: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  archived: "border-white/20 bg-white/10 text-white/60",
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore();
  const project = store ? findProject(store.projects, slug) : null;
  if (!project) {
    return { title: "Project tidak ditemukan", robots: { index: false, follow: true } };
  }

  const name = store?.profile.name || "Haekal";
  const title = `${project.title} — project ${name}`;
  const description =
    project.description ||
    `${project.title} karya ${name}: ${project.stack.join(", ") || "project open source"}.`;
  const images = project.image
    ? [{ url: project.image.startsWith("http") ? project.image : `${SITE}${project.image}`, alt: project.title }]
    : [{ url: `${SITE}/og-default.jpg`, width: 1200, height: 630, alt: title }];

  return {
    title,
    description,
    keywords: [...new Set([project.title, ...project.stack, ...(store?.seo.keywords || [])])].slice(0, 20),
    alternates: { canonical: `${SITE}/project/${project.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE}/project/${project.slug}`,
      siteName: store?.seo.title || name,
      type: "article",
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function ProjectDetailPage({ params }: Params) {
  const { slug } = await params;
  const store = await getStore();
  if (!store) notFound();
  const project = findProject(store.projects, slug);
  if (!project) notFound();

  const others = store.projects
    .filter((p) => p.enabled && p.id !== project.id)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order)
    .slice(0, 3);

  const name = store.profile.name || "Haekal";
  const accent = store.profile.accent || "#8b5cf6";

  // Structured data: SoftwareApplication + breadcrumb (Bio > Project > judul).
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE}/project/${project.slug}#app`,
        name: project.title,
        description: project.description,
        applicationCategory: "WebApplication",
        operatingSystem: "Web, Android, Windows",
        url: `${SITE}/project/${project.slug}`,
        ...(project.image
          ? { image: project.image.startsWith("http") ? project.image : `${SITE}${project.image}` }
          : {}),
        ...(project.repoUrl ? { codeRepository: project.repoUrl } : {}),
        ...(project.demoUrl ? { installUrl: project.demoUrl } : {}),
        ...(project.stack.length ? { keywords: project.stack.join(", ") } : {}),
        author: { "@type": "Person", name, url: SITE },
        offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Bio", item: SITE },
          { "@type": "ListItem", position: 2, name: "Project", item: `${SITE}/project` },
          {
            "@type": "ListItem",
            position: 3,
            name: project.title,
            item: `${SITE}/project/${project.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <main className="min-h-dvh w-full bg-[#08080d] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage: `radial-gradient(60% 50% at 50% -10%, ${accent}26, transparent 70%)`,
        }}
        aria-hidden
      />

      <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6">
        {/* breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-white/40">
          <Link href="/" className="transition hover:text-white/80">
            Bio
          </Link>
          <span aria-hidden>/</span>
          <Link href="/project" className="transition hover:text-white/80">
            Project
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-white/70">{project.title}</span>
        </nav>

        <article className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#12121a]">
            {project.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={optImg(project.image, { w: 1000, h: 560, crop: "fill" })}
                alt={`Cover ${project.title}`}
                width={1000}
                height={560}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-4xl font-black opacity-40"
                aria-hidden
              >
                {project.title.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span
              className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide backdrop-blur ${
                STATUS_STYLE[project.status] || STATUS_STYLE.archived
              }`}
            >
              {STATUS_LABEL[project.status] || project.status}
            </span>
          </div>

          <div className="p-5 sm:p-7">
            <h1 className="text-[24px] font-extrabold leading-tight sm:text-[30px]">
              {project.title}
            </h1>
            {project.description && (
              <p className="mt-3 text-[14px] leading-relaxed text-white/65">
                {project.description}
              </p>
            )}

            {project.stack.length > 0 && (
              <section className="mt-5">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Tech stack
                </h2>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {project.stack.map((t) => (
                    <li
                      key={t}
                      className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-[11.5px] font-medium text-white/75"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-6 flex flex-wrap gap-2.5">
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-xl px-4 py-3 text-center text-[13px] font-bold text-white shadow-lg transition hover:opacity-90"
                  style={{ background: accent }}
                >
                  Buka Demo
                </a>
              )}
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-[13px] font-bold text-white/85 transition hover:bg-white/[0.12]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z" />
                  </svg>
                  Lihat Repo
                </a>
              )}
            </div>
          </div>
        </article>

        {others.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
              Project lainnya
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {others.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/project/${p.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:-translate-y-0.5 hover:border-white/25"
                  >
                    <span className="relative block aspect-[16/9] w-full overflow-hidden bg-[#12121a]">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={optImg(p.image, { w: 480, h: 270, crop: "fill" })}
                          alt={`Cover ${p.title}`}
                          width={480}
                          height={270}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="block truncate px-3 py-2.5 text-[12.5px] font-semibold text-white/85">
                      {p.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-10 flex items-center justify-between text-[12px] text-white/35">
          <Link href="/project" className="transition hover:text-white/70">
            ← Semua project
          </Link>
          {store.branding?.enabled ? (
            <a
              href="https://web.haekal.web.id"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-white/70"
            >
              {store.branding.text || "Made by XySpace"}
            </a>
          ) : null}
        </footer>
      </div>
    </main>
  );
}
