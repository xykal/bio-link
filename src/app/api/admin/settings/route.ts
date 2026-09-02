import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readStore, writeStore, normalize } from "@/lib/data";
import { isAuthenticated } from "@/lib/auth";
import { getTechIcon } from "@/lib/stackIcons";

// PATCH individual setting groups: social, seo, fonts, theme, branding
export async function PATCH(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const store = await readStore();

  if (body.social && typeof body.social === "object") {
    store.social = { ...store.social, ...body.social };
  }
  if (Array.isArray(body.stack)) {
    store.stack = body.stack
      .slice(0, 40)
      .map((s: { id?: string; slug?: unknown }) => {
        const slug = typeof s.slug === "string" ? s.slug.trim() : "";
        const ic = getTechIcon(slug);
        if (!ic) return null;
        return {
          id: typeof s.id === "string" && s.id ? s.id : randomUUID(),
          slug: ic.slug,
          title: ic.title,
          hex: ic.hex,
          path: ic.path,
        };
      })
      .filter((x: unknown): x is NonNullable<typeof x> => x !== null);
  }
  if (Array.isArray(body.team)) {
    store.team = body.team
      .filter((m: { name?: unknown }) => m && typeof m.name === "string" && m.name.trim())
      .slice(0, 40)
      .map((m: { id?: string; name: string; role?: string; avatar?: string; url?: string }) => ({
        id: typeof m.id === "string" && m.id ? m.id : randomUUID(),
        name: m.name.trim().slice(0, 60),
        role: typeof m.role === "string" ? m.role.slice(0, 60) : "",
        avatar: typeof m.avatar === "string" ? m.avatar.slice(0, 500) : "",
        url: typeof m.url === "string" ? m.url.slice(0, 500) : "",
      }));
  }
  if (["pill", "rounded", "soft", "square"].includes(body.linkShape)) {
    store.linkShape = body.linkShape;
  }
  if (Array.isArray(body.stories)) {
    // Pakai normalize() sebagai satu sumber kebenaran (dukung image/text/video/
    // audio + simpan mediaPublicId/mediaResourceType untuk auto-destroy 24 jam).
    store.stories = normalize({ stories: body.stories }).stories;
  }
  if (["left", "center", "right"].includes(body.stackAlign)) {
    store.stackAlign = body.stackAlign;
  }
  if (["list", "grid", "compact"].includes(body.linkLayout)) {
    store.linkLayout = body.linkLayout;
  }
  if (body.bubble && typeof body.bubble === "object") {
    store.bubble = {
      enabled: body.bubble.enabled === true,
      text:
        typeof body.bubble.text === "string"
          ? body.bubble.text.slice(0, 140)
          : store.bubble.text,
      style: [
        "speech",
        "pill",
        "glass",
        "neon",
        "outline",
        "gradient",
        "note",
        "badge",
        "tiktok",
        "instagram",
      ].includes(body.bubble.style)
        ? body.bubble.style
        : store.bubble.style,
      position: [
        "top-left",
        "top-right",
        "left",
        "right",
        "bottom-left",
        "bottom-right",
      ].includes(body.bubble.position)
        ? body.bubble.position
        : store.bubble.position,
      color:
        typeof body.bubble.color === "string"
          ? body.bubble.color.slice(0, 32)
          : store.bubble.color,
    };
  }
  if (body.sections && typeof body.sections === "object") {
    store.sections = {
      stack: body.sections.stack !== false,
      team: body.sections.team !== false,
    };
  }
  if (body.seo && typeof body.seo === "object") {
    store.seo = { ...store.seo, ...body.seo };
  }
  if (body.fonts && typeof body.fonts === "object") {
    store.fonts = { ...store.fonts, ...body.fonts };
  }
  if (body.theme === "dark" || body.theme === "light") {
    store.theme = body.theme;
  }
  if (body.branding && typeof body.branding === "object") {
    store.branding = { ...store.branding, ...body.branding };
  }

  await writeStore(store);
  return NextResponse.json(store);
}
