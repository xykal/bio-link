import { NextResponse } from "next/server";
import crypto from "crypto";
import { isAuthenticated } from "@/lib/auth";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const API_KEY = process.env.CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

const ALLOWED_FOLDERS = new Set([
  "bio-link/avatar",
  "bio-link/banner",
  "bio-link/favicon",
  "bio-link/og",
  "bio-link/team",
  "bio-link/story",
]);

// Kirim signature agar browser bisa upload LANGSUNG ke Cloudinary.
// Ini penting untuk video: file besar tak lewat function (hindari limit body
// serverless ~4.5MB di Vercel). Rahasia tetap di server, hanya signature turun.
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return NextResponse.json({ error: "Cloudinary tidak dikonfigurasi" }, { status: 500 });
  }
  const body = await req.json().catch(() => ({}));
  const folder = String(body.folder || "");
  if (!ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: "Folder tidak diizinkan" }, { status: 400 });
  }
  const timestamp = Math.round(Date.now() / 1000);
  const toSign = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
  const signature = crypto.createHash("sha1").update(toSign, "utf8").digest("hex");
  return NextResponse.json({
    cloudName: CLOUD_NAME,
    apiKey: API_KEY,
    timestamp,
    signature,
    folder,
  });
}
