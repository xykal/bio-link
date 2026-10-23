"use client";

import { optImg } from "@/lib/img";
import type { ProjectItem } from "@/lib/data";

const STATUS_LABEL: Record<string, string> = {
  live: "Live",
  beta: "Beta",
  soon: "Segera",
  archived: "Arsip",
};

const STATUS_STYLE: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  beta: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  soon: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  archived: "bg-white/10 text-white/60 border-white/20",
};

export default function ProjectGrid({
  projects,
  isLight,
  limit,
}: {
  projects: ProjectItem[];
  isLight?: boolean;
  limit?: number;
}) {
  const items = (limit ? projects.slice(0, limit) : projects).slice().sort((a, b) => a.order - b.order);

  if (items.length === 0) {
    return (
      <p
        className={`mt-6 w-full rounded-2xl border px-4 py-6 text-center text-sm ${
          isLight ? "border-black/10 text-black/50" : "border-white/10 text-white/40"
        }`}
      >
        Belum ada project yang ditampilkan.
      </p>
    );
  }

  return (
    <div className="mt-6 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((p) => {
        const accent = "#8b5cf6";
        return (
          <article
            key={p.id}
            className={`group flex flex-col overflow-hidden rounded-2xl border backdrop-blur-md transition hover:-translate-y-0.5 ${
              isLight
                ? "border-black/10 bg-white/70 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.4)]"
                : "border-white/10 bg-white/[0.04] shadow-[0_16px_40px_-24px_rgba(0,0,0,0.9)]"
            }`}
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={optImg(p.image, { w: 640, h: 360, crop: "fill" })}
                  alt={p.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{
                    backgroundImage: `radial-gradient(120% 120% at 15% 0%, ${accent}44, transparent 60%), linear-gradient(135deg, #15151d, #0b0b12)`,
                  }}
                  aria-hidden
                >
                  <span className="text-3xl font-black tracking-tight opacity-40">
                    {p.title.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <span
                className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  STATUS_STYLE[p.status] || STATUS_STYLE.archived
                }`}
              >
                {STATUS_LABEL[p.status] || p.status}
              </span>
              {p.featured && (
                <span className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                  ★ Unggulan
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col p-4">
              <h3 className="text-[15px] font-bold leading-tight">{p.title}</h3>
              {p.description && (
                <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed opacity-70">
                  {p.description}
                </p>
              )}

              {p.stack.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {p.stack.map((t) => (
                    <li
                      key={t}
                      className={`rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium ${
                        isLight
                          ? "border-black/10 bg-black/[0.04] text-black/60"
                          : "border-white/10 bg-white/[0.06] text-white/70"
                      }`}
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {p.demoUrl && (
                  <a
                    href={p.demoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 rounded-lg px-3 py-1.5 text-center text-[12px] font-semibold text-white transition hover:opacity-90"
                    style={{ background: accent }}
                  >
                    Lihat Demo
                  </a>
                )}
                {p.repoUrl && (
                  <a
                    href={p.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex-1 rounded-lg border px-3 py-1.5 text-center text-[12px] font-semibold transition ${
                      isLight
                        ? "border-black/15 hover:bg-black/[0.04]"
                        : "border-white/15 hover:bg-white/[0.06]"
                    }`}
                  >
                    Repo
                  </a>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
