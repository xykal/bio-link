"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, ICON_KEYS } from "@/components/Icons";
import { FONT_KEYS, FONTS } from "@/lib/fonts";
import type {
  Store,
  LinkItem,
  Socials,
  FontsConfig,
  SeoConfig,
  Branding,
  ProfileShape,
} from "@/lib/data";

const SHAPES: { key: ProfileShape; label: string; icon: string }[] = [
  { key: "circle", label: "Circle", icon: "●" },
  { key: "squircle", label: "Squircle", icon: "▢" },
  { key: "rounded", label: "Rounded", icon: "▣" },
  { key: "blob", label: "Blob", icon: "✦" },
  { key: "hexagon", label: "Hexagon", icon: "⬡" },
  { key: "star", label: "Star", icon: "★" },
  { key: "heart", label: "Heart", icon: "♥" },
];

const ACCENTS = ["#8b5cf6", "#06b6d4", "#f43f5e", "#f59e0b", "#22c55e", "#ec4899", "#3b82f6", "#0ea5e9", "#a855f7"];
const SOCIAL_KEYS: (keyof Socials)[] = [
  "instagram", "tiktok", "youtube", "github", "x", "facebook",
  "linkedin", "telegram", "whatsapp", "spotify", "discord", "website",
];
const FONT_TARGETS: { key: keyof FontsConfig; label: string }[] = [
  { key: "name", label: "Nama" },
  { key: "handle", label: "Handle" },
  { key: "bio", label: "Bio" },
  { key: "linkTitle", label: "Judul Link" },
  { key: "linkLabel", label: "Label Link" },
  { key: "brand", label: "Branding" },
];

