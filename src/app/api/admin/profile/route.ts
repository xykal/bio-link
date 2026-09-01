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

  await writeStore(store);
  return NextResponse.json(store.profile);
}
