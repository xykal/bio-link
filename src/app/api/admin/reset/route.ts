import { NextResponse } from "next/server";
import { normalize, writeStore } from "@/lib/data";
import { isAuthenticated, sameOriginRequest } from "@/lib/auth";

// Reset seluruh store ke DEFAULT_STORE.
export async function POST(req: Request) {
  if (!sameOriginRequest(req)) {
    return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  }
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const fresh = normalize({});
  await writeStore(fresh);
  return NextResponse.json(fresh);
}
