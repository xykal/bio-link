import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/data";
import { isAuthenticated } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const store = await readStore();
  const link = store.links.find((l) => l.id === id);
  if (!link) {
    return NextResponse.json({ error: "Link tidak ditemukan" }, { status: 404 });
  }

  if (typeof body.title === "string") link.title = body.title.trim();
  if (typeof body.url === "string") link.url = body.url.trim();
  if (typeof body.icon === "string") link.icon = body.icon;
  if (typeof body.enabled === "boolean") link.enabled = body.enabled;
  if (body.gate === "rules" || body.gate === "none") link.gate = body.gate;
  if (["link", "join_group", "channel"].includes(body.kind)) link.kind = body.kind;

  await writeStore(store);
  return NextResponse.json(link);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const store = await readStore();
  store.links = store.links.filter((l) => l.id !== id).map((l, i) => ({ ...l, order: i }));
  await writeStore(store);
  return NextResponse.json({ ok: true });
}
