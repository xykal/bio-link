import { NextResponse } from "next/server";
import { readStore, writeStore, type LinkItem } from "@/lib/data";
import { isAuthenticated } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = await readStore();
  const body = await req.json().catch(() => ({}));

  const title = (body.title || "").trim();
  const url = (body.url || "").trim();
  if (!title || !url) {
    return NextResponse.json({ error: "Judul & URL wajib diisi" }, { status: 400 });
  }

  const icon = (body.icon || "link") as string;
  const nextOrder =
    store.links.length > 0 ? Math.max(...store.links.map((l) => l.order)) + 1 : 0;

  const item: LinkItem = {
    id: randomUUID(),
    title,
    url,
    icon,
    order: nextOrder,
    enabled: true,
  };
  store.links.push(item);
  await writeStore(store);
  return NextResponse.json(item, { status: 201 });
}
