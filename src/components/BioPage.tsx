"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import type { LinkItem, Profile } from "@/lib/data";

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export default function BioPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.profile);
        setLinks(d.links);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const accent = profile?.accent || "#8b5cf6";
  const rgb = hexToRgb(accent);

  return (
    <main className="relative min-h-screen w-full overflow-hidden flex flex-col items-center px-4 py-10">
      {/* background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: `radial-gradient(60% 50% at 50% -5%, rgba(${rgb.r},${rgb.g},${rgb.b},0.22), transparent 70%), radial-gradient(40% 40% at 85% 15%, rgba(${rgb.r},${rgb.g},${rgb.b},0.12), transparent 70%), radial-gradient(55% 45% at 10% 90%, rgba(${rgb.r},${rgb.g},${rgb.b},0.10), transparent 70%)`,
        }}
      />

      {loading ? (
        <div className="mt-24 animate-pulse flex flex-col items-center gap-4">
          <div className="h-24 w-24 rounded-full bg-white/10" />
          <div className="h-5 w-40 rounded bg-white/10" />
          <div className="h-4 w-28 rounded bg-white/5" />
          <div className="mt-5 w-full max-w-sm space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-2xl bg-white/5" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex w-full max-w-sm flex-col items-center">
          {/* avatar */}
          <div
            className="relative h-24 w-24 rounded-full p-[3px]"
            style={{
              background: `conic-gradient(from 180deg, ${accent}, ${accent}55, ${accent})`,
            }}
          >
            <div className="h-full w-full overflow-hidden rounded-full bg-[#111118]">
              {profile?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar}
                  alt={profile?.name || "avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-3xl font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}66)` }}
                >
                  {(profile?.name || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* name & handle */}
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            {profile?.name}
          </h1>
          <p className="mt-0.5 text-sm text-white/50">{profile?.handle}</p>
          {profile?.bio && (
            <p className="mt-3 text-center text-sm leading-relaxed text-white/70">
              {profile?.bio}
            </p>
          )}

          {/* social quick buttons */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {links.slice(0, 7).map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                title={l.title}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:scale-110 hover:border-white/25 hover:text-white"
              >
                <Icon name={l.icon} className="h-4 w-4" />
              </a>
            ))}
          </div>

          {links.length > 0 && (
            <div className="mt-6 w-full space-y-3" style={{ marginTop: links.length > 7 ? "2rem" : "1.5rem" }}>
              {links.map((l, i) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.09]"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}77)` }}
                  >
                    <Icon name={l.icon} className="h-4.5 w-4.5" />
                  </span>
                  <span className="flex-1 truncate font-medium text-white/90">{l.title}</span>
                  <span className="text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/70">
                    →
                  </span>
                </a>
              ))}
            </div>
          )}

          <footer className="mt-10 text-xs text-white/25">
            © {new Date().getFullYear()} Haekal · bio.haekal.web.id
          </footer>
        </div>
      )}
    </main>
  );
}
