"use client";

import { useEffect, useRef, useState } from "react";
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
  LinkShape,
  StackAlign,
  Sections,
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
  const [sections, setSections] = useState<Sections>({ stack: true, team: true });
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
      setSections(d.sections || { stack: true, team: true });
      setTeam(d.team || []);
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

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
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
              className="h-[660px] w-full max-w-[380px] rounded-2xl border border-white/10"
            />
          </div>
        </Section>

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

        {/* BENTUK TOMBOL LINK */}
        <Section title="Bentuk Tombol Link" sub="Gaya sudut tombol link di halaman publik">
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
            Backup berisi seluruh pengaturan, link, stack, dan team. Mengimpor backup akan menimpa data saat ini.
          </p>
        </Section>
      </div>
    </main>
  );
}

/* ================= UI primitives ================= */

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
