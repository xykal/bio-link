"use client";

import { useState } from "react";
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

/**
 * Cover project dengan fallback berlapis (tanpa request gambar eksternal saat scroll):
 *   1. `p.image` — cover lokal di public/covers atau hasil upload Cloudinary
 *   2. `github.com/<repo>.png` — fallback ringan kalau cover benar-benar kosong
 *   3. gradient + inisial judul
 * Owner/repo dibaca dari `repoUrl`, jadi ganti link repo di panel = cover ikut pindah.
 */
function repoFromUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") return null;
    const [owner, repo] = u.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

function ProjectCover({ project, glyph }: { project: ProjectItem; glyph: string }) {
  const repo = repoFromUrl(project.repoUrl);
  const candidates = [
    project.image,
    repo ? `https://github.com/${repo.owner}/${repo.repo}.png` : "",
  ].filter(Boolean);

  // attempt dinaikkan tiap gambar gagal (onError). Remount lewat key di parent
  // saat image/repo berubah -> attempt otomatis balik ke 0.
  const [attempt, setAttempt] = useState(0);
  const src = candidates[attempt];

  if (!src) {
    return (
      <div
        className="flex h-full w-full items-center justify-center text-3xl font-black tracking-tight opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(120% 120% at 15% 0%, #8b5cf644, transparent 60%), linear-gradient(135deg,#15151d,#0b0b12)",
        }}
        aria-hidden
      >
        {glyph}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={project.image && attempt === 0 ? optImg(src, { w: 640, h: 360, crop: "fill" }) : src}
      alt={`Cover ${project.title}`}
      width={640}
      height={360}
      loading="lazy"
      decoding="async"
      onError={() => setAttempt((a) => (a + 1 < candidates.length ? a + 1 : candidates.length))}
      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
    />
  );
}

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
            className={`group flex flex-col overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 ${
              isLight
                ? "border-black/10 bg-white/70 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.4)]"
                : "border-white/10 bg-white/[0.04] shadow-[0_16px_40px_-24px_rgba(0,0,0,0.9)]"
            }`}
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              <ProjectCover
                key={`${p.id}|${p.image}|${p.repoUrl}`}
                project={p}
                glyph={p.title.slice(0, 2).toUpperCase()}
              />
              <span
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
                aria-hidden
              />
              <span
                className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  STATUS_STYLE[p.status] || STATUS_STYLE.archived
                }`}
              >
                {STATUS_LABEL[p.status] || p.status}
              </span>
              {p.featured && (
                <span className="absolute bottom-2 right-2 rounded-full border border-white/20 bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
                  <svg viewBox="0 0 24 24" className="mr-0.5 inline h-3 w-3" aria-hidden>
                    <path
                      d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.4 6.2 20.4l1.1-6.4L2.6 9.4l6.5-.9z"
                      fill="currentColor"
                    />
                  </svg>
                  Unggulan
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
