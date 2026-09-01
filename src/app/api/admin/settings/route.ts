import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/data";
import { isAuthenticated } from "@/lib/auth";

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
