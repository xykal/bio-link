import { NextResponse } from "next/server";
import crypto from "crypto";
import { isAuthenticated } from "@/lib/auth";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const API_KEY = process.env.CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

export async function POST(req: Request) {
  if (!isAuthenticated()) {
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
  const folder = (form?.get("folder") as string) || "bio-link";
  if (!file) {
    return NextResponse.json({ error: "Tidak ada file" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
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
