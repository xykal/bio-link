import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/data";
import { isAuthenticated } from "@/lib/auth";

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids : [];

  const store = await readStore();
  const byId = new Map(store.links.map((l) => [l.id, l]));
  const reordered: typeof store.links = [];
  for (let i = 0; i < ids.length; i++) {
    const link = byId.get(ids[i]);
    if (link) reordered.push({ ...link, order: i });
  }
  // append any missing links at the end
  for (const link of store.links) {
    if (!reordered.find((r) => r.id === link.id)) {
      reordered.push({ ...link, order: reordered.length });
    }
  }
  store.links = reordered;
  await writeStore(store);
  return NextResponse.json({ ok: true, links: store.links });
}
