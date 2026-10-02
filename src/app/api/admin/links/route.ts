import { NextResponse } from "next/server";
import { readStore, writeStore, type LinkItem } from "@/lib/data";
import { isAuthenticated, sameOriginRequest } from "@/lib/auth";
import { isAllowedLinkUrl } from "@/lib/links";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
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
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!title || title.length > 120 || !isAllowedLinkUrl(url)) {
    return NextResponse.json({ error: "Judul atau URL tidak valid" }, { status: 400 });
  }
  const store = await readStore();

  const nextOrder =
    store.links.length > 0 ? Math.max(...store.links.map((l) => l.order)) + 1 : 0;

  const item: LinkItem = {
    id: randomUUID(),
    title,
    url,
    icon: typeof body.icon === "string" && body.icon.length <= 40 ? body.icon : "link",
    order: nextOrder,
    enabled: true,
    gate: body.gate === "rules" ? "rules" : "none",
    kind: ["link", "join_group", "channel"].includes(body.kind) ? body.kind : "link",
  };
  store.links.push(item);
  await writeStore(store);
  return NextResponse.json(item, { status: 201 });
}
