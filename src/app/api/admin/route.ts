import { NextResponse } from "next/server";
import { readStore } from "@/lib/data";
import { pakasirConfigured } from "@/lib/pakasir";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = await readStore();
  // payReady = kredensial Pakasir sudah terpasang di Worker (bukan bagian data
  // tersimpan; normalize() akan membuangnya kalau panel menyimpan balik shop).
  return NextResponse.json({ ...store, shop: { ...store.shop, payReady: pakasirConfigured } });
}
