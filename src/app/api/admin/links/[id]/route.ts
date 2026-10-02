import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/data";
import { isAuthenticated, sameOriginRequest } from "@/lib/auth";
import { isAllowedLinkUrl } from "@/lib/links";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sameOriginRequest(req)) {
    return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  }
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 8192) {
    return NextResponse.json({ error: "Request terlalu besar" }, { status: 413 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const store = await readStore();
  const link = store.links.find((item) => item.id === id);
  if (!link) {
    return NextResponse.json({ error: "Link tidak ditemukan" }, { status: 404 });
  }

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title || title.length > 120) {
      return NextResponse.json({ error: "Judul link tidak valid" }, { status: 400 });
    }
    link.title = title;
  }
  if (typeof body.url === "string") {
    const url = body.url.trim();
    if (!isAllowedLinkUrl(url)) {
      return NextResponse.json({ error: "URL tidak valid. Gunakan http(s), mailto, tel, atau sms." }, { status: 400 });
    }
    link.url = url;
  }
  if (typeof body.icon === "string" && body.icon.length <= 40) link.icon = body.icon;
  if (typeof body.enabled === "boolean") link.enabled = body.enabled;
  if (body.gate === "rules" || body.gate === "none") link.gate = body.gate;
  if (["link", "join_group", "channel"].includes(body.kind)) link.kind = body.kind;

  await writeStore(store);
  return NextResponse.json(link);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sameOriginRequest(req)) {
    return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  }
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const store = await readStore();
  store.links = store.links.filter((l) => l.id !== id).map((l, i) => ({ ...l, order: i }));
  await writeStore(store);
  return NextResponse.json({ ok: true });
}
