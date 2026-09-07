"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Icon } from "./Icons";
import { fontCss } from "@/lib/fonts";
import { optImg } from "@/lib/img";
import type { LinkItem, Store, Bubble, BubbleStyle, BubblePosition } from "@/lib/data";

export type PublicData = {
  profile: Store["profile"];
  links: LinkItem[];
  social: Store["social"];
  stack: Store["stack"];
  team: Store["team"];
  stories: Store["stories"];
  fonts: Store["fonts"];
  theme: "dark" | "light";
  linkShape: Store["linkShape"];
  stackAlign: Store["stackAlign"];
  linkLayout: Store["linkLayout"];
  bubble: Store["bubble"];
  sections: Store["sections"];
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

// Catat klik link. Pakai sendBeacon agar tetap terkirim walau tab berpindah.
function trackLinkClick(id: string, title: string) {
  const body = JSON.stringify({ linkId: id, title });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/track/click",
        new Blob([body], { type: "application/json" })
      );
      return;
    }
  } catch {
    /* fallback di bawah */
  }
  fetch("/api/track/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

const VISITOR_KEY = "bio_visitor_name";
const VISITOR_ID_KEY = "bio_visitor_id";
const VIEWED_KEY = "bio_viewed_stories";

// Story viewer dipecah ke chunk terpisah: hanya diunduh saat story dibuka.
// ssr:false aman — viewer murni interaksi client (overlay setelah tap).
const StoryViewer = dynamic(() => import("./StoryViewer"), { ssr: false });

// ID visitor anonim (persist lokal) sebagai kunci state di DB.
// localStorage utama + cookie fallback (biar identitas like/viewed tahan
// walau browser agresif bersihkan localStorage).
function getCookie(k: string): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp("(?:^|; )" + k + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}
function persistVisitorId(id: string) {
  try {
    localStorage.setItem(VISITOR_ID_KEY, id);
  } catch {
    /* private mode */
  }
  try {
    document.cookie = `${VISITOR_ID_KEY}=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}
function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = "";
  try {
    id = localStorage.getItem(VISITOR_ID_KEY) || "";
  } catch {
    /* ignore */
  }
  if (!id) id = getCookie(VISITOR_ID_KEY);
  if (!id) id = crypto.randomUUID();
  persistVisitorId(id);
  return id;
}

const INDO_NAMES = [
  "Asep", "Budi", "Citra", "Dewi", "Eko", "Fitri", "Gilang", "Hana",
  "Intan", "Joko", "Kirana", "Lia", "Maya", "Nanda", "Putri", "Raka",
  "Sari", "Tono", "Vina", "Wati", "Yoga", "Zahra", "Agus", "Bella",
];

// Nama anonim acak per pengunjung (disimpan, jadi tetap sama tiap kunjungan).
function getVisitorName(): string {
  if (typeof window === "undefined") return "Anon";
  try {
    const saved = localStorage.getItem(VISITOR_KEY);
    if (saved) return saved;
    const name =
      INDO_NAMES[Math.floor(Math.random() * INDO_NAMES.length)] +
      String(Math.floor(Math.random() * 900) + 100);
    localStorage.setItem(VISITOR_KEY, name);
    return name;
  } catch {
    return "Anon";
  }
}

function readViewed(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const arr = JSON.parse(localStorage.getItem(VIEWED_KEY) || "[]") as string[];
    return Object.fromEntries(arr.map((id) => [id, true]));
  } catch {
    return {};
  }
}

function rulesOriginOf(url?: string): string {
  try {
    return new URL(url || "https://rules.xyc.my.id/").origin;
  } catch {
    return "https://rules.xyc.my.id";
  }
}

// Tinggi bar waveform deterministik per story (konsisten antar render).

function toPublic(s: Store): PublicData {
  return {
    profile: s.profile,
    links: s.links.filter((l) => l.enabled).sort((a, b) => a.order - b.order),
    social: s.social,
    stack: s.stack || [],
    team: s.team || [],
    stories: s.stories || [],
    fonts: s.fonts,
    theme: s.theme,
    linkShape: s.linkShape || "rounded",
    stackAlign: s.stackAlign || "right",
    linkLayout: s.linkLayout || "list",
    bubble: s.bubble || { enabled: false, text: "", style: "speech", position: "top-right" },
    sections: s.sections || { stack: true, team: true },
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

const LINK_RADIUS: Record<string, number> = {
  pill: 9999,
  rounded: 16,
  soft: 24,
  square: 10,
};

/* ---------------- Gelembung pesan di foto profil ---------------- */
const BUBBLE_ANCHOR: Record<BubblePosition, string> = {
  "top-left": "bottom-full left-0 mb-2",
  "top-right": "bottom-full right-0 mb-2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
  "bottom-left": "top-full left-0 mt-2",
  "bottom-right": "top-full right-0 mt-2",
};

const BUBBLE_TAIL: Record<BubblePosition, string> = {
  "top-left": "-bottom-1 left-5",
  "top-right": "-bottom-1 right-5",
  left: "-right-1 top-1/2 -translate-y-1/2",
  right: "-left-1 top-1/2 -translate-y-1/2",
  "bottom-left": "-top-1 left-5",
  "bottom-right": "-top-1 right-5",
};

type BubbleVisual = {
  boxClass: string;
  boxStyle: React.CSSProperties;
  tailColor: string;
  tailBorder?: string;
  showTail: boolean;
  maxWidth: number;
};

function bubbleVisual(
  style: BubbleStyle,
  accent: string,
  isLight: boolean,
  position: BubblePosition
): BubbleVisual {
  const side = position === "left" || position === "right";
  const maxWidth = side ? 132 : 168;
  const base: BubbleVisual = {
    boxClass: "",
    boxStyle: {},
    tailColor: accent,
    showTail: true,
    maxWidth,
  };
  switch (style) {
    case "pill":
      return {
        ...base,
        boxStyle: { background: accent, color: "#fff", borderRadius: 9999 },
        showTail: false,
      };
    case "glass":
      return {
        ...base,
        boxClass: "backdrop-blur-md",
        boxStyle: {
          background: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.10)",
          border: `1px solid ${isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.18)"}`,
          color: isLight ? "#18181b" : "#ffffff",
          borderRadius: 14,
        },
        tailColor: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.10)",
        tailBorder: `1px solid ${isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.18)"}`,
      };
    case "neon":
      return {
        ...base,
        boxStyle: {
          background: "#08080d",
          border: `1.5px solid ${accent}`,
          color: accent,
          borderRadius: 12,
          boxShadow: `0 0 14px ${accent}80`,
        },
        showTail: false,
      };
    case "outline":
      return {
        ...base,
        boxStyle: {
          background: isLight ? "rgba(255,255,255,0.6)" : "transparent",
          border: `1.5px solid ${accent}`,
          color: accent,
          borderRadius: 12,
        },
        showTail: false,
      };
    case "gradient":
      return {
        ...base,
        boxClass: "shadow-lg",
        boxStyle: {
          background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
          color: "#fff",
          borderRadius: 14,
        },
      };
    case "note":
      return {
        ...base,
        boxClass: "shadow-md",
        boxStyle: {
          background: "#fde68a",
          color: "#78350f",
          borderRadius: 8,
          transform: "rotate(-2deg)",
        },
        tailColor: "#fde68a",
      };
    case "badge":
      return {
        ...base,
        boxClass: "shadow-lg",
        boxStyle: { background: accent, color: "#fff", borderRadius: 9999 },
        maxWidth: side ? 120 : 150,
        showTail: false,
      };
    case "tiktok":
      return {
        ...base,
        boxStyle: {
          background: "#010101",
          color: "#fff",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "2px 2px 0 #25f4ee, -2px -2px 0 #fe2c55",
        },
        showTail: false,
      };
    case "instagram":
      return {
        ...base,
        boxClass: "shadow-lg",
        boxStyle: {
          background:
            "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
          color: "#fff",
          borderRadius: 14,
        },
        tailColor: "#dc2743",
      };
    case "speech":
    default:
      return {
        ...base,
        boxClass: "shadow-lg",
        boxStyle: { background: accent, color: "#fff", borderRadius: 14 },
      };
  }
}

