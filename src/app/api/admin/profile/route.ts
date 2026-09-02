import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/data";
import { isAuthenticated } from "@/lib/auth";

export async function PATCH(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const store = await readStore();

  if (typeof body.name === "string") store.profile.name = body.name.trim();
  if (typeof body.handle === "string") store.profile.handle = body.handle.trim();
  if (typeof body.bio === "string") store.profile.bio = body.bio.trim();
  if (typeof body.avatar === "string") store.profile.avatar = body.avatar.trim();
  if (typeof body.banner === "string") store.profile.banner = body.banner.trim();
  if (typeof body.accent === "string") store.profile.accent = body.accent.trim();
  if (
    [
      "circle",
      "squircle",
      "rounded",
      "blob",
      "morph",
      "abstract",
      "hexagon",
      "star",
      "heart",
      "octagon",
      "diamond",
      "leaf",
      "shield",
      "custom",
    ].includes(body.shape as string)
  ) {
    store.profile.shape = body.shape;
  }
  // Path SVG utk bentuk bebas (shape="custom"). Koordinat 0..1.
  if (typeof body.customShape === "string") {
    store.profile.customShape = body.customShape.slice(0, 8000);
  }
  // Posisi crop avatar (object-position). Hanya izinkan pola aman:
  // keyword dan/atau persentase, mis. "50% 100%" atau "center top".
  if (
    typeof body.avatarPos === "string" &&
    /^(left|center|right|top|bottom|\d{1,3}%)( (left|center|right|top|bottom|\d{1,3}%))?$/.test(
      body.avatarPos.trim()
    )
  ) {
    store.profile.avatarPos = body.avatarPos.trim();
  }

  await writeStore(store);
  return NextResponse.json(store.profile);
}
