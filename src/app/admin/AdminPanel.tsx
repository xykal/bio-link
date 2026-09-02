"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, ICON_KEYS } from "@/components/Icons";
import { FONT_KEYS, FONTS, fontCss } from "@/lib/fonts";
import { optImg } from "@/lib/img";
import { STACK_OPTIONS, getTechIcon } from "@/lib/stackIcons";
import type {
  Store,
  LinkItem,
  Socials,
  FontsConfig,
  SeoConfig,
  Branding,
  ProfileShape,
  StackItem,
  Member,
  Story,
  LinkShape,
  StackAlign,
  Sections,
  Bubble,
  BubbleStyle,
  BubblePosition,
  LinkLayout,
} from "@/lib/data";

const SHAPES: { key: ProfileShape; label: string }[] = [
  { key: "circle", label: "Circle" },
  { key: "squircle", label: "Squircle" },
  { key: "rounded", label: "Rounded" },
  { key: "octagon", label: "Octagon" },
  { key: "shield", label: "Shield" },
  { key: "diamond", label: "Diamond" },
  { key: "hexagon", label: "Hexagon" },
  { key: "leaf", label: "Leaf" },
  { key: "blob", label: "Blob" },
  { key: "morph", label: "Morphing" },
  { key: "abstract", label: "Abstract" },
  { key: "star", label: "Star" },
  { key: "heart", label: "Heart" },
  { key: "custom", label: "Custom (gambar)" },
];

const ACCENTS = ["#8b5cf6", "#06b6d4", "#f43f5e", "#f59e0b", "#22c55e", "#ec4899", "#3b82f6", "#0ea5e9", "#a855f7"];

// Preset tema warna siap pakai (set aksen + mode)
const THEME_PRESETS: { id: string; name: string; accent: string; mode: "dark" | "light" }[] = [
  { id: "violet", name: "Violet", accent: "#8b5cf6", mode: "dark" },
  { id: "ocean", name: "Ocean", accent: "#0ea5e9", mode: "dark" },
  { id: "emerald", name: "Emerald", accent: "#10b981", mode: "dark" },
  { id: "sunset", name: "Sunset", accent: "#f97316", mode: "dark" },
  { id: "rose", name: "Rose", accent: "#f43f5e", mode: "dark" },
  { id: "gold", name: "Gold", accent: "#f59e0b", mode: "dark" },
  { id: "cyber", name: "Cyber", accent: "#22d3ee", mode: "dark" },
  { id: "graphite", name: "Graphite", accent: "#71717a", mode: "dark" },
  { id: "daylight", name: "Daylight", accent: "#6366f1", mode: "light" },
  { id: "paper", name: "Paper", accent: "#0f172a", mode: "light" },
];

const LINK_SHAPES: { key: LinkShape; label: string }[] = [
  { key: "pill", label: "Pill" },
  { key: "rounded", label: "Rounded" },
  { key: "soft", label: "Soft" },
  { key: "square", label: "Square" },
];

const STACK_ALIGNS: { key: StackAlign; label: string }[] = [
  { key: "left", label: "Kiri" },
  { key: "center", label: "Tengah" },
  { key: "right", label: "Kanan" },
];

const LINK_LAYOUT_LABELS: Record<LinkLayout, string> = {
  list: "List (baris)",
  grid: "Grid (2 kolom)",
  compact: "Compact (rapat)",
};

const BUBBLE_STYLE_LABELS: Record<BubbleStyle, string> = {
  speech: "Speech",
  pill: "Pill",
  glass: "Glass",
  neon: "Neon",
  outline: "Outline",
  gradient: "Gradient",
  note: "Note",
  badge: "Badge",
  tiktok: "TikTok",
  instagram: "Instagram",
};

const BUBBLE_POSITION_LABELS: Record<BubblePosition, string> = {
  "top-left": "Atas kiri",
  "top-right": "Atas kanan",
  left: "Kiri",
  right: "Kanan",
  "bottom-left": "Bawah kiri",
  "bottom-right": "Bawah kanan",
};

// Key diturunkan dari label (hindari import value dari data.ts di client bundle).
const LINK_LAYOUT_KEYS = Object.keys(LINK_LAYOUT_LABELS) as LinkLayout[];
const BUBBLE_STYLE_KEYS = Object.keys(BUBBLE_STYLE_LABELS) as BubbleStyle[];
const BUBBLE_POSITION_KEYS = Object.keys(BUBBLE_POSITION_LABELS) as BubblePosition[];

// Sidebar: tiap kelompok punya "page" sendiri agar render ringan (tidak delay).
type NavKey =
  | "preview"
  | "profil"
  | "link"
  | "stack"
  | "story"
  | "bubble"
  | "tampilan"
  | "data"
  | "stats";

const NAV: { key: NavKey; label: string; icon: string }[] = [
  { key: "preview", label: "Preview", icon: "eye" },
  { key: "profil", label: "Profil & Tema", icon: "user" },
  { key: "link", label: "Link", icon: "link" },
  { key: "stack", label: "Stack & Team", icon: "sliders" },
  { key: "story", label: "Story", icon: "play" },
  { key: "bubble", label: "Gelembung", icon: "message" },
  { key: "tampilan", label: "Tampilan & SEO", icon: "image" },
  { key: "data", label: "Data", icon: "database" },
  { key: "stats", label: "Statistik", icon: "chart" },
];

const STORY_BGS = [
  "linear-gradient(135deg,#8b5cf6,#ec4899)",
  "linear-gradient(135deg,#0ea5e9,#22d3ee)",
  "linear-gradient(135deg,#f97316,#ef4444)",
  "linear-gradient(135deg,#10b981,#84cc16)",
  "linear-gradient(135deg,#1e293b,#475569)",
];

