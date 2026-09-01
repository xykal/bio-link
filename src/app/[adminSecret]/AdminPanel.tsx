"use client";

import { useEffect, useState } from "react";
import { Icon, ICON_KEYS } from "@/components/Icons";
import type { LinkItem, Profile } from "@/lib/data";

const ACCENTS = ["#8b5cf6", "#06b6d4", "#f43f5e", "#f59e0b", "#22c55e", "#ec4899", "#3b82f6"];

export default function AdminPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [notice, setNotice] = useState("");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", icon: "link" });
  const [saveBusy, setSaveBusy] = useState(false);

  const [profDraft, setProfDraft] = useState<Profile | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setAuthed(d.authenticated))
      .catch(() => setAuthed(false));
  }, []);

  async function loadData() {
    const r = await fetch("/api/admin");
    if (r.status === 401) {
      setAuthed(false);
      return;
    }
    const d = await r.json();
    setProfile(d.profile);
    setProfDraft(d.profile);
    setLinks(d.links);
  }

  useEffect(() => {
    if (authed) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  function flash(msg: string) {
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
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (r.ok) {
      setAuthed(true);
    } else {
      const d = await r.json().catch(() => ({}));
      setLoginError(d.error || "Login gagal");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) return;
    setSaveBusy(true);
    const r = await fetch("/api/admin/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      const item = await r.json();
      setLinks([...links, item]);
      setForm({ title: "", url: "", icon: "link" });
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
      setLinks(links.map((l) => (l.id === id ? updated : l)));
    }
  }

  async function deleteLink(id: string) {
    if (!confirm("Hapus link ini?")) return;
    const r = await fetch(`/api/admin/links/${id}`, { method: "DELETE" });
    if (r.ok) setLinks(links.filter((l) => l.id !== id));
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = links.findIndex((l) => l.id === id);
    const target = idx + dir;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[idx], next[target]] = [next[target], next[idx]];
    setLinks(next);
    await fetch("/api/admin/links/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((l) => l.id) }),
    });
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profDraft) return;
    setSaveBusy(true);
    const r = await fetch("/api/admin/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profDraft),
    });
    if (r.ok) {
      const p = await r.json();
      setProfile(p);
      setProfDraft(p);
      flash("Profil disimpan ✓");
    }
    setSaveBusy(false);
  }

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <form
            onSubmit={handleLogin}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-md"
          >
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                <Icon name="link" className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-white">Panel Admin</h1>
              <p className="mt-1 text-sm text-white/50">Login untuk mengelola bio-link</p>
            </div>

            <label className="text-xs font-medium uppercase tracking-wider text-white/50">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20"
              autoFocus
            />
            {loginError && <p className="mt-2 text-sm text-rose-400">{loginError}</p>}

            <button
              type="submit"
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 font-semibold text-white transition hover:from-violet-400 hover:to-fuchsia-400 disabled:opacity-60"
            >
              {busy ? "Memuat…" : "Masuk"}
            </button>
            <p className="mt-4 text-center text-xs text-white/30">
              Akses dibatasi. Hubungi pemilik untuk password.
            </p>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
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

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-4 font-semibold text-white">Profil</h2>
          {profDraft && (
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nama">
                  <input
                    className={inputCls}
                    value={profDraft.name}
                    onChange={(e) => setProfDraft({ ...profDraft, name: e.target.value })}
                  />
                </Field>
                <Field label="Handle">
                  <input
                    className={inputCls}
                    value={profDraft.handle}
                    onChange={(e) => setProfDraft({ ...profDraft, handle: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Bio">
                <textarea
                  className={inputCls + " resize-none"}
                  rows={2}
                  value={profDraft.bio}
                  onChange={(e) => setProfDraft({ ...profDraft, bio: e.target.value })}
                />
              </Field>
              <Field label="URL Avatar (opsional)">
                <input
                  className={inputCls}
                  value={profDraft.avatar}
                  placeholder="https://…"
                  onChange={(e) => setProfDraft({ ...profDraft, avatar: e.target.value })}
                />
              </Field>
              <Field label="Warna aksen">
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setProfDraft({ ...profDraft, accent: c })}
                      className={`h-9 w-9 rounded-full transition ${
                        profDraft.accent === c
                          ? "ring-2 ring-white ring-offset-2 ring-offset-black"
                          : ""
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={profDraft.accent}
                    onChange={(e) => setProfDraft({ ...profDraft, accent: e.target.value })}
                    className="h-9 w-9 cursor-pointer rounded-full border border-white/10 bg-transparent"
                    title="Custom warna"
                  />
                </div>
              </Field>
              <button type="submit" disabled={saveBusy} className={btnCls}>
                {saveBusy ? "Menyimpan…" : "Simpan Profil"}
              </button>
            </form>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Link</h2>
            <span className="text-sm text-white/40">{links.length} link</span>
          </div>

          {links.length === 0 && !editing && (
            <p className="py-6 text-center text-white/40">
              Belum ada link. Tambahkan link pertama kamu di bawah. 👇
            </p>
          )}

          <div className="space-y-2">
            {links.map((l, i) => (
              <div
                key={l.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/70">
                  <Icon name={l.icon} className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate font-medium text-white ${
                      !l.enabled ? "line-through opacity-50" : ""
                    }`}
                  >
                    {l.title}
                  </p>
                  <p className="truncate text-xs text-white/40">{l.url}</p>
                </div>
                <button
                  onClick={() => move(l.id, -1)}
                  disabled={i === 0}
                  className="rounded-lg p-1.5 text-white/40 transition enabled:hover:bg-white/10 enabled:hover:text-white disabled:opacity-20"
                  title="Naik"
                >
                  <MoveUpIcon />
                </button>
                <button
                  onClick={() => move(l.id, 1)}
                  disabled={i === links.length - 1}
                  className="rounded-lg p-1.5 text-white/40 transition enabled:hover:bg-white/10 enabled:hover:text-white disabled:opacity-20"
                  title="Turun"
                >
                  <MoveDownIcon />
                </button>
                <button
                  onClick={() => updateLink(l.id, { enabled: !l.enabled })}
                  className={`rounded-lg p-1.5 transition hover:bg-white/10 ${
                    l.enabled ? "text-emerald-400" : "text-white/30"
                  }`}
                  title={l.enabled ? "Nonaktifkan" : "Aktifkan"}
                >
                  <EyeIcon />
                </button>
                <button
                  onClick={() => deleteLink(l.id)}
                  className="rounded-lg p-1.5 text-rose-400/70 transition hover:bg-rose-500/10 hover:text-rose-400"
                  title="Hapus"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="mt-4 w-full rounded-2xl border border-dashed border-white/15 py-3 font-medium text-white/60 transition hover:border-white/30 hover:text-white"
            >
              + Tambah Link
            </button>
          ) : (
            <form
              onSubmit={addLink}
              className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Judul">
                  <input
                    className={inputCls}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Mis. Instagram"
                    autoFocus
                  />
                </Field>
                <Field label="URL">
                  <input
                    className={inputCls}
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://…"
                  />
                </Field>
              </div>
              <Field label="Ikon">
                <div className="flex flex-wrap gap-2">
                  {ICON_KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setForm({ ...form, icon: k })}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                        form.icon === k
                          ? "border-violet-400/60 bg-violet-500/20 text-white"
                          : "border-white/10 bg-white/5 text-white/50 hover:text-white"
                      }`}
                      title={k}
                    >
                      <Icon name={k} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </Field>
              <div className="flex gap-2">
                <button type="submit" disabled={saveBusy} className={btnCls}>
                  {saveBusy ? "…" : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-medium text-white/60 transition hover:text-white"
                >
                  Batal
                </button>
              </div>
            </form>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider text-white/40">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function MoveUpIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5m-4 4 4-4 4 4" />
    </svg>
  );
}
function MoveDownIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14m4-4-4 4-4-4" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
