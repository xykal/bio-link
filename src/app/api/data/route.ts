import { NextResponse } from "next/server";
import { readStore } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await readStore();
  return NextResponse.json({ ok: true, data: store });
}
