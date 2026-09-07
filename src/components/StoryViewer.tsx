"use client";

// Story viewer: overlay layar penuh ala IG (progress per story, long-press
// jeda, voice note + wave, video, like, komentar realtime). Dipecah dari
// BioPage agar kode ini hanya diunduh saat story dibuka — initial bundle
// halaman tetap ringan. Chunk di-prefetch BioPage saat idle.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Store } from "@/lib/data";
import type { PublicData } from "./BioPage";

function waveBars(id: string, n = 28): number[] {
  let x = 2166136261;
  for (let i = 0; i < id.length; i++) {
    x ^= id.charCodeAt(i);
    x = Math.imul(x, 16777619) >>> 0;
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;
    x >>>= 0;
    out.push(6 + (x % 21));
  }
  return out;
}
function fmtTime(s: number): string {
  const t = Math.max(0, Math.round(s || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

type Stats = {
  id: string;
  likes: number;
  comments: { id: string; name: string; text: string; at: number }[];
};

export default function StoryViewer({
  data,
  viewed,
  liked,
  visitorId,
  visitorName,
  onNameChange,
  onSeen,
  onLike,
  onStats,
  onPatchStory,
  onClose,
}: {
  data: PublicData;
  viewed: Record<string, boolean>;
  liked: Record<string, boolean>;
  visitorId: string;
  visitorName: string;
  onNameChange: (name: string) => void;
  onSeen: (id?: string) => void;
  onLike: (id: string) => void;
  onStats: (stats: Stats[]) => void;
  onPatchStory: (
    storyId: string,
    patch: (st: Store["stories"][number]) => Store["stories"][number]
  ) => void;
  onClose: () => void;
}) {

  const [storyIndex, setStoryIndex] = useState<number | null>(
    0 // selalu mulai dari story pertama (dulu: openStory -> setStoryIndex(0))
  );
  const [storyProgress, setStoryProgress] = useState(0);
  const [paused, setPaused] = useState(false); // long-press = tahan sementara
  const [muted, setMuted] = useState(true); // video mulai muted (aturan autoplay)
  const [commentOpen, setCommentOpen] = useState(false); // bottom sheet komen
  const videoRef = useRef<HTMLVideoElement>(null);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const pausedRef = useRef(false);
  const onSeenRef = useRef<(id?: string) => void>(() => {});
  const [likeMap, setLikeMap] = useState<Record<string, number>>({});
  const [commentText, setCommentText] = useState("");
  const [floating, setFloating] = useState<
    { key: string; name: string; text: string; sid: string }[]
  >([]);
  // Timer stagger floating yg belum sempat jalan (dibatalkan pas ganti story).
  const floatTimersRef = useRef<number[]>([]);
  // Player voice note ala WA
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioPlayingRef = useRef(false); // buat gate timer tanpa re-run effect
  const [audioTime, setAudioTime] = useState(0);
  const [audioDur, setAudioDur] = useState<number | null>(null);
  // Komentar yang udah pernah jadi floating (cegah duplikat saat polling).
  const knownFloatRef = useRef<Record<string, Set<string>>>({});
  const activeStoryIdRef = useRef<string | null>(null);

  // Turunan data (data dimiliki BioPage, viewer hanya konsumen).
  const stories = data.stories;
  const profile = data.profile;
  const accent = profile?.accent || "#8b5cf6";
  const avatarPos = profile?.avatarPos || "50% 50%";
  const activeStory = storyIndex !== null ? stories[storyIndex] : null;

  // Reset player voice note tiap ganti story (dipanggil dari handler navigasi,
  // bukan effect — sesuai aturan set-state-in-effect).
  function resetAudio() {
    setAudioDur(null);
    setAudioTime(0);
    setAudioPlaying(false);
  }
  // Buka story: komen yang udah ada SELALU melayang tiap dibuka (stagger).
  // Known-set di-reset per buka biar polling cuma nge-float komentar BARU.
  useEffect(() => {
    if (storyIndex === null) return;
    const st = (data?.stories || [])[storyIndex];
    if (!st) return;
    activeStoryIdRef.current = st.id;
    const known = new Set<string>((st.comments || []).map((c) => c.id));
    knownFloatRef.current[st.id] = known;
    clearFloatTimers();
    floatTimersRef.current = (st.comments || [])
      .slice(-3)
      .map((c, i) =>
        window.setTimeout(() => pushFloating(c.name, c.text, st.id), 700 + i * 900)
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyIndex]);
  // Realtime: polling like + komentar selagi viewer terbuka; komentar baru
  // dari pengunjung lain langsung melayang + jumlah like segar.
  useEffect(() => {
    if (storyIndex === null) return;
    let alive = true;
    const pull = () =>
      fetch("/api/story/stats")
        .then((r) => (r.ok ? r.json() : null))
        .then(
          (d: {
            stats?: {
              id: string;
              likes: number;
              comments: { id: string; name: string; text: string; at: number }[];
            }[];
          } | null) => {
            if (!alive || !d?.stats) return;
            setLikeMap((m) => {
              const n = { ...m };
              for (const s of d.stats || []) n[s.id] = s.likes;
              return n;
            });
            onStats(d.stats || []);
            const sid = activeStoryIdRef.current;
            if (sid) {
              const r = (d.stats || []).find((s) => s.id === sid);
              if (r) {
                const known = (knownFloatRef.current[sid] ||= new Set());
                for (const c of r.comments) {
                  if (known.has(c.id)) continue;
                  known.add(c.id);
                  pushFloating(c.name, c.text, sid);
                }
              }
            }
          }
        )
        .catch(() => {});
    pull();
    const id = window.setInterval(pull, 4000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyIndex === null]);
  // Long-press menahan story sementara; lepas = lanjut lagi.
  const beginPress = useCallback(() => {
    longPressed.current = false;
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      pausedRef.current = true;
      setPaused(true);
    }, 220);
  }, []);
  const endPress = useCallback(() => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (longPressed.current) {
      pausedRef.current = false;
      setPaused(false);
    }
  }, []);
  // Timer progres story: isi bar lalu lanjut ke story berikutnya.
  useEffect(() => {
    if (storyIndex === null) return;
    const list = data?.stories || [];
    const story = list[storyIndex];
    if (!story) {
      return;
    }
    if (story.type === "video") {
      // Video maju sendiri lewat onEnded; progres lewat onTimeUpdate.
      return;
    }
    const durSec = story.type === "audio" && audioDur ? audioDur : story.duration || 5;
    const dur = Math.max(1, durSec) * 1000;
    let elapsed = 0;
    const stepMs = 100;
    const id = setInterval(() => {
      if (pausedRef.current) return; // ditahan (long-press)
      // VN: progres & auto-advance JALAN cuma kalau audionya lagi diputar.
      if (story.type === "audio" && !audioPlayingRef.current) return;
      elapsed += stepMs;
      setStoryProgress(Math.min(100, (elapsed / dur) * 100));
      if (elapsed >= dur) {
        clearInterval(id);
        setStoryProgress(0);
        onSeenRef.current(story.id);
        // Story terakhir selesai -> tutup viewer (unmount di BioPage).
        if (storyIndex + 1 < list.length) setStoryIndex(storyIndex + 1);
        else onClose();
      }
    }, stepMs);
    return () => clearInterval(id);
    // data sengaja tidak di-deps: polling mengganti identitas `data` tiap 4s
    // dan bakal me-reset timer progres. Baca list story dari closure render
    // saat story dibuka — cukup utk navigasi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyIndex, audioDur]);
  // Video & audio: ikut ditahan saat long-press.
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      if (paused) v.pause();
      else void v.play().catch(() => {});
    }
    if (paused) audioRef.current?.pause();
  }, [paused, storyIndex]);
  // Ref selalu menunjuk markViewed terbaru tanpa bikin timer re-run.
  useEffect(() => {
    onSeenRef.current = onSeen;
  });
  function currentStoryId() {
    return storyIndex !== null ? (data?.stories || [])[storyIndex]?.id : undefined;
  }

  function closeStory() {
    onSeen(currentStoryId());
    pausedRef.current = false;
    setPaused(false);
    setCommentOpen(false);
    // onClose me-unmount viewer di BioPage (storyOpen=false) — bukan cuma
    // menyembunyikan overlay, supaya state bersih & bisa dibuka lagi.
    onClose();
    setStoryProgress(0);
    setFloating([]);
    clearFloatTimers();
    resetAudio();
  }
  function gotoStory(i: number) {
    if (i < 0) return;
    if (i >= stories.length) {
      closeStory();
      return;
    }
    onSeen(currentStoryId());
    pausedRef.current = false;
    setPaused(false);
    setCommentOpen(false);
    setStoryProgress(0);
    setFloating([]); // floating story sebelumnya jangan nempel ke story baru
    clearFloatTimers();
    setStoryIndex(i);
    resetAudio();
  }
  async function likeStory(id: string) {
    if (liked[id]) return; // udah like (dari DB) -> cegah dobel
    onLike(id);
    try {
      const r = await fetch("/api/story/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: id, visitorId }),
      });
      if (r.ok) {
        const d = await r.json();
        // Server yg pegang jumlah asli (1x per visitor) -> pakai itu.
        if (typeof d.likes === "number") setLikeMap((m) => ({ ...m, [id]: d.likes }));
      }
    } catch {
      /* ignore */
    }
  }
  function pushFloating(name: string, text: string, sid: string) {
    const key = crypto.randomUUID();
    setFloating((f) => [...f.slice(-3), { key, name, text, sid }]);
    setTimeout(() => setFloating((f) => f.filter((x) => x.key !== key)), 4200);
  }
  function clearFloatTimers() {
    floatTimersRef.current.forEach((t) => window.clearTimeout(t));
    floatTimersRef.current = [];
  }
  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!activeStory) return;
    const text = commentText.trim();
    if (!text) return;
    const name = visitorName; // nama anonim, konsisten per pengunjung (dari DB)
    const sid = activeStory.id;
    setCommentText("");
    pushFloating(name, text, sid);
    // Optimis: komen LANGSUNG muncul di daftar tanpa nunggu server.
    const tmpId = `tmp-${Date.now()}`;
    (knownFloatRef.current[sid] ||= new Set()).add(tmpId);
    onPatchStory(sid, (st) => ({
      ...st,
      comments: [...(st.comments || []), { id: tmpId, name, text, at: Date.now() }],
    }));
    try {
      const r = await fetch("/api/story/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: sid, text, visitorId }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d?.comment?.name) {
          // pakai nama resmi dari DB biar konsisten
          onNameChange(d.comment.name);
        }
        // Sinkronkan daftar resmi dari server (ganti entry optimis).
        if (Array.isArray(d.comments)) {
          const known = (knownFloatRef.current[sid] ||= new Set());
          for (const c of d.comments as { id: string }[]) known.add(c.id);
          onPatchStory(sid, (st) => ({ ...st, comments: d.comments }));
        }
      }
    } catch {
      /* ignore */
    }
  }
  function openCommentSheet() {
    pausedRef.current = true;
    setPaused(true);
    setCommentOpen(true);
  }
  function closeCommentSheet() {
    setCommentOpen(false);
    pausedRef.current = false;
    setPaused(false);
  }

  return (
    <>
      {storyIndex !== null && activeStory && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative h-full w-full overflow-hidden bg-black sm:aspect-[9/16] sm:h-[92vh] sm:w-auto sm:max-w-[94vw] sm:rounded-2xl">
            {/* bar progres per story; yang udah dilihat jadi abu-abu */}
            <div className="absolute left-0 right-0 top-0 z-30 flex gap-1 p-2">
              {stories.map((s, i) => (
                <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
                  <div
                    className={`h-full ${viewed[s.id] ? "bg-zinc-400/80" : "bg-white"}`}
                    style={{
                      width:
                        i < (storyIndex ?? 0)
                          ? "100%"
                          : i === storyIndex
                            ? `${storyProgress}%`
                            : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* profil kiri-atas: avatar + nama ambil dari bio profile */}
            {profile && (
              <div className="pointer-events-none absolute left-3 top-5 z-30 flex items-center gap-2">
                {profile.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="h-8 w-8 rounded-full border-2 object-cover"
                    style={{ borderColor: accent, objectPosition: avatarPos }}
                  />
                ) : (
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: accent }}
                  >
                    {(profile.name || "B").slice(0, 1)}
                  </span>
                )}
                <span className="text-sm font-semibold text-white drop-shadow">
                  {profile.name}
                </span>
              </div>
            )}

            {/* tutup */}
            <button
              onClick={closeStory}
              className="absolute right-3 top-5 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:text-white"
              aria-label="Tutup story"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            {/* pengeras suara (khusus video) */}
            {activeStory.type === "video" && (
              <button
                onClick={() => setMuted((m) => !m)}
                className="absolute right-3 top-14 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:text-white"
                aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
              >
                {muted ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                    <path d="m23 9-6 6M17 9l6 6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
                  </svg>
                )}
              </button>
            )}

            {/* konten story */}
            {activeStory.type === "video" && activeStory.media ? (
              <video
                key={activeStory.id}
                ref={videoRef}
                src={activeStory.media}
                className="absolute inset-0 h-full w-full bg-black object-contain"
                autoPlay
                muted={muted}
                playsInline
                onEnded={() => gotoStory((storyIndex ?? 0) + 1)}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration && Number.isFinite(v.duration)) {
                    setStoryProgress((v.currentTime / v.duration) * 100);
                  }
                }}
              />
            ) : activeStory.type === "audio" && activeStory.media ? (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-7 p-8"
                style={{
                  background:
                    activeStory.bg || `linear-gradient(135deg, ${accent}, ${accent}88)`,
                }}
              >
                {activeStory.text && (
                  <p
                    className="max-w-xs text-center text-lg font-semibold leading-snug text-white drop-shadow"
                    style={{ fontFamily: "var(--font-bio)" }}
                  >
                    {activeStory.text}
                  </p>
                )}
                {/* player voice note gaya WA: tombol putar + waveform + mic.
                    z-20 biar berada DI ATAS zona tap navigasi — klik play gak
                    kelewat jadi "ganti story". */}
                <div className="relative z-20 w-full max-w-sm rounded-2xl bg-black/45 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const a = audioRef.current;
                        if (!a) return;
                        if (audioPlaying) a.pause();
                        else void a.play().catch(() => {});
                      }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ background: accent }}
                      aria-label={audioPlaying ? "Jeda voice note" : "Putar voice note"}
                    >
                      {audioPlaying ? (
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                          <path d="M8 5h3v14H8zM13 5h3v14h-3z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex h-8 items-center gap-[3px]" aria-hidden>
                        {waveBars(activeStory.id).map((h, i) => {
                          const total = audioDur || activeStory.duration || 15;
                          const played = audioDur ? audioTime / total : 0;
                          const on = i / waveBars(activeStory.id).length <= played;
                          return (
                            <span
                              key={i}
                              className="flex-1 rounded-full"
                              style={{
                                height: `${h}px`,
                                background: on ? "#fff" : "rgba(255,255,255,0.35)",
                              }}
                            />
                          );
                        })}
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] font-medium text-white/70">
                        <span>{fmtTime(audioTime)}</span>
                        <span>{fmtTime(audioDur || activeStory.duration || 15)}</span>
                      </div>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      className="h-6 w-6 shrink-0 text-white/80"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
                    </svg>
                  </div>
                </div>
                <audio
                  key={activeStory.id}
                  ref={audioRef}
                  src={activeStory.media}
                  preload="metadata"
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;
                    if (d && Number.isFinite(d)) setAudioDur(d);
                  }}
                  onTimeUpdate={(e) => setAudioTime(e.currentTarget.currentTime)}
                  onPlay={() => {
                    audioPlayingRef.current = true;
                    setAudioPlaying(true);
                  }}
                  onPause={() => {
                    audioPlayingRef.current = false;
                    setAudioPlaying(false);
                  }}
                  onEnded={() => gotoStory((storyIndex ?? 0) + 1)}
                  className="hidden"
                />
              </div>
            ) : activeStory.type === "image" && activeStory.media ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeStory.media}
                alt={activeStory.text || "story"}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center p-8 text-center"
                style={{
                  background:
                    activeStory.bg || `linear-gradient(135deg, ${accent}, ${accent}88)`,
                }}
              >
                <p
                  className="text-2xl font-bold leading-snug text-white drop-shadow"
                  style={{ fontFamily: "var(--font-name)" }}
                >
                  {activeStory.text}
                </p>
              </div>
            )}

            {/* zona tap: kiri = sebelumnya, kanan = berikutnya; tahan = jeda */}
            <button
              className="absolute left-0 top-0 z-10 h-full w-1/3"
              onPointerDown={beginPress}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              onPointerCancel={endPress}
              onClick={() => {
                if (longPressed.current) {
                  longPressed.current = false;
                  return;
                }
                gotoStory((storyIndex ?? 0) - 1);
              }}
              aria-label="Story sebelumnya (tahan untuk jeda)"
            />
            <button
              className="absolute right-0 top-0 z-10 h-full w-2/3"
              onPointerDown={beginPress}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              onPointerCancel={endPress}
              onClick={() => {
                if (longPressed.current) {
                  longPressed.current = false;
                  return;
                }
                gotoStory((storyIndex ?? 0) + 1);
              }}
              aria-label="Story berikutnya (tahan untuk jeda)"
            />

            {/* penanda sedang dijeda (long-press) */}
            {paused && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                <div className="flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M8 5h3v14H8zM13 5h3v14h-3z" />
                  </svg>
                  Dijeda
                </div>
              </div>
            )}

            {/* komentar melayang di kanan-bawah — HANYA milik story aktif */}
            <div className="pointer-events-none absolute bottom-24 right-3 z-20 flex w-48 flex-col items-end gap-1.5">
              {floating
                .filter((c) => c.sid === activeStory.id)
                .map((c) => (
                <div
                  key={c.key}
                  className="animate-float-up max-w-full rounded-2xl rounded-br-sm bg-black/60 px-3 py-2 text-xs text-white backdrop-blur-sm"
                >
                  <p className="font-bold text-violet-300">{c.name}</p>
                  <p className="mt-0.5 leading-snug text-white/90">{c.text}</p>
                </div>
              ))}
            </div>

            {/* kontrol bawah: like + komentar */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/85 to-transparent p-3 pt-8">
              {activeStory.type !== "text" && activeStory.type !== "audio" && activeStory.text && (
                <p
                  className="mb-2 text-sm font-medium text-white drop-shadow"
                  style={{ fontFamily: "var(--font-bio)" }}
                >
                  {activeStory.text}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openCommentSheet}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-left text-sm text-white/60 backdrop-blur-sm"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
                  </svg>
                  <span className="truncate">Komentar sebagai {visitorName}...</span>
                </button>
                <button
                  onClick={() => likeStory(activeStory.id)}
                  className="flex shrink-0 flex-col items-center text-white"
                  aria-label="Suka"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-7 w-7 ${liked[activeStory.id] ? "text-rose-500" : "text-white"}`}
                    fill={liked[activeStory.id] ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
                  </svg>
                  <span className="text-[11px] font-semibold">
                    {likeMap[activeStory.id] ?? activeStory.likes}
                  </span>
                </button>
              </div>
            </div>

            {/* BOTTOM SHEET komentar: daftar + balas; story auto-pause */}
            {commentOpen && (
              <div
                className="absolute inset-0 z-40"
                onClick={closeCommentSheet}
                role="dialog"
                aria-modal="true"
              >
                <div className="absolute inset-0 bg-black/45" />
                <div
                  className="animate-sheet-up absolute bottom-0 left-0 right-0 flex max-h-[75%] flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-[#13131b] p-4 pb-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-white/20" />
                  <div className="mb-3 flex shrink-0 items-center justify-between">
                    <p className="text-sm font-semibold text-white">
                      Komentar ({activeStory.comments?.length || 0})
                    </p>
                    <button
                      onClick={closeCommentSheet}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white"
                      aria-label="Tutup komentar"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {(activeStory.comments || []).length === 0 ? (
                      <p className="py-6 text-center text-xs text-white/40">
                        Belum ada komentar. Mulai percakapan!
                      </p>
                    ) : (
                      (activeStory.comments || [])
                        .slice()
                        .reverse()
                        .map((c) => (
                          <div key={c.id} className="rounded-xl bg-white/5 px-3 py-2">
                            <p className="text-xs font-semibold text-white/70">{c.name}</p>
                            <p className="mt-0.5 text-sm text-white/90">{c.text}</p>
                          </div>
                        ))
                    )}
                  </div>
                  <form onSubmit={sendComment} className="mt-3 flex shrink-0 items-center gap-2">
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={`Komentar sebagai ${visitorName}...`}
                      maxLength={200}
                      autoFocus
                      className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-white/40"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-full bg-violet-600 px-4 py-2.5 text-white hover:bg-violet-500"
                      aria-label="Kirim komentar"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m22 2-7 20-4-9-9-4Z" />
                        <path d="M22 2 11 13" />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
