import { NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";

export const dynamic = "force-dynamic";

// DEBUG SEMENTARA: diagnosa ukuran/baris tabel store di D1.
export async function GET() {
  const out: Record<string, unknown> = {};
  try {
    out.all = await d1Query("SELECT id, length(data) AS len FROM store");
  } catch (e) {
    out.allErr = String((e as Error).message || e).slice(0, 200);
  }
  try {
    out.sel1 = await d1Query("SELECT length(data) AS len FROM store WHERE id = 1");
  } catch (e) {
    out.sel1Err = String((e as Error).message || e).slice(0, 200);
  }
  try {
    out.sel2 = await d1Query("SELECT length(data) AS len FROM store WHERE id = 2");
  } catch (e) {
    out.sel2Err = String((e as Error).message || e).slice(0, 200);
  }
  try {
    out.one = await d1Query("SELECT 1 AS ok");
  } catch (e) {
    out.oneErr = String((e as Error).message || e).slice(0, 200);
  }
  try {
    out.master = await d1Query("SELECT name FROM sqlite_master WHERE type='table'");
  } catch (e) {
    out.masterErr = String((e as Error).message || e).slice(0, 200);
  }
  try {
    out.cnt = await d1Query("SELECT COUNT(*) AS c FROM store");
  } catch (e) {
    out.cntErr = String((e as Error).message || e).slice(0, 200);
  }
  return NextResponse.json(out);
}