function ProfileBubble({
  bubble,
  accent,
  isLight,
}: {
  bubble: Bubble;
  accent: string;
  isLight: boolean;
}) {
  const position = bubble.position;
  const color = bubble.color || accent;
  const v = bubbleVisual(bubble.style, color, isLight, position);
  return (
    <div
      className={`pointer-events-none absolute z-20 ${BUBBLE_ANCHOR[position]}`}
      style={{ maxWidth: v.maxWidth }}
      aria-hidden
    >
      <div
        className={`relative px-3 py-1.5 text-[11px] font-semibold leading-snug ${v.boxClass}`}
        style={v.boxStyle}
      >
        {bubble.text}
        {v.showTail && (
          <span
            className={`absolute h-2.5 w-2.5 rotate-45 ${BUBBLE_TAIL[position]}`}
            style={{ background: v.tailColor, border: v.tailBorder }}
          />
        )}
      </div>
    </div>
  );
}

export default function BioPage({ initial }: { initial: Store | null }) {
  const [data, setData] = useState<PublicData | null>(() =>
    initial ? toPublic(initial) : null
  );
  const [loading, setLoading] = useState(!initial);
  const [failed, setFailed] = useState(false);
  const [gateLink, setGateLink] = useState<LinkItem | null>(null);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  // Viewer story terbuka? (konten viewer hidup di chunk StoryViewer)
  const [storyOpen, setStoryOpen] = useState(false);

  const [visitorId] = useState(getVisitorId);
  const [visitorName, setVisitorName] = useState(getVisitorName);
  const [viewedSet, setViewedSet] = useState<Record<string, boolean>>(() => ({
    // Dari localStorage (client); server tidak lagi SSR-ing status dilihat
    // karena HTML di-cache edge. /api/data me-merge sisanya saat init.
    ...readViewed(),
  }));
  const avatarPressTimer = useRef<number | null>(null);
  const avatarLong = useRef(false);
  const [likedSet, setLikedSet] = useState<Record<string, boolean>>({});

  // Semua setState terjadi di callback promise (asinkron) -> aman untuk aturan
  // react-hooks/set-state-in-effect (React Compiler, Next 16).
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

  const retry = useCallback(() => {
    setLoading(true);
    setFailed(false);
    load();
  }, [load]);

  // Muat widget gate resmi (gate.js) sekali saja.
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

  // Hitung kunjungan sekali per buka halaman.
  useEffect(() => {
    fetch("/api/track", { method: "POST" }).catch(() => {});
  }, []);

  // Prefetch chunk StoryViewer saat senggang (2,5 dtk setelah load): begitu
  // foto profil ditap, viewer langsung tampil tanpa menunggu unduhan chunk.
  useEffect(() => {
    const t = window.setTimeout(() => void import("./StoryViewer"), 2500);
    return () => window.clearTimeout(t);
  }, []);

  // Sinkronkan state visitor anonim dari DB (nama, like, viewed) biar konsisten
  // walau refresh / buka lagi. setState di callback promise -> aman.
  useEffect(() => {
    const localViewed = readViewed(); // fallback localStorage (sync via tick)
    const applyLocal = () =>
      setViewedSet((s) => ({ ...localViewed, ...s }));
    if (!visitorId) {
      Promise.resolve().then(applyLocal);
      return;
    }
    fetch("/api/visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        applyLocal();
        if (!d) return;
        if (typeof d.name === "string" && d.name) setVisitorName(d.name);
        if (Array.isArray(d.liked))
          setLikedSet((s) => ({ ...s, ...Object.fromEntries(d.liked.map((x: string) => [x, true])) }));
        if (Array.isArray(d.viewed))
          setViewedSet((s) => ({ ...s, ...Object.fromEntries(d.viewed.map((x: string) => [x, true])) }));
      })
      .catch(applyLocal);
  }, [visitorId]);







  // Tandai story sudah dilihat -> garis/segmen jadi abu-abu (disimpan lokal).
  function markViewed(id?: string) {
    if (!id || viewedSet[id]) return;
    setViewedSet((prev) => {
      if (prev[id]) return prev;
      const next = { ...prev, [id]: true };
      try {
        localStorage.setItem(VIEWED_KEY, JSON.stringify(Object.keys(next)));
      } catch {
        /* private mode */
      }
      return next;
    });
    // Simpan juga ke DB biar abu permanen walau refresh / ganti perangkat-local.
    fetch("/api/story/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId: id, visitorId }),
    }).catch(() => {});
  }

  function openStory() {
    setStoryOpen(true);
  }

  // Avatar: tap = buka story; tahan (long-press) = lihat foto profil penuh.
  function avatarDown() {
    if (!hasStories) return;
    avatarLong.current = false;
    if (avatarPressTimer.current) window.clearTimeout(avatarPressTimer.current);
    avatarPressTimer.current = window.setTimeout(() => {
      avatarLong.current = true;
      setShowAvatarPreview(true);
    }, 350);
  }
  function avatarUp() {
    if (avatarPressTimer.current) {
      window.clearTimeout(avatarPressTimer.current);
      avatarPressTimer.current = null;
    }
  }
  type StoryT = Store["stories"][number];
  function patchStory(storyId: string, patch: (st: StoryT) => StoryT) {
    setData((prev) =>
      prev
        ? { ...prev, stories: prev.stories.map((st) => (st.id === storyId ? patch(st) : st)) }
        : prev
    );
  }

  // Merge hasil polling like/komentar dari viewer ke state data.
  const applyStats = useCallback(
    (
      stats: {
        id: string;
        likes: number;
        comments: { id: string; name: string; text: string; at: number }[];
      }[]
    ) => {
      setData((prev) => {
        if (!prev) return prev;
        const byId = new Map(stats.map((s) => [s.id, s]));
        return {
          ...prev,
          stories: prev.stories.map((st) => {
            const r = byId.get(st.id);
            if (!r) return st;
            return { ...st, likes: r.likes, comments: r.comments };
          }),
        };
      });
    },
    []
  );

  function handleClick(e: React.MouseEvent, link: LinkItem) {
    trackLinkClick(link.id, link.title);
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
  const shape = profile?.shape || "circle";
  const customShape = profile?.customShape || "";
  const isCustomShape = shape === "custom" && customShape.length > 0;
  const linkRadius = LINK_RADIUS[data?.linkShape || "rounded"] ?? 16;
  const ringColor = isLight ? "#f7f7f9" : "#08080d";
  const stack = data?.stack || [];
  const team = data?.team || [];
  const sections = data?.sections || { stack: true, team: true };
  const bubble = data?.bubble;
  const showBubble = !!bubble?.enabled && !!bubble.text?.trim();
  const layout = data?.linkLayout || "list";
  const stories = data?.stories || [];
  const hasStories = stories.length > 0;
  // Ring story: 1 story = cincin utuh; >1 = tersegmentasi (putus-putus) ala IG.
  // Ring ditarik agak keluar (gap dari avatar) biar terlihat jelas.
  const storyCount = stories.length;
  const RING_SIZE = 124;
  const RING_C = RING_SIZE / 2;
  const RING_R = 59;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const RING_GAP = storyCount > 1 ? 10 : 0;
  const RING_SEG =
    (RING_CIRC - storyCount * RING_GAP) / Math.max(1, storyCount);
  const stackJustify =
    data?.stackAlign === "left"
      ? "justify-start"
      : data?.stackAlign === "center"
        ? "justify-center"
        : "justify-end";

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
      className={`bio-page relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden px-4 py-6 transition-colors ${
        isLight ? "bg-[#f7f7f9] text-zinc-900" : "text-white"
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
                {/* Banner = elemen LCP: wajib eager + prioritas tinggi.
                    Dulu loading="lazy" -> gambar terakhir diketahui browser,
                    LCP bengkak sampai 5+ detik di koneksi lambat. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={optImg(profile.banner, { w: 900, h: 300, crop: "fill" })}
                  alt=""
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-28 w-full object-cover"
                />
              </div>
            ) : null}

            {/* Avatar + bubble: wrapper jadi anchor posisi gelembung pesan */}
            <div
              className={
                profile?.banner
                  ? "absolute left-1/2 -translate-x-1/2 -bottom-10"
                  : "relative mx-auto"
              }
              style={{ width: 108, height: 108 }}
            >
              {/* Ring story ala IG: gradasi ungu; tersegmentasi kalau story > 1 */}
              {hasStories && (
                <svg
                  aria-hidden
                  className="ring-once pointer-events-none absolute -inset-2"
                  viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                  width={RING_SIZE}
                  height={RING_SIZE}
                >
                  <defs>
                    <linearGradient id="bio-story-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#c084fc" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#e879f9" />
                    </linearGradient>
                  </defs>
                  {stories.map((s, i) => (
                    <circle
                      key={s.id}
                      cx={RING_C}
                      cy={RING_C}
                      r={RING_R}
                      fill="none"
                      stroke={
                        viewedSet[s.id]
                          ? isLight
                            ? "rgba(113,113,122,0.45)"
                            : "rgba(148,163,184,0.40)"
                          : "url(#bio-story-ring)"
                      }
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={
                        storyCount > 1
                          ? `${RING_SEG} ${RING_CIRC - RING_SEG}`
                          : undefined
                      }
                      strokeDashoffset={
                        storyCount > 1 ? -(i * (RING_SEG + RING_GAP)) : undefined
                      }
                      transform={`rotate(-90 ${RING_C} ${RING_C})`}
                    />
                  ))}
                </svg>
              )}
              {/* clip-path bebas (shape custom dari editor gambar) */}
              {isCustomShape && (
                <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
                  <defs>
                    <clipPath id="bio-avatar-clip" clipPathUnits="objectBoundingBox">
                      <path d={customShape} />
                    </clipPath>
                  </defs>
                </svg>
              )}
              {/* Avatar: pure foto, tanpa ring/bingkai — langsung di-clip ke shape */}
              <div
                className={`avatar-frame ${
                  isCustomShape ? "" : `shape-${shape}`
                } relative h-full w-full cursor-pointer overflow-hidden shadow-[0_12px_40px_-14px_rgba(0,0,0,0.55)] select-none`}
                style={isCustomShape ? { clipPath: "url(#bio-avatar-clip)" } : undefined}
                onClick={() => {
                  if (avatarLong.current) {
                    avatarLong.current = false;
                    return;
                  }
                  if (hasStories) openStory();
                  else setShowAvatarPreview((v) => !v);
                }}
                onPointerDown={avatarDown}
                onPointerUp={avatarUp}
                onPointerLeave={avatarUp}
                onPointerCancel={avatarUp}
                role="button"
                tabIndex={0}
                aria-label={
                  hasStories
                    ? "Lihat story (tahan untuk foto profil)"
                    : "Lihat foto profil"
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (hasStories) openStory();
                    else setShowAvatarPreview((v) => !v);
                  }
                }}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              >
                {profile?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={optImg(profile.avatar, { w: 400, h: 400, crop: "fill" })}
                    alt={profile.name}
                    decoding="async"
                    fetchPriority="high"
                    className="h-full w-full object-cover"
                    style={{ objectPosition: avatarPos }}
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-4xl font-bold"
                    style={{
                      fontFamily: "var(--font-name)",
                      background: isLight ? "#ececf1" : "#1b1b25",
                      color: isLight ? "#a1a1aa" : "#4b4b5a",
                    }}
                  >
                    {(profile?.name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Gelembung pesan di foto profil (tampil untuk semua orang) */}
              {showBubble && bubble && (
                <ProfileBubble bubble={bubble} accent={accent} isLight={!!isLight} />
              )}
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

          {/* STACK / KEAHLIAN: logo asli (warna brand), posisi bisa kiri/tengah/kanan, tumpuk-tindih setengah */}
          {sections.stack && stack.length > 0 && (
            <div className={`mt-5 flex w-full items-center ${stackJustify}`} aria-label="Tech stack">
              <div className="flex">
                {stack.map((s, i) => {
                  if (!s.path) return null;
                  return (
                    <span
                      key={s.id}
                      title={s.title || s.slug}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md"
                      style={{
                        marginLeft: i === 0 ? 0 : -16,
                        zIndex: stack.length - i,
                        border: `2px solid ${ringColor}`,
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
                        <path d={s.path} fill={`#${s.hex}`} />
                      </svg>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* LINK: tata letak grid (2 kolom, kartu terpusat) */}
          {data && data.links.length > 0 && layout === "grid" && (
            <div className="mt-6 grid w-full grid-cols-2 gap-3">
              {data.links.map((l, i) => {
                const gated = l.gate === "rules";
                const label =
                  l.kind === "join_group"
                    ? "Join Grup"
                    : l.kind === "channel"
                      ? "Link Saluran"
                      : "";
                return (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => handleClick(e, l)}
                    className={`group flex flex-col items-center gap-2 border px-3 py-4 text-center backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 ${
                      isLight
                        ? "border-black/5 bg-white shadow-sm hover:shadow-lg"
                        : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.09]"
                    }`}
                    style={{ borderRadius: linkRadius, animationDelay: `${i * 40}ms` }}
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center text-white"
                      style={{
                        borderRadius: linkRadius >= 9999 ? 9999 : 14,
                        background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
                      }}
                    >
                      <Icon name={l.icon} className="h-5 w-5" />
                    </span>
                    <span
                      className="break-words text-sm font-semibold"
                      style={{ fontFamily: "var(--font-link)" }}
                    >
                      {l.title}
                    </span>
                    {label && (
                      <span
                        className="text-[10px] uppercase tracking-wider opacity-45"
                        style={{ fontFamily: "var(--font-label)" }}
                      >
                        {label}
                      </span>
                    )}
                    {gated && (
                      <span
                        className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${
                          isLight ? "border-black/10 text-black/50" : "border-white/10 text-white/50"
                        }`}
                      >
                        <Icon name="lock" className="h-2.5 w-2.5" />
                        Gate
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          )}

          {/* LINK: tata letak list / compact (baris penuh) */}
          {data && data.links.length > 0 && layout !== "grid" && (
            <div className={`mt-6 w-full ${layout === "compact" ? "space-y-2" : "space-y-3"}`}>
              {data.links.map((l, i) => {
                const gated = l.gate === "rules";
                const compact = layout === "compact";
                return (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => handleClick(e, l)}
                    className={`group flex w-full items-center gap-3 border text-left backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 ${
                      compact ? "px-3 py-2.5" : "px-4 py-3.5"
                    } ${
                      isLight
                        ? "border-black/5 bg-white shadow-sm hover:shadow-lg"
                        : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.09]"
                    }`}
                    style={{ borderRadius: linkRadius, animationDelay: `${i * 40}ms` }}
                  >
                    <span
                      className={`flex shrink-0 items-center justify-center text-white ${
                        compact ? "h-8 w-8" : "h-10 w-10"
                      }`}
                      style={{
                        borderRadius: linkRadius >= 9999 ? 9999 : 12,
                        background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
                      }}
                    >
                      <Icon name={l.icon} className={compact ? "h-4 w-4" : "h-4.5 w-4.5"} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate font-semibold ${compact ? "text-sm" : ""}`}
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

          {/* TEAM & CONTRIBUTOR: avatar bulat sejajar */}
          {sections.team && team.length > 0 && (
            <div className="mt-9 w-full">
              <p
                className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] opacity-40"
                style={{ fontFamily: "var(--font-label)" }}
              >
                Team XySpace &amp; Contributor
              </p>
              <div className="flex flex-wrap items-start justify-center gap-x-5 gap-y-4">
                {team.map((m) => {
                  const inner = (
                    <>
                      <span
                        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-lg font-bold"
                        style={{
                          background: isLight ? "#ececf1" : "#1b1b25",
                          color: isLight ? "#a1a1aa" : "#6b6b7b",
                          border: `2px solid ${isLight ? "#e6e6ec" : "rgba(255,255,255,0.10)"}`,
                        }}
                      >
                        {m.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={optImg(m.avatar, { w: 160, h: 160, crop: "fill" })}
                            alt={m.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (m.name || "?").charAt(0).toUpperCase()
                        )}
                      </span>
                      <span
                        className="mt-1.5 block w-16 truncate text-center text-[11px] font-semibold"
                        style={{ fontFamily: "var(--font-name)" }}
                      >
                        {m.name}
                      </span>
                      {m.role && (
                        <span className="block w-16 truncate text-center text-[10px] opacity-45">
                          {m.role}
                        </span>
                      )}
                    </>
                  );
                  return m.url ? (
                    <a
                      key={m.id}
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center transition hover:opacity-80"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div key={m.id} className="flex flex-col items-center">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <footer className="mt-8">
            {data?.branding?.enabled ? (
              <a
                href="https://web.haekal.web.id"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium tracking-wide opacity-30 transition hover:opacity-70"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                {data.branding.text || "Made by XySpace"}
              </a>
            ) : null}
          </footer>
        </div>
      )}

      {/* AVATAR PREVIEW (toggle: klik foto -> muncul, klik lagi / klik luar -> tutup) */}
      {showAvatarPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowAvatarPreview(false)}
          role="dialog"
          aria-modal="true"
        >
          {profile?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={optImg(profile.avatar, { w: 800, h: 800, crop: "fill" })}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-3xl"
              style={{ objectPosition: avatarPos }}
            />
          ) : (
            <div
              className="absolute inset-0 opacity-40 blur-3xl"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
            />
          )}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-2xl" />

          <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <div className="h-72 w-72 overflow-hidden rounded-full bg-black/40 shadow-2xl">
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
              {showBubble && bubble && (
                <ProfileBubble bubble={bubble} accent={accent} isLight={false} />
              )}
            </div>
            <p className="mt-3 text-center text-xs text-white/40">Klik di mana saja untuk menutup</p>
          </div>
        </div>
      )}


      {/* STORY VIEWER (full): klik foto profil saat ada story.
          Kode viewer + komentar hidup di chunk terpisah (dynamic import)
          supaya initial JS tetap ringan; chunk di-prefetch saat idle. */}
      {storyOpen && data && (
        <StoryViewer
          data={data}
          viewed={viewedSet}
          liked={likedSet}
          visitorId={visitorId}
          visitorName={visitorName}
          onNameChange={setVisitorName}
          onSeen={markViewed}
          onLike={(id) => setLikedSet((s) => ({ ...s, [id]: true }))}
          onStats={applyStats}
          onPatchStory={patchStory}
          onClose={() => setStoryOpen(false)}
        />
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
              <span
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ fontFamily: "var(--font-link)" }}
              >
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
                Koneksi ke {rulesOrigin.replace(/^https?:\/\//, "")} sedang bermasalah. Baca dulu
                aturannya di tab baru sebelum bergabung.
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
    <div
      className="flex w-full max-w-md animate-pulse flex-col items-center"
      aria-busy="true"
      aria-label="Memuat halaman"
    >
      <div className={`h-28 w-full rounded-3xl ${box}`} />
      <div
        className={`-mt-10 h-[108px] w-[108px] rounded-full border-4 ${
          isLight ? "border-[#f7f7f9]" : "border-[#08080d]"
        } ${box}`}
      />
      <div className={`mt-4 h-6 w-40 rounded-lg ${box}`} />
      <div className={`mt-2 h-4 w-24 rounded-lg ${box}`} />
      <div className={`mt-4 h-4 w-64 rounded-lg ${box}`} />
      <div className="mt-7 w-full space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-[62px] w-full rounded-2xl ${box}`} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Error state dengan retry ---------------- */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white">
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
