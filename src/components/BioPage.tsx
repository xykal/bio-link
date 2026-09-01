"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icons";
import { fontCss } from "@/lib/fonts";
import type { LinkItem, Store, Socials, FontsConfig } from "@/lib/data";

type PublicData = {
  profile: Store["profile"];
  links: LinkItem[];
  social: Socials;
  fonts: FontsConfig;
  theme: "dark" | "light";
  branding: Store["branding"];
  rulesUrl: string;
};

function hexToRgb(hex: string) {
  const h = (hex || "#8b5cf6").replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const SOCIAL_KEYS: (keyof Socials)[] = [
  "instagram",
  "tiktok",
  "youtube",
  "github",
  "x",
  "facebook",
  "linkedin",
  "telegram",
  "whatsapp",
  "spotify",
  "discord",
  "website",
];

export default function BioPage({ initial }: { initial: Store | null }) {
  const [data, setData] = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(!initial);
  const [gateLink, setGateLink] = useState<LinkItem | null>(null);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const pressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // long-press the avatar to show a centered round photo with blurred backdrop
  function avatarPressStart() {
    pressRef.current = setTimeout(() => setShowAvatarPreview(true), 450);
  }
  function avatarPressEnd() {
    if (pressRef.current) clearTimeout(pressRef.current);
    pressRef.current = null;
    setShowAvatarPreview(false);
  }

  useEffect(() => {
    if (initial) {
      setData({
        profile: initial.profile,
        links: initial.links.filter((l) => l.enabled).sort((a, b) => a.order - b.order),
        social: initial.social,
        fonts: initial.fonts,
        theme: initial.theme,
        branding: initial.branding,
        rulesUrl: initial.seo.rulesUrl,
      });
      setLoading(false);
    }
    fetch("/api/data")
      .then((r) => r.json())
      .then((d: PublicData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initial]);

  const profile = data?.profile;
  const accent = profile?.accent || "#8b5cf6";
  const rgb = useMemo(() => hexToRgb(accent), [accent]);
  const isLight = data?.theme === "light";

  const cssVars = useMemo(
    () =>
      ({
        "--accent": accent,
        "--accent-rgb": `${rgb.r} ${rgb.g} ${rgb.b}`,
        "--font-name": fontCss(data?.fonts?.name || "poppins"),
        "--font-handle": fontCss(data?.fonts?.handle || "space-grotesk"),
        "--font-bio": fontCss(data?.fonts?.bio || "inter"),
        "--font-link": fontCss(data?.fonts?.linkTitle || "poppins"),
        "--font-label": fontCss(data?.fonts?.linkLabel || "space-grotesk"),
        "--font-brand": fontCss(data?.fonts?.brand || "space-grotesk"),
      }) as React.CSSProperties,
    [accent, rgb, data?.fonts]
  );

  // gate opener: for links marked gate==="rules", intercept click.
  function handleClick(e: React.MouseEvent, link: LinkItem, target: string) {
    if (link.gate === "rules") {
      e.preventDefault();
      setGateLink(link);
    }
  }

  const socialButtons = SOCIAL_KEYS.map((k) => ({
    k,
    href: data?.social?.[k] || "",
  })).filter((s) => s.href);

  const nicknameLinks = socialButtons.filter((s) =>
    ["instagram", "tiktok", "youtube", "github", "x", "facebook", "linkedin", "telegram", "$spotify", "discord", "website"].includes(s.k)
  );

  return (
    <main
      className={`bio-page relative min-h-screen w-full overflow-hidden flex flex-col items-center px-4 py-8 transition-colors ${
        isLight ? "text-zinc-900 bg-[#f7f7f9]" : "text-white"
      }`}
      style={cssVars}
    >
      {!isLight && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage: `radial-gradient(60% 50% at 50% -5%, rgba(${rgb.r},${rgb.g},${rgb.b},0.22), transparent 70%), radial-gradient(40% 40% at 85% 15%, rgba(${rgb.r},${rgb.g},${rgb.b},0.12), transparent 70%), radial-gradient(55% 45% at 10% 90%, rgba(${rgb.r},${rgb.g},${rgb.b},0.10), transparent 70%)`,
          }}
        />
      )}
      {isLight && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage: `radial-gradient(60% 55% at 50% -5%, rgba(${rgb.r},${rgb.g},${rgb.b},0.16), transparent 70%), linear-gradient(180deg,#ffffff,#f4f4f6)`,
          }}
        />
      )}

      {loading ? (
        <div
          className="mt-24 flex flex-col items-center gap-4 animate-pulse"
          style={{ fontFamily: "var(--font-name)" }}
        >
          <div className="h-24 w-24 rounded-full bg-white/10" />
          <div className="h-5 w-40 rounded bg-white/10" />
          <div className="mt-5 w-full max-w-sm space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-2xl bg-white/5" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex w-full max-w-md flex-col items-center">
          {/* banner */}
          {profile?.banner ? (
            <div className="mb-4 w-full overflow-hidden rounded-3xl border border-black/5 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile.banner} alt="banner" className="h-32 w-full object-cover" />
            </div>
          ) : null}

          {/* avatar (dynamic shape) */}
          <div
            className={`avatar-frame flex items-center justify-center bg-gradient-to-br p-[3px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)] shape-${profile?.shape || "circle"} cursor-pointer select-none`}
            style={{
              background: `conic-gradient(from 180deg, ${accent}, ${accent}55, ${accent})`,
              width: 118,
              height: 118,
            }}
            onPointerDown={avatarPressStart}
            onPointerUp={avatarPressEnd}
            onPointerLeave={avatarPressEnd}
            onPointerCancel={avatarPressEnd}
          >
            <div
              className={`shape-${profile?.shape || "circle"} h-full w-full overflow-hidden ${
                isLight ? "bg-white" : "bg-[#111118]"
              }`}
            >
              {profile?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-4xl font-bold"
                  style={{
                    fontFamily: "var(--font-name)",
                    background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
                    color: "#fff",
                  }}
                >
                  {(profile?.name || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* name */}
          <h1 className="mt-4 text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-name)" }}>
            {profile?.name}
          </h1>
          <p className="mt-0.5 text-sm opacity-50" style={{ fontFamily: "var(--font-handle)" }}>
            {profile?.handle}
          </p>
          {profile?.bio && (
            <p
              className="mt-3 max-w-sm text-center text-sm leading-relaxed opacity-70"
              style={{ fontFamily: "var(--font-bio)" }}
            >
              {profile.bio}
            </p>
          )}

          {/* social quick buttons */}
          {socialButtons.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {socialButtons.slice(0, 8).map((s) => (
                <a
                  key={s.k}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  title={s.k}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border opacity-70 transition hover:-translate-y-0.5 hover:opacity-100 ${
                    isLight
                      ? "border-black/10 bg-white text-zinc-700 hover:shadow-lg"
                      : "border-white/10 bg-white/5 text-white/80 hover:shadow-lg"
                  }`}
                >
                  <Icon name={s.k} className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}

          {data && data.links.length > 0 && (
            <div className="mt-6 w-full space-y-3">
              {data.links.map((l, i) => {
                const gated = l.gate === "rules";
                return (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => handleClick(e, l, l.url)}
                    className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 ${
                      isLight
                        ? "border-black/5 bg-white shadow-sm hover:shadow-lg"
                        : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.09]"
                    }`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}
                    >
                      <Icon name={l.icon} className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate font-semibold"
                        style={{ fontFamily: "var(--font-link)" }}
                      >
                        {l.title}
                      </span>
                      {l.kind && l.kind !== "link" && (
                        <span
                          className="mt-0.5 block text-[11px] uppercase tracking-wider opacity-45"
                          style={{ fontFamily: "var(--font-label)" }}
                        >
                          {l.kind === "join_group" ? "Join Grup" : "Link Saluran"}
                        </span>
                      )}
                    </span>
                    {gated ? (
                      <span className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wide opacity-70">
                        {isLight ? "Gates" : "🔒"}
                      </span>
                    ) : null}
                    <span className={`transition group-hover:translate-x-0.5 ${isLight ? "text-zinc-400" : "text-white/30 group-hover:text-white/70"}`}>
                      →
                    </span>
                  </a>
                );
              })}
            </div>
          )}

          <footer className="mt-10">
            {data?.branding?.enabled ? (
              <a
                href="https://web.haekal.web.id"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium tracking-wide opacity-30 transition hover:opacity-70"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                ⚡ {data.branding.text || "Made by XySpace Tch"}
              </a>
            ) : (
              <span className="text-xs opacity-30" style={{ fontFamily: "var(--font-brand)" }}>
                © {new Date().getFullYear()} {profile?.name}
              </span>
            )}
          </footer>
        </div>
      )}

      {/* AVATAR LONG-PRESS PREVIEW */}
      {showAvatarPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center transition-opacity">
          {/* blurred backdrop from the avatar image */}
          {profile?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl opacity-60"
            />
          ) : (
            <div
              className="absolute inset-0 opacity-60 blur-2xl"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
            />
          )}
          <div className="absolute inset-0 bg-black/40" />

          {/* centered round photo */}
          <div className="relative z-10">
            <div
              className="h-72 w-72 overflow-hidden rounded-full p-1 shadow-2xl"
              style={{ background: `conic-gradient(from 180deg, ${accent}, ${accent}55, ${accent})` }}
            >
              <div className={`h-full w-full overflow-hidden rounded-full bg-black/40`}>
                {profile?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-7xl font-bold text-white">
                    {(profile?.name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <p
              className="mt-3 text-center text-sm font-semibold text-white/90"
              style={{ fontFamily: "var(--font-name)" }}
            >
              {profile?.name}
            </p>
          </div>
        </div>
      )}

      {/* GATE MODAL */}
      {gateLink && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setGateLink(null)}
        >
          <div
            className={`relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border text-center ${
              isLight ? "border-black/10 bg-white shadow-2xl" : "border-white/10 bg-[#13131b]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* simple top bar (default, minimal) */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span
                className="text-sm font-semibold"
                style={{ fontFamily: "var(--font-link)" }}
              >
                {gateLink.title} · Rules
              </span>
              <button
                onClick={() => setGateLink(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-white/70 hover:text-white"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            {/* the actual rules page, default appearance */}
            <div className="bg-black/10" style={{ height: "min(60vh, 460px)" }}>
              <iframe
                src={data?.rulesUrl || "https://rules.xyc.my.id/docs"}
                title="Rules"
                className="h-full w-full"
                loading="lazy"
                style={{ border: 0, background: "#fff" }}
              />
            </div>

            <div className="flex items-center gap-2 border-t border-white/10 px-3 py-3">
              <a
                href={data?.rulesUrl || "https://rules.xyc.my.id/docs"}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm font-medium opacity-90 transition hover:opacity-100"
              >
                ⧉ Di tab baru
              </a>
              <button
                onClick={() => {
                  window.open(gateLink.url, "_blank", "noopener,noreferrer");
                  setGateLink(null);
                }}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
              >
                {gateLink.kind === "join_group" ? "Join Grup →" : "Buka Saluran →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