export default function AdminPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);

  const [store, setStore] = useState<Store | null>(null);
  const [notice, setNotice] = useState("");

  // drafts
  const [profile, setProfile] = useState<Store["profile"] | null>(null);
  const [social, setSocial] = useState<Socials | null>(null);
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

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setAuthed(d.authenticated))
      .catch(() => setAuthed(false));
  }, []);

  async function loadData() {
    const r = await fetch("/api/admin");
    if (r.status === 401) return setAuthed(false);
    const d: Store = await r.json();
    setStore(d);
    setProfile(d.profile);
    setSocial(d.social);
    setFonts(d.fonts);
    setSeo(d.seo);
    setBranding(d.branding);
    setTheme(d.theme);
  }

  useEffect(() => {
    if (authed) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  function flash(msg: string, ok = true) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2500);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLoginError("");
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pin }),
    });
    setBusy(false);
    if (r.ok) setAuthed(true);
    else {
      const d = await r.json().catch(() => ({}));
      setLoginError(d.error || "PIN salah");
      setPin("");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
    setPin("");
  }

  async function saveProfile() {
    if (!profile) return;
    setSaveBusy(true);
    await fetch("/api/admin/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaveBusy(false);
    flash("Profil disimpan ✓");
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
      if (patch.seo) setSeo(d.seo);
      if (patch.fonts) setFonts(d.fonts);
      if (patch.branding) setBranding(d.branding);
      if (patch.theme) setTheme(d.theme);
      flash("Tersimpan ✓");
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
      flash("Link ditambahkan ✓");
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
    }
  }

  async function deleteLink(id: string) {
    if (!confirm("Hapus link ini?")) return;
    const r = await fetch(`/api/admin/links/${id}`, { method: "DELETE" });
    if (r.ok) setStore({ ...store!, links: store!.links.filter((l) => l.id !== id) });
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

  // ---- image upload helper ----
  async function upload(folder: string, file: File): Promise<string | null> {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", folder);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await r.json();
    if (!r.ok) {
      alert(d.error || "Upload gagal");
      return null;
    }
    return d.url;
  }

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  // ============ LOGIN (PIN) ============
  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-[340px] rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-md"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <Icon name="link" className="h-7 w-7" />
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
          {loginError && <p className="mb-3 text-center text-sm text-rose-400">{loginError}</p>}

          {/* numeric keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => pin.length < 4 && setPin(pin + n)}
                className="rounded-2xl border border-white/10 bg-white/[0.03] py-4 text-xl font-semibold text-white transition hover:bg-white/[0.08] active:scale-95"
              >
                {n}
              </button>
            ))}
            <div />
            <button
              type="button"
              onClick={() => setPin(pin + "0")}
              className="rounded-2xl border border-white/10 bg-white/[0.03] py-4 text-xl font-semibold text-white transition hover:bg-white/[0.08] active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin(pin.slice(0, -1))}
              className="rounded-2xl border border-white/10 bg-white/[0.03] py-4 text-white/60 transition hover:bg-white/[0.08] active:scale-95"
              aria-label="hapus"
            >
              ⌫
            </button>
          </div>

          <button
            type="submit"
            disabled={busy || pin.length < 4}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 font-semibold text-white transition hover:from-violet-400 hover:to-fuchsia-400 disabled:opacity-40"
          >
            {busy ? "Memuat…" : "Masuk"}
          </button>
          <p className="mt-4 text-center text-xs text-white/25">Akses dibatasi · pemilik saja</p>
        </form>
      </main>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
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
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:text-white"
            >
              Lihat halaman ↗
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
        <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-300 backdrop-blur">
          {notice}
        </div>
      )}

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {/* THEME toggle */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Theme</h2>
              <p className="text-sm text-white/45">Pilih warna tema halaman</p>
            </div>
            <div className="flex rounded-xl border border-white/10 p-1">
              <button
                onClick={() => saveSettings({ theme: "dark" })}
                className={`rounded-lg px-4 py-1.5 text-sm transition ${
                  theme === "dark" ? "bg-white/10 text-white" : "text-white/40"
                }`}
              >
                🌙 Dark
              </button>
              <button
                onClick={() => saveSettings({ theme: "light" })}
                className={`rounded-lg px-4 py-1.5 text-sm transition ${
                  theme === "light" ? "bg-white/10 text-white" : "text-white/40"
                }`}
              >
                ☀️ Light
              </button>
            </div>
          </div>
        </section>

        {/* PROFILE */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-4 font-semibold text-white">Profil</h2>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ImageField label="Avatar (upload)" value={profile.avatar} onChange={(v) => setProfile({ ...profile, avatar: v })} onUpload={upload} folder="bio-link/avatar" />
                <ImageField label="Banner" value={profile.banner} onChange={(v) => setProfile({ ...profile, banner: v })} onUpload={upload} folder="bio-link/banner" />
              </div>
              <Field label="Bentuk avatar">
                <div className="flex flex-wrap gap-2">
                  {SHAPES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      title={s.label}
                      onClick={() => setProfile({ ...profile, shape: s.key })}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition ${
                        profile.shape === s.key
                          ? "border-violet-400/70 bg-violet-500/20 text-white"
                          : "border-white/10 bg-white/5 text-white/50 hover:text-white"
                      }`}
                    >
                      {s.icon}
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
              <button onClick={saveProfile} disabled={saveBusy} className={btnCls}>{saveBusy ? "…" : "Simpan Profil"}</button>
            </div>
          )}
        </section>

        {/* SOCIAL */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-4 font-semibold text-white">Sosial Media</h2>
          {social && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SOCIAL_KEYS.map((k) => (
                  <Field key={k} label={kLabel(k)}>
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60">
                        <Icon name={k} className="h-4 w-4" />
                      </span>
                      <input className={inputCls} value={social[k] || ""} placeholder="https://…"
                        onChange={(e) => setSocial({ ...social, [k]: e.target.value })} />
                    </div>
                  </Field>
                ))}
              </div>
              <button onClick={() => saveSettings({ social })} className={btnCls}>Simpan Sosmed</button>
            </div>
          )}
        </section>

        {/* LINKS */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Link</h2>
            <span className="text-sm text-white/40">{store.links.length} link</span>
          </div>

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
                    {l.kind && l.kind !== "link" && <span className="ml-1 text-[10px] uppercase text-violet-300"> · {l.kind}</span>}
                    {l.gate === "rules" && <span className="ml-1 text-[10px] uppercase text-amber-300"> · gate</span>}
                  </p>
                </div>
                <IconBtn onClick={() => move(l.id, -1)} disabled={i === 0} title="Naik"><MoveUpIcon /></IconBtn>
                <IconBtn onClick={() => move(l.id, 1)} disabled={i === store.links.length - 1} title="Turun"><MoveDownIcon /></IconBtn>
                <IconBtn onClick={() => updateLink(l.id, { enabled: !l.enabled })} title="Toggle" color={l.enabled ? "text-emerald-400" : "text-white/30"}><EyeIcon /></IconBtn>
                <IconBtn onClick={() => deleteLink(l.id)} title="Hapus" color="text-rose-400/70"><TrashIcon /></IconBtn>
              </div>
            ))}
          </div>

          {!editing ? (
            <button onClick={() => setEditing(true)} className="mt-4 w-full rounded-2xl border border-dashed border-white/15 py-3 font-medium text-white/60 transition hover:border-white/30 hover:text-white">
              + Tambah Link
            </button>
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
                  <select className={inputCls} value={linkForm.kind} onChange={(e) => setLinkForm({ ...linkForm, kind: e.target.value as any })}>
                    <option value="link">Link biasa</option>
                    <option value="join_group">Join Grup</option>
                    <option value="channel">Link Saluran</option>
                  </select>
                </Field>
                <Field label="Gate (wajib baca rules)">
                  <select className={inputCls} value={linkForm.gate} onChange={(e) => setLinkForm({ ...linkForm, gate: e.target.value as any })}>
                    <option value="rules">Aktifkan gate</option>
                    <option value="none">Tanpa gate</option>
                  </select>
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
                <button type="submit" disabled={saveBusy} className={btnCls}>{saveBusy ? "…" : "Simpan"}</button>
                <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-medium text-white/60 transition hover:text-white">Batal</button>
              </div>
            </form>
          )}
        </section>

        {/* FONTS */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-4 font-semibold text-white">Gaya Font</h2>
          {fonts && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FONT_TARGETS.map((t) => (
                <Field key={t.key} label={t.label}>
                  <select className={inputCls} value={fonts[t.key]} onChange={(e) => setFonts({ ...fonts, [t.key]: e.target.value })}>
                    {FONT_KEYS.map((k) => (
                      <option key={k} value={k}>{(FONTS[k] as any).label}</option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
          )}
          {fonts && <button onClick={() => saveSettings({ fonts })} className={btnCls + " mt-4"}>Simpan Font</button>}
        </section>

        {/* SEO */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-4 font-semibold text-white">SEO & OpenGraph</h2>
          {seo && (
            <div className="space-y-4">
              <Field label="Judul halaman (tab)"><input className={inputCls} value={seo.title} onChange={(e) => setSeo({ ...seo, title: e.target.value })} /></Field>
              <Field label="Deskripsi"><input className={inputCls} value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} /></Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ImageField label="Favicon" value={seo.favicon} onChange={(v) => setSeo({ ...seo, favicon: v })} onUpload={upload} folder="bio-link/favicon" />
                <ImageField label="OG Banner" value={seo.ogImage} onChange={(v) => setSeo({ ...seo, ogImage: v })} onUpload={upload} folder="bio-link/og" />
              </div>
              <Field label="URL Rules (untuk gate)"><input className={inputCls} value={seo.rulesUrl} onChange={(e) => setSeo({ ...seo, rulesUrl: e.target.value })} /></Field>
              <button onClick={() => saveSettings({ seo })} className={btnCls}>Simpan SEO</button>
            </div>
          )}
        </section>

        {/* BRANDING */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-4 font-semibold text-white">Branding</h2>
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
        </section>
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-white placeholder-white/30 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20";
const btnCls =
  "rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 font-semibold text-white transition enabled:hover:from-violet-400 enabled:hover:to-fuchsia-400 disabled:opacity-60";

function kLabel(k: string) {
  return k[0].toUpperCase() + k.slice(1);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider text-white/40">{label}</label>
      <div className="mt-1.5">{children}</div>
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
          <img src={value} alt={label} className="h-10 w-10 shrink-0 rounded-lg border border-white/10 object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/30">
            <Icon name="link" className="h-4 w-4" />
          </div>
        )}
        <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… atau upload" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm transition hover:border-white/25 hover:text-white disabled:opacity-50">
          {uploading ? "↻" : "Upload"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </Field>
  );
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
