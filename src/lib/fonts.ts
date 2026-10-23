// Curated font set (Google Fonts). Each key maps to a display name + css font stack.
export const FONTS: Record<string, { label: string; family: string; weight?: string }> = {
  poppins: { label: "Poppins", family: "Poppins", weight: "400;500;600;700" },
  inter: { label: "Inter", family: "Inter", weight: "400;500;600;700" },
  "space-grotesk": { label: "Space Grotesk", family: "Space Grotesk", weight: "400;500;600;700" },
  montserrat: { label: "Montserrat", family: "Montserrat", weight: "400;500;600;700" },
  outfit: { label: "Outfit", family: "Outfit", weight: "400;500;600;700" },
  playfair: { label: "Playfair Display", family: "Playfair Display", weight: "400;600;700" },
  lora: { label: "Lora", family: "Lora", weight: "400;600;700" },
  "jetbrains-mono": { label: "JetBrains Mono", family: "JetBrains Mono", weight: "400;600;700" },
  nunito: { label: "Nunito", family: "Nunito", weight: "400;600;700" },
  oswald: { label: "Oswald", family: "Oswald", weight: "400;500;600;700" },
};

export const FONT_KEYS = Object.keys(FONTS);

export function fontCss(key: string): string {
  const f = FONTS[key] || FONTS.inter;
  return `'${f.family}', sans-serif`;
}

/**
 * Stylesheet Google Fonts untuk font yang benar-benar dipakai halaman.
 * Diambil dari subset weight yang sempit (400;600;700) dan hanya variabel
 * yang dipakai — 3 family × 3 weight = 9 file font, bukan 12.
 * `display=swap` bikin teks langsung tampil dengan font sistem, jadi tidak
 * ada FOIT (layar kosong) saat jaringan lambat.
 */
export function googleFontsHref(fontKeys: string[]): string {
  const wanted = [...new Set(fontKeys.filter((k) => FONTS[k]))];
  if (!wanted.length) return "";
  const families = wanted
    .map((k) => {
      const f = FONTS[k];
      return `family=${f.family.replace(/ /g, "+")}:wght@${f.weight || "400;600"}`;
    })
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * URL preload untuk file font WOFF2. Dipakai di <head> agar browser mulai
 * mengunduh font lebih awal (hemat 1 RTT), tanpa memblokir render.
 * Browser lain mengabaikan `as="font"` yang tidak dipakai.
 */
export function googleFontsCssHref(fontKeys: string[]): string {
  return googleFontsHref(fontKeys);
}

// The set of font keys used by a given config.
export function usedFontKeys(fonts: Record<string, string>): string[] {
  return Object.values(fonts);
}
