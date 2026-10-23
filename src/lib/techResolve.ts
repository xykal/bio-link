import { TECH_ICONS, type TechIcon } from "./stackIcons";

/**
 * Terjemahkan label bebas ("Next.js", "Kotlin", "Tailscale") jadi ikon resmi
 * simple-icons. Label yang tidak dikenal tetap ditampilkan sebagai chip teks
 * dengan titik warna aksen — persis gaya daftar bahasa di GitHub.
 *
 * Catatan bundel: modul ini hanya diimpor di server (halaman publik & API),
 * bukan di komponen client, supaya `simple-icons` tidak masuk bundle browser.
 */

const ALIASES: Record<string, string> = {
  // runtime / framework
  "next.js": "nextdotjs",
  next: "nextdotjs",
  nextjs: "nextdotjs",
  "node.js": "nodedotjs",
  node: "nodedotjs",
  nodejs: "nodedotjs",
  vue: "vuedotjs",
  "vue.js": "vuedotjs",
  nuxt: "vuedotjs",
  "tailwind css": "tailwindcss",
  tailwind: "tailwindcss",
  express: "express",
  "express.js": "express",
  "socket.io": "socketdotio",
  // mobile / desktop
  android: "android",
  kotlin: "kotlin",
  flutter: "flutter",
  dart: "dart",
  swift: "swift",
  electron: "electron",
  // bahasa
  ts: "typescript",
  typescript: "typescript",
  js: "javascript",
  javascript: "javascript",
  golang: "go",
  "c++": "cplusplus",
  cpp: "cplusplus",
  // infrastruktur
  "cloudflare workers": "cloudflare",
  workers: "cloudflare",
  cf: "cloudflare",
  "github actions": "github",
  actions: "github",
  postgres: "postgresql",
  "postgresql": "postgresql",
  sqlite: "sqlite",
  mongo: "mongodb",
  "html": "html5",
  "html5": "html5",
  css: "css3",
  "css3": "css3",
  sass: "sass",
  scss: "sass",
  // produk khas
  shizuku: "android",
  tailscale: "tailscale",
  "jetpack compose": "jetpackcompose",
  compose: "jetpackcompose",
  "c#": "sharp",
  csharp: "sharp",
  "obs studio": "obsstudio",
  obs: "obsstudio",
  // label yang memang tidak punya logo resmi -> pakai titik warna (gaya GitHub)
  webrtc: "",
  websocket: "",
  websockets: "",
  multiplayer: "",
  canvas: "",
  midtrans: "",
  powershell: "",
};

const BY_TITLE = new Map<string, TechIcon>(
  Object.values(TECH_ICONS).map((i) => [i.title.toLowerCase(), i])
);

/** Cari ikon dari label bebas. `null` = belum punya logo resmi. */
export function resolveTech(label: string): TechIcon | null {
  const raw = (label || "").trim().toLowerCase();
  if (!raw) return null;

  // 1) slug langsung (kalau admin memakai slug simple-icons)
  if (TECH_ICONS[raw]) return TECH_ICONS[raw];

  // 2) alias manual
  const alias = ALIASES[raw];
  if (alias && TECH_ICONS[alias]) return TECH_ICONS[alias];

  // 3) nama resmi (case-insensitive)
  const byName = BY_TITLE.get(raw);
  if (byName) return byName;

  // 4) tebakan: buang spasi/titik/tanda hubung ("Next JS" -> "nextjs")
  const squeezed = raw.replace(/[\s.\-_]/g, "");
  if (TECH_ICONS[squeezed]) return TECH_ICONS[squeezed];
  const guess = Object.values(TECH_ICONS).find(
    (i) => i.title.toLowerCase().replace(/[\s.\-_]/g, "") === squeezed
  );
  return guess || null;
}

/**
 * Peta kecil untuk halaman publik: { "kotlin": {hex, path, title}, … }.
 * Hanya tech yang benar-benar dipakai project — biasanya <20 entri, jadi
 * payload /api/data tetap ramping (±4 KB gzip) dan komponen client tidak
 * perlu mengunduh simple-icons.
 */
export function buildTechIndex(labels: string[]): Record<string, TechIcon> {
  const out: Record<string, TechIcon> = {};
  for (const label of labels) {
    const key = label.trim().toLowerCase();
    if (!key || out[key]) continue;
    const icon = resolveTech(label);
    if (icon) out[key] = icon;
  }
  return out;
}

type WithProjects = { projects: { stack: string[] }[] };

/**
 * Tempel `techIndex` ke store sebelum dikirim ke komponen publik.
 * Pola sama seperti `withPayReady`: field turunan yang tidak disimpan di DB.
 */
export function withTechIndex<T extends WithProjects>(store: T): T & {
  techIndex: Record<string, TechIcon>;
} {
  const labels = store.projects.flatMap((p) => p.stack || []);
  return { ...store, techIndex: buildTechIndex(labels) };
}
