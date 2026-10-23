"use client";

import { useCallback, useRef, useState } from "react";
import type { DonationConfig } from "@/lib/data";

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

/**
 * Efek suara koin dibuat pakai WebAudio (tanpa file audio, ~0 KB).
 * Dua osilator segitiga dengan pitch tinggi + decay cepat = "tink" logam.
 */
function playCoinSound(muted: boolean) {
  if (muted) return;
  try {
    type Ctor = typeof AudioContext;
    const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
    const Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    const tink = (at: number, gainValue: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, at);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.82, at + 0.16);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(gainValue, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.26);
    };

    // tiga "coin ting" cepat biar terdengar seperti koin jatuh bertumpuk
    tink(now, 0.13, 1780);
    tink(now + 0.06, 0.09, 2360);
    tink(now + 0.13, 0.06, 1520);

    window.setTimeout(() => void ctx.close().catch(() => {}), 700);
  } catch {
    /* autoplay diblokir browser — diamkan saja */
  }
}

export default function DonationBanner({
  donation,
  accent,
  isLight,
}: {
  donation: DonationConfig;
  accent: string;
  isLight?: boolean;
}) {
  const [muted, setMuted] = useState(false);
  const [pulse, setPulse] = useState(false);
  const pulseTimer = useRef<number | null>(null);

  const onClick = useCallback(() => {
    playCoinSound(muted || !donation.sound);
    setPulse(true);
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulse(false), 900);
  }, [muted, donation.sound]);

  const pct =
    donation.target > 0 ? Math.min(100, Math.round((donation.raised / donation.target) * 100)) : 0;

  const cardBg = isLight
    ? "linear-gradient(135deg,#ffffff 0%,#fff7e8 55%,#fde9ff 100%)"
    : "linear-gradient(135deg,#191322 0%,#241a2e 45%,#141019 100%)";

  return (
    <div className="relative mb-12 mt-16 w-full pt-[78px] sm:pt-[100px]">
      {/* ── elemen 3D melayang DI LUAR kartu ─────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
        {/* tumpukan koin besar (kiri atas) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/donation-coins.webp"
          alt=""
          width={420}
          height={347}
          className="don-float-a absolute -left-1 top-0 w-[104px] sm:-left-6 sm:w-[132px]"
        />
        {/* koin tunggal (kanan bawah, di luar kartu) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/donation-coin.webp"
          alt=""
          width={260}
          height={141}
          className={`don-float-b absolute -right-2 top-[calc(100%+6px)] w-[104px] sm:-right-7 sm:w-[126px] ${
            pulse ? "don-pop" : ""
          }`}
        />
        {/* kilau kecil */}
        <span
          className="don-twinkle absolute right-6 top-2 h-2 w-2 rounded-full"
          style={{ background: "#ffd76a", boxShadow: "0 0 12px 4px rgba(255,215,106,0.6)" }}
        />
        <span
          className="don-twinkle absolute -right-1 top-[calc(100%+70px)] h-1.5 w-1.5 rounded-full"
          style={{
            background: "#c084fc",
            boxShadow: "0 0 10px 3px rgba(192,132,252,0.55)",
            animationDelay: "1.1s",
          }}
        />
      </div>

      {/* ── kartu banner ─────────────────────────────────────────────── */}
      <a
        href={donation.url}
        target="_blank"
        rel="noreferrer"
        onClick={onClick}
        className={`don-card relative block overflow-hidden rounded-[28px] border p-6 transition-transform duration-300 hover:-translate-y-0.5 ${
          isLight ? "border-amber-300/60 shadow-[0_18px_40px_-24px_rgba(120,60,0,0.5)]" : "border-amber-300/25 shadow-[0_22px_50px_-28px_rgba(255,190,80,0.45)]"
        }`}
        style={{ background: cardBg }}
      >
        {/* glow aksen di dalam kartu */}
        <span
          className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full blur-3xl"
          style={{ background: `${accent}33` }}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 rounded-full blur-3xl"
          style={{ background: "rgba(255,196,84,0.16)" }}
          aria-hidden
        />

        <div className="relative flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: isLight ? "#b45309" : "#fbbf24" }}
            >
              Dukungan
            </p>
            <h2
              className="mt-1 text-[20px] font-extrabold leading-tight sm:text-[23px]"
              style={{ fontFamily: "var(--font-name)" }}
            >
              {donation.headline}
            </h2>
            {donation.subtitle && (
              <p
                className="mt-2 text-[13px] leading-relaxed opacity-70 sm:text-[13.5px]"
                style={{ fontFamily: "var(--font-bio)" }}
              >
                {donation.subtitle}
              </p>
            )}

            {donation.target > 0 && (
              <div className="mt-3">
                <div
                  className={`h-2 w-full overflow-hidden rounded-full ${
                    isLight ? "bg-black/10" : "bg-white/10"
                  }`}
                >
                  <div
                    className="don-progress h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: "linear-gradient(90deg,#fbbf24,#f59e0b,#c084fc)",
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] opacity-55">
                  {rupiah(donation.raised)} terkumpul dari {rupiah(donation.target)} · {pct}%
                </p>
              </div>
            )}

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-bold text-white shadow-lg transition-transform hover:scale-[1.03]"
                style={{
                  background: "linear-gradient(135deg,#f59e0b,#f97316)",
                  boxShadow: "0 10px 24px -10px rgba(245,158,11,0.8)",
                }}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                  <path
                    d="M12 21s-7.5-4.6-9.3-9A5.6 5.6 0 0 1 12 6.2 5.6 5.6 0 0 1 21.3 12c-1.8 4.4-9.3 9-9.3 9Z"
                    fill="currentColor"
                  />
                </svg>
                {donation.ctaLabel || "Dukung Sekarang"}
              </span>
              {donation.note && (
                <span className="text-[11px] opacity-50">{donation.note}</span>
              )}
            </div>
          </div>

          {/* kontrol suara — jangan ikut membuka link */}
          {donation.sound && (
            <button
              type="button"
              aria-label={muted ? "Nyalakan efek suara" : "Matikan efek suara"}
              title={muted ? "Nyalakan suara koin" : "Matikan suara koin"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMuted((m) => !m);
                if (muted) playCoinSound(false);
              }}
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                isLight
                  ? "border-black/10 bg-white/70 text-black/60 hover:bg-white"
                  : "border-white/15 bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {muted ? (
                // ikon "speaker off" (stroke, bukan emoji)
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
                  <path d="m16 9 5 6M21 9l-5 6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" />
                </svg>
              )}
            </button>
          )}
        </div>
      </a>

      {/* Animasi banner. Pakai <style> biasa (bukan styled-jsx) supaya ikut
          ter-render di server: kartu langsung beranimasi tanpa nunggu hydration.
          Semua nama kelas berawalan "don-" jadi tidak bentrok dengan Tailwind. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .don-float-a {
          animation: donFloatA 7s ease-in-out infinite;
          will-change: transform;
        }
        .don-float-b {
          animation: donFloatB 5.5s ease-in-out infinite;
          will-change: transform;
        }
        .don-twinkle {
          animation: donTwinkle 2.6s ease-in-out infinite;
        }
        .don-pop {
          animation: donPop 0.9s ease-out;
        }
        .don-progress {
          animation: donGrow 1.1s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes donFloatA {
          0%,
          100% {
            transform: translate3d(0, 0, 0) rotate(-6deg);
          }
          50% {
            transform: translate3d(6px, -12px, 0) rotate(2deg);
          }
        }
        @keyframes donFloatB {
          0%,
          100% {
            transform: translate3d(0, 0, 0) rotate(8deg);
          }
          50% {
            transform: translate3d(-8px, -10px, 0) rotate(-4deg);
          }
        }
        @keyframes donTwinkle {
          0%,
          100% {
            opacity: 0.15;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.25);
          }
        }
        @keyframes donPop {
          0% {
            transform: scale(1);
          }
          35% {
            transform: scale(1.18) rotate(-6deg);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes donGrow {
          from {
            width: 0%;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .don-float-a,
          .don-float-b,
          .don-twinkle,
          .don-progress {
            animation: none;
          }
        }`,
        }}
      />
    </div>
  );
}
