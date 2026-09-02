import { NextResponse } from "next/server";
import { getAnalytics, serverInfo } from "@/lib/analytics";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const analytics = await getAnalytics();
  return NextResponse.json(
    { analytics, server: serverInfo() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
