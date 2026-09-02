import { NextResponse } from "next/server";
import { readStore } from "@/lib/data";

// Data publik buat halaman bio. Rute ini pernah ada di deploy lama tapi hilang
// dari repo, padahal BioPage masih fetch ke sini — tanpa rute ini halaman cuma
// mengandalkan props server dan admin harus reload penuh biar perubahan kelihatan.
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readStore();
  return NextResponse.json(
    {
      profile: s.profile,
      links: s.links.filter((l) => l.enabled).sort((a, b) => a.order - b.order),
      social: s.social,
      stack: s.stack,
      team: s.team,
      stories: s.stories,
      fonts: s.fonts,
      theme: s.theme,
      linkShape: s.linkShape,
      stackAlign: s.stackAlign,
      linkLayout: s.linkLayout,
      bubble: s.bubble,
      sections: s.sections,
      branding: s.branding,
      rulesUrl: s.seo.rulesUrl,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
