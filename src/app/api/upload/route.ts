import { NextResponse } from "next/server";
import crypto from "crypto";
import { isAuthenticated } from "@/lib/auth";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const API_KEY = process.env.CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

// Folder yang dipakai panel admin. Tanpa whitelist, siapa pun yang lolos auth
// bisa menulis ke folder mana pun di akun Cloudinary.
const ALLOWED_FOLDERS = new Set([
  "bio-link/avatar",
  "bio-link/banner",
  "bio-link/favicon",
  "bio-link/og",
]);

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB — cukup buat avatar/banner/OG

export async function POST(req: Request) {
  // Bug sebelumnya: isAuthenticated() dipanggil TANPA await. Promise itu truthy,
  // jadi `!isAuthenticated()` selalu false dan rute ini terbuka untuk siapa pun —
  // terbukti di production: request tanpa cookie tetap lolos ke Cloudinary.
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return NextResponse.json(
      { error: "Cloudinary tidak dikonfigurasi" },
      { status: 500 }
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  const folder = String(form?.get("folder") || "bio-link/avatar");
  if (!file) {
    return NextResponse.json({ error: "Tidak ada file" }, { status: 400 });
  }
  if (!ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: "Folder tidak diizinkan" }, { status: 400 });
  }
  if (file.type && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Harus berupa gambar" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Maksimal 4 MB" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "Maksimal 4 MB" }, { status: 413 });
  }
  const base64 = buf.toString("base64");
  const timestamp = Math.round(Date.now() / 1000);

  // signed upload (Cloudinary recommends server-side signing)
  const toSign = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
  const signature = crypto.createHash("sha1").update(toSign, "utf8").digest("hex");

  const body = new URLSearchParams();
  body.set("file", `data:${file.type || "image/*"};base64,${base64}`);
  body.set("folder", folder);
  body.set("timestamp", String(timestamp));
  body.set("api_key", API_KEY);
  body.set("signature", signature);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body }
  );
  const data = await uploadRes.json().catch(() => ({}));

  if (!data.secure_url) {
    return NextResponse.json(
      { error: data.error?.message || "Upload gagal" },
      { status: 400 }
    );
  }

  return NextResponse.json({ url: data.secure_url, public_id: data.public_id });
}
