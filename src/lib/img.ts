// Optimasi gambar Cloudinary: format otomatis (AVIF/WebP — tajam tapi kecil),
// kualitas otomatis, dan batas lebar sesuai kebutuhan tampilan.
// URL non-Cloudinary dikembalikan apa adanya.
export function optImg(
  url: string,
  opts?: { w?: number; h?: number; crop?: "fill" | "limit" }
): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("cloudinary.com")) return url;
    if (!u.pathname.includes("/upload/")) return url;
    if (u.pathname.includes("f_auto")) return url; // sudah dioptimasi
    const t = ["f_auto", "q_auto", "dpr_auto"];
    if (opts?.w) t.push(`w_${opts.w}`);
    if (opts?.h) t.push(`h_${opts.h}`);
    t.push(`c_${opts?.crop || "limit"}`);
    u.pathname = u.pathname.replace("/upload/", `/upload/${t.join(",")}/`);
    return u.toString();
  } catch {
    return url;
  }
}
