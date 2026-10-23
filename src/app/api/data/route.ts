import { pakasirConfigured } from "@/lib/pakasir";
import { readStore } from "@/lib/data";

// Data publik buat halaman bio. Rute ini pernah ada di deploy lama tapi hilang
// dari repo, padahal BioPage masih fetch ke sini — tanpa rute ini halaman cuma
// mengandalkan props server dan admin harus reload penuh biar perubahan kelihatan.
export const dynamic = "force-dynamic";

/**
 * ETag murah (FNV-1a) atas JSON: auto-refresh 20 detik jadi nyaris gratis —
 * kalau isi store tidak berubah, server balas 304 tanpa body, jadi HP tidak
 * mendownload ulang ~18 KB tiap polling.
 */
function hashJson(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `W/"${h.toString(36)}-${text.length}"`;
}

export async function GET(req: Request) {
  const s = await readStore();
  const payload = {
    profile: s.profile,
    links: s.links.filter((l) => l.enabled).sort((a, b) => a.order - b.order),
    social: s.social,
    stack: s.stack,
    team: s.team,
    stories: s.stories,
    fonts: s.fonts,
    theme: s.theme,
    background: s.background,
    linkShape: s.linkShape,
    stackAlign: s.stackAlign,
    linkLayout: s.linkLayout,
    bubble: s.bubble,
    sections: s.sections,
    branding: s.branding,
    projects: s.projects
      .filter((p) => p.enabled)
      .sort((a, b) => a.order - b.order),
    products: s.shop.enabled
      ? s.products.filter((p) => p.enabled).sort((a, b) => a.order - b.order)
      : [],
    shop: { ...s.shop, payReady: pakasirConfigured },
    donation: s.donation,
    tabs: s.tabs,
    rulesUrl: s.seo.rulesUrl,
  };
  const body = JSON.stringify(payload);
  const etag = hashJson(body);

  // 304: browser pakai data yang sudah dipegang, transfer ~0 byte.
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": "no-store" },
    });
  }

  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      ETag: etag,
      "Cache-Control": "no-store",
    },
  });
}