// Salinan TTL story (24 jam) untuk tampilan. Tidak import dari data.ts karena
// modul itu pakai fs (node-only) — AdminPanel adalah client component.
const STORY_TTL_MS = 24 * 60 * 60 * 1000;
function storyExpireLabel(createdAt: number) {
  return new Date(createdAt + STORY_TTL_MS).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type StatsResp = {
  analytics: {
    total: number;
    byDay: Record<string, number>;
    visits: { at: number; path: string; ref: string; ua: string }[];
    clicks: number;
    linkClicks: Record<string, { title: string; count: number }>;
    refs: Record<string, number>;
    devices: Record<string, number>;
  };
  server: {
    node: string;
    platform: string;
    uptimeSec: number;
    rssMB: number;
    heapMB: number;
    pid: number;
    time: string;
  };
};

const FONT_TARGETS: { key: keyof FontsConfig; label: string }[] = [
  { key: "name", label: "Nama" },
  { key: "handle", label: "Handle" },
  { key: "bio", label: "Bio" },
  { key: "linkTitle", label: "Judul Link" },
  { key: "linkLabel", label: "Label" },
  { key: "brand", label: "Branding" },
];

const SOCIAL_PLATFORMS: { key: keyof Socials; label: string; icon: string }[] = [
  { key: "instagram", label: "Instagram", icon: "instagram" },
  { key: "tiktok", label: "TikTok", icon: "tiktok" },
  { key: "youtube", label: "YouTube", icon: "youtube" },
  { key: "github", label: "GitHub", icon: "github" },
  { key: "x", label: "X / Twitter", icon: "x" },
  { key: "facebook", label: "Facebook", icon: "facebook" },
  { key: "linkedin", label: "LinkedIn", icon: "linkedin" },
  { key: "telegram", label: "Telegram", icon: "telegram" },
  { key: "whatsapp", label: "WhatsApp", icon: "whatsapp" },
  { key: "spotify", label: "Spotify", icon: "spotify" },
  { key: "discord", label: "Discord", icon: "link" },
  { key: "website", label: "Website", icon: "website" },
];

export default function AdminPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);

  const [store, setStore] = useState<Store | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null);

  // drafts
  const [profile, setProfile] = useState<Store["profile"] | null>(null);
  const [social, setSocial] = useState<Socials | null>(null);
  const [stack, setStack] = useState<StackItem[]>([]);
  const [stackAlign, setStackAlign] = useState<StackAlign>("right");
  const [linkLayout, setLinkLayout] = useState<LinkLayout>("list");
  const [bubble, setBubble] = useState<Bubble>({
    enabled: false,
    text: "",
    style: "speech",
    position: "top-right",
    color: "",
  });
  const [sections, setSections] = useState<Sections>({ stack: true, team: true });
  const [stories, setStories] = useState<Story[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [recId, setRecId] = useState<string | null>(null);
  const [recTime, setRecTime] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  const recChunksRef = useRef<BlobPart[]>([]);
  const recTimerRef = useRef<number | null>(null);
  const recStartRef = useRef(0);
  const [view, setView] = useState<NavKey>("profil");
  const [stats, setStats] = useState<StatsResp | null>(null);
  const [team, setTeam] = useState<Member[]>([]);
  const [linkShape, setLinkShape] = useState<LinkShape>("rounded");
  const [fonts, setFonts] = useState<FontsConfig | null>(null);
  const [seo, setSeo] = useState<SeoConfig | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // link editor
  const [editing, setEditing] = useState(false);
  const [linkForm, setLinkForm] = useState({
    title: "",
    url: "",
    icon: "link",
    gate: "rules",
    kind: "link",
  });
  const [saveBusy, setSaveBusy] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setAuthed(d.authenticated))
      .catch(() => setAuthed(false));
  }, []);

  async function loadData() {
    try {
      const r = await fetch("/api/admin");
      setLoadError("");
      if (r.status === 401) {
        setAuthed(false);
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      const d: Store = await r.json();
      setStore(d);
      setProfile(d.profile);
      setSocial(d.social);
      setStack(d.stack || []);
      setStackAlign(d.stackAlign || "right");
      setLinkLayout(d.linkLayout || "list");
      setBubble(
        d.bubble || { enabled: false, text: "", style: "speech", position: "top-right", color: "" }
      );
      setSections(d.sections || { stack: true, team: true });
      setTeam(d.team || []);
      setStories(d.stories || []);
      setLinkShape(d.linkShape || "rounded");
      setFonts(d.fonts);
      setSeo(d.seo);
      setBranding(d.branding);
      setTheme(d.theme);
    } catch {
      setLoadError("Data panel gagal dimuat. Periksa koneksi lalu coba lagi.");
    }
  }

  useEffect(() => {
    if (!authed) return;
    const t = setTimeout(() => void loadData(), 0);
    return () => clearTimeout(t);
  }, [authed]);

  // Ambil statistik (auto-refresh) saat membuka tab Statistik.
  useEffect(() => {
    if (!authed || view !== "stats") return;
    let alive = true;
    const pull = () =>
      fetch("/api/admin/stats")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: StatsResp | null) => {
          if (alive && d) setStats(d);
        })
        .catch(() => {});
    pull();
    const id = setInterval(pull, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [authed, view]);

  // ---- story helpers ----
  function addStory(type: "image" | "text" | "video" | "audio") {
    const st: Story = {
      id: crypto.randomUUID(),
      type,
      media: "",
      mediaPublicId: "",
      text: type === "text" ? "Story baru" : "",
      bg: STORY_BGS[0],
      duration: type === "audio" ? 15 : 5,
      createdAt: Date.now(),
      likes: 0,
      comments: [],
    };
    setStories((s) => [...s, st]);
  }

  // ---- rekam voice note (mic) ----
  async function startRecording(storyId: string) {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      flash("Browser tidak mendukung perekaman suara", false);
      return;
    }
    // Di pratinjau tertanam (iframe) browser memblokir mic tanpa dialog.
    // Kasih tahu biar buka di tab penuh supaya dialog izin Chrome muncul.
    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    if (inIframe) {
      flash(
        "Mic diblokir di pratinjau tertanam. Buka /admin di TAB BARU (bukan iframe) lalu pencet Rekam — dialog izin Chrome akan muncul.",
        false
      );
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recStreamRef.current = stream;
      recChunksRef.current = [];
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find(
        (m) => MediaRecorder.isTypeSupported(m)
      );
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data);
      };
      rec.onstart = () => {
        recStartRef.current = Date.now();
        setRecId(storyId);
        setRecTime(0);
        recTimerRef.current = window.setInterval(
          () => setRecTime(Math.round((Date.now() - recStartRef.current) / 1000)),
          250
        );
      };
      rec.onstop = () => {
        const type = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(recChunksRef.current, { type });
        const dur = Math.max(1, Math.round((Date.now() - recStartRef.current) / 1000));
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type });
        stream.getTracks().forEach((t) => t.stop());
        recStreamRef.current = null;
        if (recTimerRef.current) {
          clearInterval(recTimerRef.current);
          recTimerRef.current = null;
        }
        setRecId(null);
        setRecTime(0);
        if (blob.size > 0) void uploadStoryMedia(storyId, file, dur);
      };
      rec.start();
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        flash(
          "Izin mikrofon ditolak. Klik ikon kunci/gembok di address bar, izinkan Mikrofon, lalu pencet Rekam lagi. (Kalau masih gagal, pakai tombol Upload audio.)",
          false
        );
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        flash("Mikrofon tidak ditemukan di perangkat ini. Pakai tombol Upload audio.", false);
      } else {
        flash("Gagal mengakses mikrofon. Coba lagi atau pakai Upload audio.", false);
      }
    }
  }
  function stopRecording() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }
  function updateStory(id: string, patch: Partial<Story>) {
    setStories((s) => s.map((st) => (st.id === id ? { ...st, ...patch } : st)));
  }
  function removeStory(id: string) {
    setStories((s) => s.filter((st) => st.id !== id));
  }
  function moveStory(id: string, dir: -1 | 1) {
    setStories((s) => {
      const i = s.findIndex((x) => x.id === id);
      const t = i + dir;
      if (i < 0 || t < 0 || t >= s.length) return s;
      const next = [...s];
      [next[i], next[t]] = [next[t], next[i]];
      return next;
    });
  }

  function flash(msg: string, ok = true) {
    setNotice({ msg, ok });
    setTimeout(() => setNotice(null), 2600);
  }

  async function doLogin(password: string) {
    setBusy(true);
    setLoginError("");
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (r.ok) {
      setAuthed(true);
    } else {
      const d = await r.json().catch(() => ({}));
      setLoginError(d.error || "PIN salah");
      setPin("");
    }
  }

  function pushDigit(d: string) {
    setPin((p) => (p.length < 6 ? p + d : p));
  }

  // PIN 4 digit langsung masuk tanpa pencet tombol.
  useEffect(() => {
    if (authed || pin.length !== 4 || busy) return;
    const t = setTimeout(() => void doLogin(pin), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
    setPin("");
  }

  async function saveProfile() {
    if (!profile) return;
    setSaveBusy(true);
    const r = await fetch("/api/admin/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaveBusy(false);
    if (r.ok) flash("Profil disimpan");
    else flash("Gagal menyimpan profil", false);
  }

  // Preset tema: ubah aksen (profil) + mode (settings) sekaligus.
  async function applyThemePreset(p: (typeof THEME_PRESETS)[number]) {
    if (!profile) return;
    const nextProfile = { ...profile, accent: p.accent };
    setProfile(nextProfile);
    setTheme(p.mode);
    setSaveBusy(true);
    await fetch("/api/admin/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextProfile),
    });
    await saveSettings({ theme: p.mode });
    setSaveBusy(false);
  }

  async function saveSettings(patch: Partial<Store>) {
    const r = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (r.ok) {
      const d = await r.json();
      setStore(d);
      if (patch.social) setSocial(d.social);
      if (patch.stack) setStack(d.stack);
      if (patch.stackAlign) setStackAlign(d.stackAlign);
      if (patch.linkLayout) setLinkLayout(d.linkLayout);
      if (patch.bubble) setBubble(d.bubble);
      if (patch.stories) setStories(d.stories);
      if (patch.sections) setSections(d.sections);
      if (patch.team) setTeam(d.team);
      if (patch.linkShape) setLinkShape(d.linkShape);
      if (patch.seo) setSeo(d.seo);
      if (patch.fonts) setFonts(d.fonts);
      if (patch.branding) setBranding(d.branding);
      if (patch.theme) setTheme(d.theme);
      flash("Tersimpan");
    } else {
      flash("Gagal menyimpan pengaturan", false);
    }
  }

  // ---- links ----
  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkForm.title.trim() || !linkForm.url.trim()) return;
    setSaveBusy(true);
    const r = await fetch("/api/admin/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(linkForm),
    });
    if (r.ok) {
      const item = await r.json();
      setStore({ ...store!, links: [...store!.links, item] });
      setLinkForm({ title: "", url: "", icon: "link", gate: "rules", kind: "link" });
      setEditing(false);
      flash("Link ditambahkan");
    } else {
      flash("Gagal menambah link", false);
    }
    setSaveBusy(false);
  }

  async function updateLink(id: string, patch: Partial<LinkItem>) {
    const r = await fetch(`/api/admin/links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (r.ok) {
      const updated = await r.json();
      setStore({ ...store!, links: store!.links.map((l) => (l.id === id ? updated : l)) });
    } else {
      flash("Gagal mengubah link", false);
    }
  }

  async function deleteLink(id: string) {
    if (!confirm("Hapus link ini?")) return;
    const r = await fetch(`/api/admin/links/${id}`, { method: "DELETE" });
    if (r.ok) setStore({ ...store!, links: store!.links.filter((l) => l.id !== id) });
    else flash("Gagal menghapus link", false);
  }

  async function move(id: string, dir: -1 | 1) {
    const links = store!.links;
    const idx = links.findIndex((l) => l.id === id);
    const target = idx + dir;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[idx], next[target]] = [next[target], next[idx]];
    setStore({ ...store!, links: next });
    await fetch("/api/admin/links/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((l) => l.id) }),
    });
  }

  // ---- stack helpers ----
  function addStack(slug: string) {
    if (stack.some((s) => s.slug === slug)) return;
    const ic = getTechIcon(slug);
    if (!ic) return;
    setStack([
      ...stack,
      { id: crypto.randomUUID(), slug: ic.slug, title: ic.title, hex: ic.hex, path: ic.path },
    ]);
  }
  function removeStack(id: string) {
    setStack(stack.filter((s) => s.id !== id));
  }
  function moveStack(id: string, dir: -1 | 1) {
    const idx = stack.findIndex((s) => s.id === id);
    const t = idx + dir;
    if (idx < 0 || t < 0 || t >= stack.length) return;
    const next = [...stack];
    [next[idx], next[t]] = [next[t], next[idx]];
    setStack(next);
  }

  // ---- team helpers ----
  function addTeam() {
    setTeam([...team, { id: crypto.randomUUID(), name: "", role: "", avatar: "", url: "" }]);
  }
  function updateTeam(id: string, patch: Partial<Member>) {
    setTeam(team.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function removeTeam(id: string) {
    setTeam(team.filter((m) => m.id !== id));
  }
  function moveTeam(id: string, dir: -1 | 1) {
    const idx = team.findIndex((m) => m.id === id);
    const t = idx + dir;
    if (idx < 0 || t < 0 || t >= team.length) return;
    const next = [...team];
    [next[idx], next[t]] = [next[t], next[idx]];
    setTeam(next);
  }

  // ---- backup / restore / reset ----
  async function reloadData() {
    await loadData();
    setPreviewKey((k) => k + 1);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bio-link-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    flash("Backup diunduh");
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      flash("File JSON tidak valid", false);
      return;
    }
    setSaveBusy(true);
    const r = await fetch("/api/admin/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    setSaveBusy(false);
    if (!r.ok) {
      flash("Impor gagal", false);
      return;
    }
    await reloadData();
    flash("Backup dipulihkan");
  }

  async function handleReset() {
    setSaveBusy(true);
    const r = await fetch("/api/admin/reset", { method: "POST" });
    setSaveBusy(false);
    setConfirmReset(false);
    if (!r.ok) {
      flash("Reset gagal", false);
      return;
    }
    await reloadData();
    flash("Data direset ke bawaan");
  }

  // ---- image upload helper ----
  async function upload(folder: string, file: File): Promise<string | null> {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", folder);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      flash(d.error || "Upload gagal", false);
      return null;
    }
    return d.url;
  }

  // Upload LANGSUNG ke Cloudinary (browser -> Cloudinary) pakai XHR agar bisa
  // memantau progres. Dipakai untuk story foto/video: file besar tak lewat
  // function, jadi video tidak kena limit body serverless.
  async function uploadDirect(
    folder: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<{ url: string; publicId: string; resourceType: string }> {
    const sr = await fetch("/api/upload/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder }),
    });
    const s = await sr.json().catch(() => ({}));
    if (!sr.ok || !s.cloudName) {
      throw new Error(s.error || "Gagal menyiapkan upload (Cloudinary?)");
    }
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.set("file", file);
      fd.set("folder", s.folder);
      fd.set("timestamp", String(s.timestamp));
      fd.set("api_key", s.apiKey);
      fd.set("signature", s.signature);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        let d: {
          secure_url?: string;
          public_id?: string;
          resource_type?: string;
          error?: { message?: string };
        } = {};
        try {
          d = JSON.parse(xhr.responseText);
        } catch {
          /* ignore */
        }
        if (xhr.status >= 200 && xhr.status < 300 && d.secure_url) {
          resolve({
            url: d.secure_url,
            publicId: d.public_id || "",
            resourceType: d.resource_type || "image",
          });
        } else {
          reject(new Error(d.error?.message || `Upload gagal (HTTP ${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error("Koneksi upload terputus"));
      xhr.ontimeout = () => reject(new Error("Upload memakan waktu terlalu lama"));
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${s.cloudName}/auto/upload`);
      xhr.send(fd);
    });
  }

  // Bungkus upload story: atur state progres + flash hasil.
  async function uploadStoryMedia(storyId: string, file: File, durationSec?: number) {
    setUploadingId(storyId);
    setUploadPct(0);
    try {
      const res = await uploadDirect("bio-link/story", file, (p) => setUploadPct(p));
      updateStory(storyId, {
        media: res.url,
        mediaPublicId: res.publicId,
        mediaResourceType:
          res.resourceType === "video" || res.resourceType === "raw"
            ? res.resourceType
            : "image",
        ...(durationSec ? { duration: Math.max(1, Math.round(durationSec)) } : {}),
      });
      flash("Upload selesai");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Upload gagal", false);
    } finally {
      setUploadingId(null);
      setUploadPct(0);
    }
  }

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <Spinner />
      </div>
    );
  }

  // ============ LOGIN (PIN) ============
  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pin.length >= 4) void doLogin(pin);
          }}
          className="relative w-full max-w-[340px] rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-md"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <Icon name="lock" className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-white">Panel Admin</h1>
            <p className="mt-1 text-sm text-white/50">Masukkan PIN untuk masuk</p>
          </div>

          {/* PIN dots */}
          <div className="mb-5 flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-3.5 w-3.5 rounded-full transition ${
                  pin.length > i ? "bg-violet-400" : "bg-white/15"
                }`}
              />
            ))}
          </div>
          {loginError && (
            <p className="mb-3 flex items-center justify-center gap-2 text-center text-sm text-rose-400">
              <Icon name="alert" className="h-4 w-4" />
              {loginError}
            </p>
          )}

          {/* numeric keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => pushDigit(n)}
                className="rounded-2xl border border-white/10 bg-white/[0.03] py-4 text-xl font-semibold text-white transition hover:bg-white/[0.08] active:scale-95"
              >
                {n}
              </button>
            ))}
            <div />
            <button
              type="button"
              onClick={() => pushDigit("0")}
              className="rounded-2xl border border-white/10 bg-white/[0.03] py-4 text-xl font-semibold text-white transition hover:bg-white/[0.08] active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin((p) => p.slice(0, -1))}
              className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] py-4 text-white/60 transition hover:bg-white/[0.08] active:scale-95"
              aria-label="Hapus digit"
            >
              <Icon name="delete" className="h-5 w-5" />
            </button>
          </div>

          {busy && (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-white/50">
              <Spinner small /> Memverifikasi…
            </p>
          )}

          {/* tombol masuk kecil di pojok kanan bawah (fallback PIN > 4 digit) */}
          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={busy || pin.length < 4}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:text-white disabled:opacity-30"
            >
              Masuk
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-white/25">Akses dibatasi · pemilik saja</p>
        </form>
      </main>
    );
  }

  if (loadError && !store) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
            <Icon name="alert" className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-semibold">Panel gagal dimuat</h1>
          <p className="mt-2 text-sm text-white/50">{loadError}</p>
          <button onClick={() => void loadData()} className={btnCls + " mt-5"}>
            <span className="flex items-center gap-2">
              <Icon name="refresh" className="h-4 w-4" /> Coba lagi
            </span>
          </button>
        </div>
      </main>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <Spinner />
      </div>
    );
  }

  // ============ DASHBOARD ============
  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <Icon name="link" className="h-4 w-4" />
            </div>
            <span className="font-semibold text-white">Bio Link Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:text-white"
            >
              Lihat halaman <Icon name="external" className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:text-white"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {notice && (
        <div
          className={`fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur ${
            notice.ok
              ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
              : "border-rose-400/30 bg-rose-500/15 text-rose-300"
          }`}
        >
          <Icon name={notice.ok ? "link" : "alert"} className="h-4 w-4" />
          {notice.msg}
        </div>
      )}

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8">
        {/* SIDEBAR */}
        <aside className="sticky top-20 hidden h-fit w-56 shrink-0 md:block">
          <nav className="space-y-1 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            {NAV.map((n) => (
              <button
                key={n.key}
                type="button"
                onClick={() => setView(n.key)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                  view === n.key
                    ? "bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                <Icon name={n.icon} className="h-4 w-4" />
                {n.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          {/* nav mobile */}
          <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
            {NAV.map((n) => (
              <button
                key={n.key}
                type="button"
                onClick={() => setView(n.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                  view === n.key
                    ? "border-violet-400/60 bg-violet-500/15 text-white"
                    : "border-white/10 bg-white/5 text-white/55"
                }`}
              >
                <Icon name={n.icon} className="h-3.5 w-3.5" />
                {n.label}
              </button>
            ))}
          </div>

          {view === "preview" && (
            <>
        {/* PREVIEW LIVE */}
        <Section
          title="Preview Halaman"
          sub="Pratinjau langsung halaman bio sesuai data tersimpan."
          right={
            <button
              onClick={() => setPreviewKey((k) => k + 1)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:text-white"
            >
              <Icon name="refresh" className="h-3.5 w-3.5" /> Muat ulang
            </button>
          }
        >
          <div className="flex justify-center rounded-2xl border border-white/10 bg-black/30 p-3 sm:p-5">
            <iframe
              key={previewKey}
              src="/"
              title="Preview halaman bio"
              className="h-[80vh] max-h-[900px] min-h-[620px] w-full max-w-[460px] rounded-2xl border border-white/10"
            />
          </div>
        </Section>

            </>
          )}

          {view === "profil" && (
            <>
        {/* THEME */}
        <Section title="Theme" sub="Mode gelap/terang + preset warna siap pakai">
          <div className="flex rounded-xl border border-white/10 p-1">
            <button
              onClick={() => saveSettings({ theme: "dark" })}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm transition ${
                theme === "dark" ? "bg-white/10 text-white" : "text-white/40"
              }`}
            >
              <Icon name="moon" className="h-4 w-4" /> Dark
            </button>
            <button
              onClick={() => saveSettings({ theme: "light" })}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm transition ${
                theme === "light" ? "bg-white/10 text-white" : "text-white/40"
              }`}
            >
              <Icon name="sun" className="h-4 w-4" /> Light
            </button>
          </div>

          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-white/40">
            Preset tema
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {THEME_PRESETS.map((p) => {
              const active = profile?.accent === p.accent && theme === p.mode;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyThemePreset(p)}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                    active
                      ? "border-violet-400/70 bg-violet-500/15"
                      : "border-white/10 bg-white/5 hover:border-white/30"
                  }`}
                >
                  <span
                    className="h-7 w-7 shrink-0 rounded-full ring-1 ring-white/20"
                    style={{ background: p.accent }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-white">{p.name}</span>
                    <span className="block text-[10px] uppercase tracking-wide text-white/40">
                      {p.mode}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* PROFILE */}
        <Section title="Profil" sub="Identitas halaman bio">
          {profile && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nama">
                  <input className={inputCls} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </Field>
                <Field label="Handle">
                  <input className={inputCls} value={profile.handle} onChange={(e) => setProfile({ ...profile, handle: e.target.value })} />
                </Field>
              </div>
              <Field label="Bio">
                <textarea className={inputCls + " resize-none"} rows={2} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
              </Field>
              <AvatarCropField
                value={profile.avatar}
                pos={profile.avatarPos || "50% 50%"}
                onChange={(v) => setProfile({ ...profile, avatar: v })}
                onPosChange={(p) => setProfile({ ...profile, avatarPos: p })}
                onUpload={upload}
              />
              <ImageField
                label="Banner"
                value={profile.banner}
                onChange={(v) => setProfile({ ...profile, banner: v })}
                onUpload={upload}
                folder="bio-link/banner"
              />

              <Field label="Bentuk avatar">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-9">
                  {SHAPES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      title={s.label}
                      onClick={() => setProfile({ ...profile, shape: s.key })}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${
                        profile.shape === s.key
                          ? "border-violet-400/70 bg-violet-500/20"
                          : "border-white/10 bg-white/5 hover:border-white/30"
                      }`}
                    >
                      <span className={`block h-7 w-7 overflow-hidden bg-gradient-to-br from-violet-400 to-fuchsia-500 shape-${s.key}`} />
                      <span className="text-[10px] text-white/60">{s.label}</span>
                    </button>
                  ))}
                </div>
              </Field>

              {profile.shape === "custom" && (
                <Field
                  label="Gambar bentuk bebas"
                  hint="Gambar bentuk apa saja di kotak dengan mouse/jari, lalu klik “Simpan bentuk”. Tanpa batasan."
                >
                  <ShapeDrawField
                    value={profile.customShape || ""}
                    onSave={(path) => setProfile({ ...profile, customShape: path })}
                  />
                </Field>
              )}

              <Field label="Warna aksen">
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((c) => (
                    <button key={c} type="button" onClick={() => setProfile({ ...profile, accent: c })}
                      className={`h-9 w-9 rounded-full transition ${profile.accent === c ? "ring-2 ring-white ring-offset-2 ring-offset-black" : ""}`}
                      style={{ background: c }} />
                  ))}
                  <input type="color" value={profile.accent} onChange={(e) => setProfile({ ...profile, accent: e.target.value })}
                    className="h-9 w-9 cursor-pointer rounded-full border border-white/10 bg-transparent" title="Custom" />
                </div>
              </Field>
              <button onClick={saveProfile} disabled={saveBusy} className={btnCls}>
                {saveBusy ? "Menyimpan…" : "Simpan Profil"}
              </button>
            </div>
          )}
        </Section>

            </>
          )}

          {view === "bubble" && (
            <>
        {/* GELEMBUNG PESAN */}
        <Section title="Gelembung Pesan" sub="Bubble teks di samping foto profil, tampil untuk semua orang">
          <div className="space-y-4">
            <label className="inline-flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={bubble.enabled}
                onChange={(e) => saveSettings({ bubble: { ...bubble, enabled: e.target.checked } })}
                className="h-4 w-4 accent-violet-500"
              />
              Tampilkan gelembung pesan
            </label>

            <Field label="Isi pesan">
              <input
                className={inputCls}
                value={bubble.text}
                maxLength={140}
                placeholder="Contoh: Halo! Selamat datang"
                onChange={(e) => setBubble({ ...bubble, text: e.target.value })}
                onBlur={() => saveSettings({ bubble })}
              />
            </Field>

            <Field label="Gaya bubble">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {BUBBLE_STYLE_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => saveSettings({ bubble: { ...bubble, style: k } })}
                    className={`rounded-xl border px-3 py-2 text-sm transition ${
                      bubble.style === k
                        ? "border-violet-400/70 bg-violet-500/15 text-white"
                        : "border-white/10 bg-white/5 text-white/50 hover:border-white/30"
                    }`}
                  >
                    {BUBBLE_STYLE_LABELS[k]}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Posisi bubble">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {BUBBLE_POSITION_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => saveSettings({ bubble: { ...bubble, position: k } })}
                    className={`rounded-xl border px-3 py-2 text-sm transition ${
                      bubble.position === k
                        ? "border-violet-400/70 bg-violet-500/15 text-white"
                        : "border-white/10 bg-white/5 text-white/50 hover:border-white/30"
                    }`}
                  >
                    {BUBBLE_POSITION_LABELS[k]}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Warna bubble">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
                  <input
                    type="color"
                    value={bubble.color || profile?.accent || "#8b5cf6"}
                    onChange={(e) => setBubble({ ...bubble, color: e.target.value })}
                    onBlur={() => saveSettings({ bubble })}
                    className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  Pilih warna
                </label>
                {["#8b5cf6", "#ec4899", "#22d3ee", "#10b981", "#f97316", "#ef4444", "#ffffff", "#111111"].map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => saveSettings({ bubble: { ...bubble, color: c } })}
                      className="h-8 w-8 rounded-full border border-white/20 transition hover:scale-110"
                      style={{ background: c }}
                      aria-label={`Warna ${c}`}
                    />
                  )
                )}
                <button
                  type="button"
                  onClick={() => saveSettings({ bubble: { ...bubble, color: "" } })}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 hover:text-white"
                >
                  Ikut aksen
                </button>
              </div>
            </Field>

            <p className="text-xs text-white/35">
              Warna dipakai untuk gaya umum (speech, pill, neon, dll). Gaya TikTok/Instagram punya warna khas sendiri. Lihat hasilnya di Preview Halaman (klik “Muat ulang”).
            </p>
          </div>
        </Section>

            </>
          )}

          {view === "link" && (
            <>
        <Section title="Tampilan Link" sub="Gaya sudut + tata letak tombol link di halaman publik">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LINK_SHAPES.map((s) => {
                const radius = { pill: 9999, rounded: 16, soft: 24, square: 10 }[s.key];
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => saveSettings({ linkShape: s.key })}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition ${
                      linkShape === s.key
                        ? "border-violet-400/70 bg-violet-500/15"
                        : "border-white/10 bg-white/5 hover:border-white/30"
                    }`}
                  >
                    <span
                      className="h-8 w-full bg-gradient-to-r from-violet-500/70 to-fuchsia-500/70"
                      style={{ borderRadius: radius }}
                    />
                    <span className="text-xs text-white/70">{s.label}</span>
                  </button>
                );
              })}
            </div>

            <Field label="Tata letak daftar link">
              <div className="grid grid-cols-3 gap-2">
                {LINK_LAYOUT_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => saveSettings({ linkLayout: k })}
                    className={`rounded-xl border px-3 py-2.5 text-sm transition ${
                      linkLayout === k
                        ? "border-violet-400/70 bg-violet-500/15 text-white"
                        : "border-white/10 bg-white/5 text-white/50 hover:border-white/30"
                    }`}
                  >
                    {LINK_LAYOUT_LABELS[k]}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Section>

        {/* LINKS */}
        <Section title="Link" sub="Daftar tombol di halaman bio" right={<span className="text-sm text-white/40">{store.links.length} link</span>}>
          {store.links.length === 0 && !editing ? (
            <EmptyState
              icon="inbox"
              title="Belum ada link"
              sub="Tambahkan link pertama biar halaman tidak kosong."
              actionLabel="Tambah Link"
              onAction={() => setEditing(true)}
            />
          ) : (
            <div className="space-y-2">
              {store.links.map((l, i) => (
                <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/70">
                    <Icon name={l.icon} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-medium text-white ${!l.enabled ? "line-through opacity-50" : ""}`}>{l.title}</p>
                    <p className="truncate text-xs text-white/40">
                      {l.url}
                      {l.kind && l.kind !== "link" && <span className="ml-1 text-[10px] uppercase text-violet-300">· {l.kind}</span>}
                      {l.gate === "rules" && (
                        <span className="ml-1 inline-flex items-center gap-1 text-[10px] uppercase text-amber-300">
                          · <Icon name="lock" className="h-3 w-3" /> gate
                        </span>
                      )}
                    </p>
                  </div>
                  <IconBtn onClick={() => move(l.id, -1)} disabled={i === 0} title="Naik"><MoveUpIcon /></IconBtn>
                  <IconBtn onClick={() => move(l.id, 1)} disabled={i === store.links.length - 1} title="Turun"><MoveDownIcon /></IconBtn>
                  <IconBtn onClick={() => updateLink(l.id, { enabled: !l.enabled })} title={l.enabled ? "Sembunyikan" : "Tampilkan"} color={l.enabled ? "text-emerald-400" : "text-white/30"}><EyeIcon /></IconBtn>
                  <IconBtn onClick={() => deleteLink(l.id)} title="Hapus" color="text-rose-400/70"><TrashIcon /></IconBtn>
                </div>
              ))}
            </div>
          )}

          {!editing ? (
            store.links.length > 0 && (
              <button onClick={() => setEditing(true)} className="mt-4 w-full rounded-2xl border border-dashed border-white/15 py-3 font-medium text-white/60 transition hover:border-white/30 hover:text-white">
                + Tambah Link
              </button>
            )
          ) : (
            <form onSubmit={addLink} className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Judul">
                  <input className={inputCls} value={linkForm.title} onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })} placeholder="Mis. Join Group" autoFocus />
                </Field>
                <Field label="URL">
                  <input className={inputCls} value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="https://…" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Tipe">
                  <Dropdown
                    value={linkForm.kind}
                    onChange={(v) => setLinkForm({ ...linkForm, kind: v as typeof linkForm.kind })}
                    options={[
                      { value: "link", label: "Link biasa" },
                      { value: "join_group", label: "Join Grup" },
                      { value: "channel", label: "Link Saluran" },
                    ]}
                  />
                </Field>
                <Field label="Gate (wajib baca rules)">
                  <Dropdown
                    value={linkForm.gate}
                    onChange={(v) => setLinkForm({ ...linkForm, gate: v as typeof linkForm.gate })}
                    options={[
                      { value: "rules", label: "Aktifkan gate" },
                      { value: "none", label: "Tanpa gate" },
                    ]}
                  />
                </Field>
              </div>
              <Field label="Ikon">
                <div className="flex flex-wrap gap-2">
                  {ICON_KEYS.map((k) => (
                    <button key={k} type="button" onClick={() => setLinkForm({ ...linkForm, icon: k })}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${linkForm.icon === k ? "border-violet-400/60 bg-violet-500/20 text-white" : "border-white/10 bg-white/5 text-white/50 hover:text-white"}`}
                      title={k}>
                      <Icon name={k} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </Field>
              <div className="flex gap-2">
                <button type="submit" disabled={saveBusy} className={btnCls}>{saveBusy ? "Menyimpan…" : "Simpan"}</button>
                <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-medium text-white/60 transition hover:text-white">Batal</button>
              </div>
            </form>
          )}
        </Section>

        {/* SOSIAL */}
        <Section
          title="Sosial Media"
          sub="Data tersimpan & dikembalikan API. Catatan: baris sosmed tidak lagi ditampilkan di halaman publik (sesuai permintaan) — bagian ini untuk mengelola datanya saja."
        >
          {social && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SOCIAL_PLATFORMS.map((pl) => (
                  <div key={pl.key} className="flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/60">
                      <Icon name={pl.icon} className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <label className="text-[11px] uppercase tracking-wider text-white/35">{pl.label}</label>
                      <input
                        className={inputCls}
                        value={social[pl.key]}
                        placeholder="https://…"
                        onChange={(e) => setSocial({ ...social, [pl.key]: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => saveSettings({ social })} className={btnCls + " mt-4"}>
                Simpan Sosial
              </button>
            </>
          )}
        </Section>

            </>
          )}

          {view === "stack" && (
            <>
        {/* STACK / KEAHLIAN */}
        <Section
          title="Stack / Keahlian"
          sub="Logo teknologi asli yang tampil tumpuk-tindih di halaman. Pilih dari daftar."
          right={<span className="text-sm text-white/40">{stack.length} dipilih</span>}
        >
          <div className="space-y-4">
            <Field label="Tampilkan stack di halaman">
              <label className="inline-flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={sections.stack}
                  onChange={(e) => saveSettings({ sections: { ...sections, stack: e.target.checked } })}
                  className="h-4 w-4 accent-violet-500"
                />
                Matikan untuk menyembunyikan seksi keahlian di halaman publik
              </label>
            </Field>

            <Field label="Posisi stack di halaman">
              <div className="flex rounded-xl border border-white/10 p-1">
                {STACK_ALIGNS.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => saveSettings({ stackAlign: a.key })}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition ${
                      stackAlign === a.key ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </Field>

            {stack.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {stack.map((s, i) => {
                  const ic = getTechIcon(s.slug);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 py-1.5 pl-1.5 pr-0.5"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                        {ic ? (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                            <path d={ic.path} fill={ic.hex} />
                          </svg>
                        ) : (
                          <Icon name="link" className="h-3.5 w-3.5 text-black/50" />
                        )}
                      </span>
                      <span className="text-xs text-white/70">{ic?.title || s.slug}</span>
                      <IconBtn onClick={() => moveStack(s.id, -1)} disabled={i === 0} title="Geser kiri">
                        <MoveLeftIcon />
                      </IconBtn>
                      <IconBtn
                        onClick={() => moveStack(s.id, 1)}
                        disabled={i === stack.length - 1}
                        title="Geser kanan"
                      >
                        <MoveRightIcon />
                      </IconBtn>
                      <IconBtn onClick={() => removeStack(s.id)} title="Hapus" color="text-rose-400/70">
                        <TrashIcon />
                      </IconBtn>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-white/40">
                Belum ada stack. Tambahkan dari daftar di bawah.
              </p>
            )}

            <Field label="Tambah dari daftar">
              <div className="flex flex-wrap gap-1.5">
                {STACK_OPTIONS.map((o) => {
                  const added = stack.some((s) => s.slug === o.slug);
                  return (
                    <button
                      key={o.slug}
                      type="button"
                      disabled={added}
                      onClick={() => addStack(o.slug)}
                      title={added ? `${o.title} sudah dipilih` : `Tambah ${o.title}`}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                        added
                          ? "border-violet-400/50 bg-violet-500/20 opacity-50"
                          : "border-white/10 bg-white hover:border-white/40"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                        <path d={o.path} fill={o.hex} />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </Field>
            <button onClick={() => saveSettings({ stack })} className={btnCls}>
              Simpan Stack
            </button>
          </div>
        </Section>

        {/* TEAM & CONTRIBUTOR */}
        <Section
          title="Team & Contributor"
          sub="Avatar bulat sejajar yang tampil di bawah link."
          right={
            <button
              onClick={addTeam}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:text-white"
            >
              + Tambah
            </button>
          }
        >
          <div className="space-y-3">
            <label className="inline-flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={sections.team}
                onChange={(e) => saveSettings({ sections: { ...sections, team: e.target.checked } })}
                className="h-4 w-4 accent-violet-500"
              />
              Tampilkan seksi team di halaman
            </label>

            {team.length === 0 && (
              <p className="text-sm text-white/40">Belum ada anggota. Klik “+ Tambah”.</p>
            )}
            {team.map((m, i) => (
              <div key={m.id} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-start gap-3">
                  <MemberAvatar
                    value={m.avatar}
                    name={m.name}
                    onChange={(v) => updateTeam(m.id, { avatar: v })}
                    onUpload={upload}
                  />
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      className={inputCls}
                      placeholder="Nama"
                      value={m.name}
                      onChange={(e) => updateTeam(m.id, { name: e.target.value })}
                    />
                    <input
                      className={inputCls}
                      placeholder="Role (mis. Founder)"
                      value={m.role}
                      onChange={(e) => updateTeam(m.id, { role: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    className={inputCls}
                    placeholder="Link profil (opsional) https://…"
                    value={m.url}
                    onChange={(e) => updateTeam(m.id, { url: e.target.value })}
                  />
                  <IconBtn onClick={() => moveTeam(m.id, -1)} disabled={i === 0} title="Naik">
                    <MoveUpIcon />
                  </IconBtn>
                  <IconBtn
                    onClick={() => moveTeam(m.id, 1)}
                    disabled={i === team.length - 1}
                    title="Turun"
                  >
                    <MoveDownIcon />
                  </IconBtn>
                  <IconBtn onClick={() => removeTeam(m.id)} title="Hapus" color="text-rose-400/70">
                    <TrashIcon />
                  </IconBtn>
                </div>
              </div>
            ))}
            {team.length > 0 && (
              <button onClick={() => saveSettings({ team })} className={btnCls}>
                Simpan Team
              </button>
            )}
          </div>
        </Section>

            </>
          )}

          {view === "story" && (
            <>
        <Section
          title="Story"
          sub="Story muncul di ring foto profil. Klik foto profil di halaman bio untuk menonton (full screen, bisa like & komen)."
          right={
            <div className="flex gap-2">
              <button
                onClick={() => addStory("image")}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:text-white"
              >
                + Foto
              </button>
              <button
                onClick={() => addStory("text")}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:text-white"
              >
                + Teks
              </button>
              <button
                onClick={() => addStory("video")}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:text-white"
              >
                + Video
              </button>
              <button
                onClick={() => addStory("audio")}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:text-white"
              >
                + Voice note
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            {stories.length === 0 && (
              <p className="text-sm text-white/40">
                Belum ada story. Tambah story foto, teks, atau video di atas. Story otomatis
                terhapus setelah 24 jam.
              </p>
            )}
            {stories.map((st, i) => (
              <div key={st.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 p-1 text-center text-[10px] font-semibold text-white"
                    style={{
                      background: st.type === "text" ? st.bg || "#333" : "#000",
                    }}
                  >
                    {st.type === "image" && st.media ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={st.media} alt="" className="h-full w-full object-cover" />
                    ) : st.type === "video" && st.media ? (
                      <video
                        src={st.media}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                      />
                    ) : st.type === "audio" ? (
                      <span className="flex flex-col items-center gap-1 leading-tight">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-6 w-6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
                        </svg>
                        {st.media ? `${st.duration}s` : "Kosong"}
                      </span>
                    ) : (
                      <span className="leading-tight">
                        {st.type === "video" ? "Video" : st.text || "Story"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {st.type === "audio" ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          {recId === st.id ? (
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/50 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200"
                            >
                              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
                              Stop ({recTime}s)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startRecording(st.id)}
                              disabled={uploadingId === st.id}
                              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:text-white disabled:opacity-40"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
                              </svg>
                              Rekam suara
                            </button>
                          )}
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:text-white">
                            <Icon name="play" className="h-3.5 w-3.5" />
                            {st.media ? "Ganti audio" : "Upload audio"}
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                void uploadStoryMedia(st.id, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                        {uploadingId === st.id && (
                          <div className="space-y-1">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width]"
                                style={{ width: `${uploadPct}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-white/50">
                              Mengupload... {uploadPct}%
                            </p>
                          </div>
                        )}
                        {st.media && <audio src={st.media} controls className="h-9 w-full" />}
                        <input
                          className={inputCls}
                          value={st.text}
                          placeholder="Caption (opsional)"
                          maxLength={280}
                          onChange={(e) => updateStory(st.id, { text: e.target.value })}
                        />
                      </>
                    ) : st.type !== "text" ? (
                      <>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:text-white">
                          <Icon
                            name={st.type === "video" ? "play" : "image"}
                            className="h-3.5 w-3.5"
                          />
                          {st.media
                            ? st.type === "video"
                              ? "Ganti video"
                              : "Ganti foto"
                            : st.type === "video"
                              ? "Upload video"
                              : "Upload foto"}
                          <input
                            type="file"
                            accept={st.type === "video" ? "video/*" : "image/*"}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              void uploadStoryMedia(st.id, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {uploadingId === st.id && (
                          <div className="space-y-1">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width]"
                                style={{ width: `${uploadPct}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-white/50">
                              Mengupload... {uploadPct}%
                            </p>
                          </div>
                        )}
                        <input
                          className={inputCls}
                          value={st.text}
                          placeholder="Caption (opsional)"
                          maxLength={280}
                          onChange={(e) => updateStory(st.id, { text: e.target.value })}
                        />
                      </>
                    ) : (
                      <>
                        <textarea
                          className={inputCls}
                          value={st.text}
                          rows={2}
                          maxLength={280}
                          placeholder="Tulis story teks..."
                          onChange={(e) => updateStory(st.id, { text: e.target.value })}
                        />
                        <div className="flex flex-wrap gap-2">
                          {STORY_BGS.map((bg) => (
                            <button
                              key={bg}
                              type="button"
                              onClick={() => updateStory(st.id, { bg })}
                              className={`h-7 w-7 rounded-full border ${
                                st.bg === bg ? "border-white" : "border-white/20"
                              }`}
                              style={{ background: bg }}
                              aria-label="Warna latar story"
                            />
                          ))}
                        </div>
                      </>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-white/45">
                      {st.type !== "video" && (
                        <label className="flex items-center gap-1.5">
                          Durasi
                          <input
                            type="number"
                            min={1}
                            max={120}
                            value={st.duration}
                            onChange={(e) =>
                              updateStory(st.id, {
                                duration: Math.max(
                                  1,
                                  Math.min(120, Number(e.target.value) || 5)
                                ),
                              })
                            }
                            className="w-16 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-white"
                          />
                          dtk
                        </label>
                      )}
                      <span className="inline-flex items-center gap-1">{st.likes} like</span>
                      <span className="inline-flex items-center gap-1">
                        {st.comments?.length || 0} komen
                      </span>
                      <span className="inline-flex items-center gap-1 text-amber-300/70">
                        Auto-hapus: {storyExpireLabel(st.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      onClick={() => moveStory(st.id, -1)}
                      disabled={i === 0}
                      className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/60 disabled:opacity-30"
                      aria-label="Naik"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveStory(st.id, 1)}
                      disabled={i === stories.length - 1}
                      className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/60 disabled:opacity-30"
                      aria-label="Turun"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeStory(st.id)}
                      className="rounded-md border border-rose-500/30 px-2 py-1 text-xs text-rose-300"
                      aria-label="Hapus story"
                    >
                      <Icon name="delete" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => saveSettings({ stories })} disabled={saveBusy} className={btnCls}>
                Simpan Story
              </button>
              <button
                onClick={() => setPreviewKey((k) => k + 1)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-white/70 transition hover:text-white"
              >
                Refresh preview
              </button>
            </div>
          </div>
        </Section>
            </>
          )}

          {view === "tampilan" && (
            <>
        {/* FONTS */}
        <Section title="Gaya Font" sub="Font tiap elemen teks di halaman">
          {fonts && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {FONT_TARGETS.map((t) => (
                  <Field key={t.key} label={t.label}>
                    <Dropdown
                      value={fonts[t.key]}
                      onChange={(v) => setFonts({ ...fonts, [t.key]: v })}
                      options={FONT_KEYS.map((k) => ({
                        value: k,
                        label: FONTS[k]?.label ?? k,
                        style: { fontFamily: fontCss(k) },
                      }))}
                    />
                    <div
                      className="mt-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-2xl font-bold text-white"
                      style={{ fontFamily: fontCss(fonts[t.key]) }}
                    >
                      Aa Bb Cc 123
                    </div>
                  </Field>
                ))}
              </div>
              <button onClick={() => saveSettings({ fonts })} className={btnCls + " mt-4"}>Simpan Font</button>
            </>
          )}
        </Section>

        {/* SEO */}
        <Section title="SEO & OpenGraph" sub="Judul tab, deskripsi, favicon, banner share">
          {seo && (
            <div className="space-y-4">
              <Field label="Judul halaman (tab)"><input className={inputCls} value={seo.title} onChange={(e) => setSeo({ ...seo, title: e.target.value })} /></Field>
              <Field label="Deskripsi"><input className={inputCls} value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} /></Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ImageField label="Favicon" value={seo.favicon} onChange={(v) => setSeo({ ...seo, favicon: v })} onUpload={upload} folder="bio-link/favicon" />
                <ImageField label="OG Banner" value={seo.ogImage} onChange={(v) => setSeo({ ...seo, ogImage: v })} onUpload={upload} folder="bio-link/og" />
              </div>
              <Field label="URL Rules (untuk gate)" hint="Biarkan default https://rules.xyc.my.id/ agar gate menampilkan halaman aturan">
                <input className={inputCls} value={seo.rulesUrl} onChange={(e) => setSeo({ ...seo, rulesUrl: e.target.value })} />
              </Field>
              <button onClick={() => saveSettings({ seo })} className={btnCls}>Simpan SEO</button>
            </div>
          )}
        </Section>

        {/* BRANDING */}
        <Section title="Branding" sub="Kredit di footer halaman">
          {branding && (
            <div className="space-y-3">
              <label className="flex items-center gap-3 text-sm text-white/70">
                <input type="checkbox" checked={branding.enabled} onChange={(e) => setBranding({ ...branding, enabled: e.target.checked })} className="h-4 w-4 accent-violet-500" />
                Tampilkan branding di footer
              </label>
              <Field label="Teks branding">
                <input className={inputCls} value={branding.text} onChange={(e) => setBranding({ ...branding, text: e.target.value })} />
              </Field>
              <button onClick={() => saveSettings({ branding })} className={btnCls}>Simpan Branding</button>
            </div>
          )}
        </Section>

            </>
          )}

          {view === "stats" && (
            <>
        <Section title="Statistik Pengunjung" sub="Total kunjungan, aktivitas harian, info server, dan riwayat.">
          {!stats ? (
            <p className="text-sm text-white/40">Memuat statistik...</p>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Total kunjungan" value={stats.analytics.total} />
                <StatCard label="Hari ini" value={todayCount(stats.analytics.byDay)} />
                <StatCard label="7 hari terakhir" value={last7Total(stats.analytics.byDay)} />
                <StatCard label="Total klik link" value={stats.analytics.clicks || 0} />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-white/80">Grafik 7 hari</p>
                <WeekChart byDay={stats.analytics.byDay} />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-white/80">
                  Link paling sering diklik
                </p>
                <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  {topLinks(stats.analytics.linkClicks).length === 0 ? (
                    <p className="text-xs text-white/40">
                      Belum ada klik tercatat. Klik link di halaman bio untuk mulai menghitung.
                    </p>
                  ) : (
                    topLinks(stats.analytics.linkClicks).map((l, i) => (
                      <BarRow
                        key={l.id}
                        label={`${i + 1}. ${l.title}`}
                        value={l.count}
                        max={topLinks(stats.analytics.linkClicks)[0]?.count || 1}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold text-white/80">Sumber kunjungan</p>
                  <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    {topEntries(stats.analytics.refs).length === 0 ? (
                      <p className="text-xs text-white/40">Belum ada data.</p>
                    ) : (
                      topEntries(stats.analytics.refs).map(([host, n]) => (
                        <BarRow
                          key={host}
                          label={host}
                          value={n}
                          max={topEntries(stats.analytics.refs)[0]?.[1] || 1}
                        />
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-white/80">Perangkat</p>
                  <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    {topEntries(stats.analytics.devices).length === 0 ? (
                      <p className="text-xs text-white/40">Belum ada data.</p>
                    ) : (
                      topEntries(stats.analytics.devices).map(([dev, n]) => (
                        <BarRow
                          key={dev}
                          label={DEVICE_LABELS[dev] || dev}
                          value={n}
                          max={topEntries(stats.analytics.devices)[0]?.[1] || 1}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-white/80">Info server</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <InfoRow label="Node" value={stats.server.node} />
                  <InfoRow label="Platform" value={stats.server.platform} />
                  <InfoRow
                    label="Uptime"
                    value={`${Math.floor(stats.server.uptimeSec / 60)}m ${stats.server.uptimeSec % 60}s`}
                  />
                  <InfoRow label="Memori (RSS)" value={`${stats.server.rssMB} MB`} />
                  <InfoRow label="Heap terpakai" value={`${stats.server.heapMB} MB`} />
                  <InfoRow label="PID" value={String(stats.server.pid)} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-white/80">Riwayat kunjungan terbaru</p>
                <div className="max-h-64 overflow-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-black/50 text-white/50">
                      <tr>
                        <th className="px-3 py-2 font-medium">Waktu</th>
                        <th className="px-3 py-2 font-medium">Referrer</th>
                        <th className="px-3 py-2 font-medium">User agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.analytics.visits.slice(0, 50).map((v, i) => (
                        <tr key={i} className="border-t border-white/5">
                          <td className="whitespace-nowrap px-3 py-2 text-white/60">
                            {new Date(v.at).toLocaleString("id-ID")}
                          </td>
                          <td className="px-3 py-2 text-white/50">{v.ref ? shortHost(v.ref) : "—"}</td>
                          <td className="max-w-[240px] truncate px-3 py-2 text-white/40">{v.ua || "—"}</td>
                        </tr>
                      ))}
                      {stats.analytics.visits.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-center text-white/40">
                            Belum ada kunjungan tercatat.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Section>
            </>
          )}

          {view === "data" && (
            <>
        <Section title="Data" sub="Backup, restore, dan reset seluruh isi panel">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-white/80 transition hover:text-white"
            >
              Unduh backup (JSON)
            </button>
            <label className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-white/80 transition hover:text-white">
              Impor backup
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  handleImport(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {confirmReset ? (
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saveBusy}
                  className="rounded-xl bg-rose-600 px-4 py-2.5 font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
                >
                  Ya, reset semua
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 font-semibold text-white/70 transition hover:text-white"
                >
                  Batal
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 font-semibold text-rose-200 transition hover:bg-rose-500/20"
              >
                Reset ke bawaan
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-white/35">
            Backup berisi seluruh pengaturan, link, stack, team, dan story. Mengimpor backup akan menimpa data saat ini.
          </p>
        </Section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/* ================= UI primitives ================= */

function last7series(byDay: Record<string, number>) {
  const out: { key: string; label: string; count: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    out.push({
      key,
      label: d.toLocaleDateString("id-ID", { weekday: "short" }),
      count: byDay[key] || 0,
    });
  }
  return out;
}
function todayCount(byDay: Record<string, number>) {
  return byDay[new Date().toISOString().slice(0, 10)] || 0;
}
function last7Total(byDay: Record<string, number>) {
  return last7series(byDay).reduce((a, b) => a + b.count, 0);
}
function shortHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url.slice(0, 40);
  }
}

// Urutkan map {key: count} jadi daftar menurun, ambil n teratas.
function topEntries(map: Record<string, number> | undefined, n = 8) {
  return Object.entries(map || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

// Link paling sering diklik, diurut menurun.
function topLinks(
  map: Record<string, { title: string; count: number }> | undefined,
  n = 10
) {
  return Object.entries(map || {})
    .map(([id, v]) => ({ id, title: v.title || id, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

const DEVICE_LABELS: Record<string, string> = {
  mobile: "Mobile",
  desktop: "Desktop",
  tablet: "Tablet",
  bot: "Bot/crawler",
};

// Baris bar horisontal sederhana buat distribusi (link/referrer/device).
function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="truncate text-white/70">{label}</span>
        <span className="shrink-0 tabular-nums text-white/50">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="truncate text-sm text-white/80">{value}</p>
    </div>
  );
}

function WeekChart({ byDay }: { byDay: Record<string, number> }) {
  const series = last7series(byDay);
  const max = Math.max(1, ...series.map((s) => s.count));
  return (
    <div className="flex items-end gap-2">
      {series.map((d) => (
        <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-24 w-full items-end">
            <div
              className="w-full rounded-t bg-gradient-to-t from-violet-500 to-fuchsia-500"
              style={{ height: `${Math.max(4, Math.round((d.count / max) * 100))}%` }}
            />
          </div>
          <span className="text-[10px] text-white/40">{d.label}</span>
          <span className="text-[10px] text-white/60">{d.count}</span>
        </div>
      ))}
    </div>
  );
}


const inputCls =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-white placeholder-white/30 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20";
const btnCls =
  "rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 font-semibold text-white transition enabled:hover:from-violet-400 enabled:hover:to-fuchsia-400 disabled:opacity-60";

function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-white/20 border-t-white ${
        small ? "h-4 w-4" : "h-8 w-8"
      }`}
      aria-label="Memuat"
    />
  );
}

function ShapeDrawField({
  value,
  onSave,
}: {
  value: string;
  onSave: (path: string) => void;
}) {
  const SIZE = 240;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ptsRef = useRef<{ x: number; y: number }[]>([]);
  const drawingRef = useRef(false);
  const [saved, setSaved] = useState(false);

  const paintStroke = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((SIZE / 4) * i, 0);
      ctx.lineTo((SIZE / 4) * i, SIZE);
      ctx.moveTo(0, (SIZE / 4) * i);
      ctx.lineTo(SIZE, (SIZE / 4) * i);
      ctx.stroke();
    }
    const pts = ptsRef.current;
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = "rgba(139,92,246,0.30)";
      ctx.fill();
      ctx.strokeStyle = "rgba(167,139,250,0.95)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ptsRef.current = [];
    paintStroke();
    if (value) {
      try {
        const p2d = new Path2D(value);
        ctx.save();
        ctx.scale(SIZE, SIZE);
        ctx.fillStyle = "rgba(139,92,246,0.30)";
        ctx.fill(p2d);
        ctx.strokeStyle = "rgba(167,139,250,0.95)";
        ctx.lineWidth = 2 / SIZE;
        ctx.stroke(p2d);
        ctx.restore();
      } catch {
        /* path tak valid: abaikan */
      }
    }
  }, [value, paintStroke]);

  function posOf(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * SIZE,
      y: ((e.clientY - r.top) / r.height) * SIZE,
    };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    setSaved(false);
    ptsRef.current = [posOf(e)];
    paintStroke();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    ptsRef.current.push(posOf(e));
    paintStroke();
  }
  function end() {
    drawingRef.current = false;
  }
  function buildPath() {
    const pts = ptsRef.current;
    if (pts.length < 3) return "";
    const step = Math.max(1, Math.floor(pts.length / 100));
    const sampled = pts.filter((_, i) => i % step === 0);
    const norm = sampled.map(
      (p) => `${(p.x / SIZE).toFixed(4)} ${(p.y / SIZE).toFixed(4)}`
    );
    return `M ${norm.join(" L ")} Z`;
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="w-full max-w-[240px] touch-none rounded-xl border border-white/15 bg-black/40"
        style={{ aspectRatio: "1 / 1" }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const p = buildPath();
            if (p) {
              onSave(p);
              setSaved(true);
            }
          }}
          className={btnCls}
        >
          Simpan bentuk
        </button>
        <button
          type="button"
          onClick={() => {
            ptsRef.current = [];
            paintStroke();
            setSaved(false);
          }}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:text-white"
        >
          Hapus gambar
        </button>
        {saved && <span className="text-xs text-emerald-300">Bentuk tersimpan</span>}
      </div>
    </div>
  );
}

function Section({ title, sub, right, children }: {
  title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          {sub && <p className="text-sm text-white/45">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider text-white/40">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-white/30">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function EmptyState({ icon, title, sub, actionLabel, onAction }: {
  icon: string; title: string; sub: string; actionLabel: string; onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white/40">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-3 font-medium text-white/80">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-white/40">{sub}</p>
      <button onClick={onAction} className={btnCls + " mt-4"}>{actionLabel}</button>
    </div>
  );
}

/* Dropdown kustom — pengganti <select> native biar konsisten sama tema. */
function Dropdown({ value, options, onChange }: {
  value: string;
  options: { value: string; label: string; style?: React.CSSProperties }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={inputCls + " flex items-center justify-between gap-2 text-left"}
      >
        <span style={current?.style}>{current?.label ?? value}</span>
        <Icon name="chevron" className={`h-4 w-4 shrink-0 text-white/40 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-white/10 bg-[#15151d] p-1 shadow-2xl"
        >
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  o.value === value ? "bg-violet-500/20 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
                style={o.style}
              >
                {o.label}
                {o.value === value && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-violet-300" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, disabled, title, color = "text-white/40" }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`rounded-lg p-1.5 transition hover:bg-white/10 hover:text-white disabled:opacity-20 ${color}`}
    >
      {children}
    </button>
  );
}

function ImageField({ label, value, onChange, onUpload, folder }: {
  label: string; value: string; onChange: (v: string) => void;
  onUpload: (folder: string, file: File) => Promise<string | null>; folder: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await onUpload(folder, file);
    setUploading(false);
    if (url) onChange(url);
    e.target.value = "";
  }

  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={optImg(value, { w: 120, h: 120, crop: "fill" })} alt={label} className="h-10 w-10 shrink-0 rounded-lg border border-white/10 object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/30">
            <Icon name="image" className="h-4 w-4" />
          </div>
        )}
        <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… atau upload" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm transition hover:border-white/25 hover:text-white disabled:opacity-50">
          {uploading ? <Spinner small /> : <Icon name="image" className="h-4 w-4" />}
          {uploading ? "Mengupload…" : "Upload"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </Field>
  );
}

/* Avatar + crop: upload/pilih foto lalu geser di dalam lingkaran untuk
   menentukan bagian mana yang ditampilkan (object-position). */
function AvatarCropField({ value, pos, onChange, onPosChange, onUpload }: {
  value: string;
  pos: string;
  onChange: (v: string) => void;
  onPosChange: (p: string) => void;
  onUpload: (folder: string, file: File) => Promise<string | null>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  function posFromEvent(e: React.PointerEvent) {
    const el = circleRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = clamp(((e.clientX - r.left) / r.width) * 100);
    const y = clamp(((e.clientY - r.top) / r.height) * 100);
    onPosChange(`${x}% ${y}%`);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await onUpload("bio-link/avatar", file);
    setUploading(false);
    if (url) onChange(url);
    e.target.value = "";
  }

  return (
    <Field
      label="Foto Profil"
      hint="Upload/pilih foto, lalu geser di dalam lingkaran untuk menyesuaikan bagian yang ditampilkan."
    >
      <div className="flex flex-wrap items-center gap-4">
        <div
          ref={circleRef}
          onPointerDown={(e) => {
            if (!value) return;
            setDragging(true);
            e.currentTarget.setPointerCapture?.(e.pointerId);
            posFromEvent(e);
          }}
          onPointerMove={(e) => {
            if (dragging && value) posFromEvent(e);
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          className={`relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 ${
            value ? "cursor-move touch-none" : ""
          }`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={optImg(value, { w: 240, h: 240, crop: "fill" })}
              alt="Preview foto profil"
              draggable={false}
              className="pointer-events-none h-full w-full object-cover"
              style={{ objectPosition: pos }}
            />
          ) : (
            <Icon name="image" className="h-6 w-6 text-white/30" />
          )}
        </div>
        <div className="flex min-w-[220px] flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              className={inputCls}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://… atau upload"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm transition hover:border-white/25 hover:text-white disabled:opacity-50"
            >
              {uploading ? <Spinner small /> : <Icon name="image" className="h-4 w-4" />}
              {uploading ? "…" : "Upload"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
          {value && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">Posisi: {pos}</span>
              <button
                type="button"
                onClick={() => onPosChange("50% 50%")}
                className="text-xs text-violet-300 transition hover:underline"
              >
                Reset tengah
              </button>
            </div>
          )}
        </div>
      </div>
    </Field>
  );
}

/* Avatar bulat kecil untuk anggota team (upload cepat). */
function MemberAvatar({ value, name, onChange, onUpload }: {
  value: string;
  name: string;
  onChange: (v: string) => void;
  onUpload: (folder: string, file: File) => Promise<string | null>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await onUpload("bio-link/team", file);
    setUploading(false);
    if (url) onChange(url);
    e.target.value = "";
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Upload foto anggota"
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 text-white/40 transition hover:border-white/35"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={optImg(value, { w: 120, h: 120, crop: "fill" })}
            alt={name || "anggota"}
            className="h-full w-full object-cover"
          />
        ) : uploading ? (
          <Spinner small />
        ) : (
          <Icon name="image" className="h-5 w-5" />
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function MoveLeftIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m4-4-4 4 4 4" /></svg>;
}
function MoveRightIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-4-4 4 4-4 4" /></svg>;
}
function MoveUpIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5m-4 4 4-4 4 4" /></svg>;
}
function MoveDownIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m4-4-4 4-4-4" /></svg>;
}
function EyeIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>;
}
function TrashIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>;
}
