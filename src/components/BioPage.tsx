"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icons";
import { fontCss } from "@/lib/fonts";
import { optImg } from "@/lib/img";
import type { LinkItem, Store } from "@/lib/data";

type PublicData = {
  profile: Store["profile"];
  links: LinkItem[];
  social: Store["social"];
  fonts: Store["fonts"];
  theme: "dark" | "light";
  branding: Store["branding"];
  rulesUrl: string;
};

type XycGateApi = {
  open: (href: string, target?: string) => Promise<boolean>;
  agreed?: () => boolean;
  reset?: () => void;
};

function getXycGate(): XycGateApi | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { XycGate?: XycGateApi }).XycGate;
}

function rulesOriginOf(url?: string): string {
  try {
    return new URL(url || "https://rules.xyc.my.id/").origin;
  } catch {
    return "https://rules.xyc.my.id";
  }
}

function toPublic(s: Store): PublicData {
  return {
    profile: s.profile,
    links: s.links.filter((l) => l.enabled).sort((a, b) => a.order - b.order),
    social: s.social,
    fonts: s.fonts,
    theme: s.theme,
    branding: s.branding,
    rulesUrl: s.seo.rulesUrl,
  };
}

function hexToRgb(hex: string) {
  const h = (hex || "#8b5cf6").replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export default function BioPage({ initial }: { initial: Store | null }) {
  const [data, setData] = useState<PublicData | null>(() =>
    initial ? toPublic(initial) : null
  );
  const [loading, setLoading] = useState(!initial);
  const [failed, setFailed] = useState(false);
  const [gateLink, setGateLink] = useState<LinkItem | null>(null);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const pressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Semua setState di sini terjadi di callback promise (asinkron), sehingga
  // aman terhadap aturan react-hooks/set-state-in-effect (Next 16).
  const load = useCallback(() => {
    fetch("/api/data")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: PublicData) => {
        setData(d);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // retry manual dari ErrorState: reset boleh sinkron karena ini event handler
  const retry = useCallback(() => {
    setLoading(true);
    setFailed(false);
    load();
  }, [load]);

  // Muat widget gate resmi (gate.js) sekali saja. Widget menarik kebijakan asli
  // lewat API (CORS terbuka) dan merender di Shadow DOM — BUKAN iframe, karena
  // origin rules mengirim X-Frame-Options: SAMEORIGIN.
  const rulesOrigin = rulesOriginOf(data?.rulesUrl);
  useEffect(() => {
    if (getXycGate()) return;
    if (document.getElementById("xyc-gate-script")) return;
    const s = document.createElement("script");
    s.id = "xyc-gate-script";
    s.src = `${rulesOrigin}/gate.js`;
    s.defer = true;
    s.async = true;
    document.head.appendChild(s);
  }, [rulesOrigin]);

  function avatarPressStart() {
    pressRef.current = setTimeout(() => setShowAvatarPreview(true), 450);
  }
  function avatarPressEnd() {
    if (pressRef.current) clearTimeout(pressRef.current);
    pressRef.current = null;
    setShowAvatarPreview(false);
  }

  function handleClick(e: React.MouseEvent, link: LinkItem) {
    if (link.gate !== "rules") return;
    e.preventDefault();
    const XG = getXycGate();
    if (XG && typeof XG.open === "function") {
      try {
        XG.open(link.url, "_blank");
        return;
      } catch {
        // jatuh ke fallback modal
      }
    }
    setGateLink(link);
  }

  const profile = data?.profile;
  const accent = profile?.accent || "#8b5cf6";
  const rgb = useMemo(() => hexToRgb(accent), [accent]);
  const isLight = data?.theme === "light";
  const avatarPos = profile?.avatarPos || "50% 50%";

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
        <Skeleton isLight={!!isLight} />
      ) : failed && !data ? (
        <ErrorState onRetry={retry} />
      ) : (
        <div className="flex w-full max-w-md flex-col items-center">
          {/* banner + avatar rapat: avatar menimpa banner seperti kartu profil */}
          <div className="relative w-full">
            {profile?.banner ? (
              <div className="w-full overflow-hidden rounded-3xl border border-black/5 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={optImg(profile.banner, { w: 900, h: 300, crop: "fill" })}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-28 w-full object-cover"
                />
              </div>
            ) : null}

            <div
              className={`avatar-frame absolute left-1/2 -translate-x-1/2 flex items-center justify-center bg-gradient-to-br p-[3px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)] shape-${
                profile?.shape || "circle"
              } cursor-pointer select-none ${profile?.banner ? "-bottom-10" : "relative"}`}
              style={{
                background: `conic-gradient(from 180deg, ${accent}, ${accent}55, ${accent})`,
                width: 108,
                height: 108,
              }}
              onPointerDown={avatarPressStart}
              onPointerUp={avatarPressEnd}
              onPointerLeave={avatarPressEnd}
              onPointerCancel={avatarPressEnd}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            >
              <div
                className={`shape-${profile?.shape || "circle"} h-full w-full overflow-hidden ${
                  isLight ? "bg-white" : "bg-[#111118]"
                }`}
              >
                {profile?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={optImg(profile.avatar, { w: 400, h: 400, crop: "fill" })}
                    alt={profile.name}
                    decoding="async"
                    className="h-full w-full object-cover"
                    style={{ objectPosition: avatarPos }}
                  />
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
          </div>

          {/* name */}
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-name)", marginTop: profile?.banner ? 52 : 16 }}
          >
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
                    onClick={(e) => handleClick(e, l)}
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
                      <span
                        className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-wide ${
                          isLight ? "border-black/10 text-black/50" : "border-white/10 text-white/50"
                        }`}
                      >
                        <Icon name="lock" className="h-3 w-3" />
                        Gate
                      </span>
                    ) : null}
                    <span
                      className={`transition group-hover:translate-x-0.5 ${
                        isLight ? "text-zinc-400" : "text-white/30 group-hover:text-white/70"
                      }`}
                    >
                      <Icon name="chevron" className="h-4 w-4 -rotate-90" />
                    </span>
                  </a>
                );
              })}
            </div>
          )}

          {data && data.links.length === 0 && (
            <div
              className={`mt-8 w-full rounded-3xl border border-dashed p-8 text-center text-sm ${
                isLight ? "border-black/15 text-black/50" : "border-white/15 text-white/40"
              }`}
            >
              Belum ada link yang ditampilkan.
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
                {data.branding.text || "Made by XySpace Tch"}
              </a>
            ) : (
              <span className="text-xs opacity-30" style={{ fontFamily: "var(--font-brand)" }}>
                {new Date().getFullYear()} {profile?.name}
              </span>
            )}
          </footer>
        </div>
      )}

      {/* AVATAR LONG-PRESS PREVIEW */}
      {showAvatarPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center transition-opacity">
          {profile?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={optImg(profile.avatar, { w: 800, h: 800, crop: "fill" })}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl opacity-60"
              style={{ objectPosition: avatarPos }}
            />
          ) : (
            <div
              className="absolute inset-0 opacity-60 blur-2xl"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
            />
          )}
          <div className="absolute inset-0 bg-black/40" />

          <div className="relative z-10">
            <div
              className="h-72 w-72 overflow-hidden rounded-full p-1 shadow-2xl"
              style={{ background: `conic-gradient(from 180deg, ${accent}, ${accent}55, ${accent})` }}
            >
              <div className="h-full w-full overflow-hidden rounded-full bg-black/40">
                {profile?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={optImg(profile.avatar, { w: 600, h: 600, crop: "fill" })}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: avatarPos }}
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

      {/* GATE FALLBACK (hanya bila gate.js gagal dimuat) */}
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
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold" style={{ fontFamily: "var(--font-link)" }}>
                <Icon name="lock" className="h-4 w-4" />
                {gateLink.title} · Rules
              </span>
              <button
                onClick={() => setGateLink(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-white/70 hover:text-white"
                aria-label="Tutup"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-6 text-sm opacity-80" style={{ minHeight: 140 }}>
              <p className="mb-2 font-semibold">Widget kebijakan tidak bisa dimuat.</p>
              <p className="leading-relaxed opacity-70">
                Koneksi ke {rulesOrigin.replace(/^https?:\/\//, "")} sedang bermasalah.
                Baca dulu aturannya di tab baru sebelum bergabung.
              </p>
            </div>

            <div className="flex items-center gap-2 border-t border-white/10 px-3 py-3">
              <a
                href={rulesOrigin}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-sm font-medium opacity-90 transition hover:opacity-100"
              >
                <Icon name="external" className="h-4 w-4" />
                Baca rules
              </a>
              <button
                onClick={() => {
                  window.open(gateLink.url, "_blank", "noopener,noreferrer");
                  setGateLink(null);
                }}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
              >
                {gateLink.kind === "join_group" ? "Join Grup" : "Buka Saluran"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------------- Skeleton: bentuk halaman final, tanpa konten palsu ---------------- */
function Skeleton({ isLight }: { isLight: boolean }) {
  const box = isLight ? "bg-black/10" : "bg-white/10";
  return (
    <div className="mt-2 flex w-full max-w-md animate-pulse flex-col items-center" aria-busy="true" aria-label="Memuat halaman">
      <div className={`h-28 w-full rounded-3xl ${box}`} />
      <div className={`-mt-10 h-[108px] w-[108px] rounded-full border-4 ${isLight ? "border-[#f7f7f9]" : "border-[#08080d]"} ${box}`} />
      <div className={`mt-4 h-6 w-40 rounded-lg ${box}`} />
      <div className={`mt-2 h-4 w-24 rounded-lg ${box}`} />
      <div className={`mt-4 h-4 w-64 rounded-lg ${box}`} />
      <div className="mt-7 w-full space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-[62px] w-full rounded-2xl ${box}`} />
        ))}
      </div>
      <div className={`mt-10 h-3 w-32 rounded ${box}`} />
    </div>
  );
}

/* ---------------- Error state dengan retry ---------------- */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-24 flex w-full max-w-sm flex-col items-center rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
        <Icon name="alert" className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">Halaman gagal dimuat</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/50">
        Koneksi terputus atau server sedang bermasalah. Coba muat ulang sebentar lagi.
      </p>
      <button
        onClick={onRetry}
        className="mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold transition hover:brightness-110"
      >
        <Icon name="refresh" className="h-4 w-4" />
        Coba lagi
      </button>
    </div>
  );
}
