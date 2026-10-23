"use client";

export type TechIconLite = { slug: string; title: string; hex: string; path: string };

/**
 * Chip tech stack bergaya GitHub: logo resmi + nama.
 * Kalau logonya tidak tersedia, tampil titik warna aksen + nama (persis
 * seperti daftar bahasa di halaman repo GitHub).
 */
export default function TechChip({
  label,
  icon,
  accent = "#8b5cf6",
  isLight,
}: {
  label: string;
  icon?: TechIconLite | null;
  accent?: string;
  isLight?: boolean;
}) {
  const base = isLight
    ? "border-black/10 bg-black/[0.04] text-black/70"
    : "border-white/10 bg-white/[0.06] text-white/75";

  return (
    <li
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] font-medium ${base}`}
      title={icon ? `${icon.title} · ${label}` : label}
    >
      {icon ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden>
          <path d={icon.path} fill={`#${icon.hex}`} />
        </svg>
      ) : (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: accent }}
          aria-hidden
        />
      )}
      {label}
    </li>
  );
}
