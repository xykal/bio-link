import { NextResponse } from "next/server";
import { normalize, readStore, writeStore } from "@/lib/data";
import { isAuthenticated } from "@/lib/auth";

// Restore seluruh isi store dari JSON (hasil export). Semua field disanitasi
// lewat normalize() jadi input asing/tak lengkap tetap aman.
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON tidak valid" }, { status: 400 });
  }
  const clean = normalize(body);
  await writeStore(clean);
  return NextResponse.json(clean);
}

// GET: kembalikan store mentah buat di-download (export).
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = await readStore();
  return NextResponse.json(store, {
    headers: {
      "Content-Disposition": 'attachment; filename="bio-link-backup.json"',
      "Cache-Control": "no-store",
    },
  });
}
