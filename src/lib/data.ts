import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type LinkItem = {
  id: string;
  title: string;
  url: string;
  icon: string; // icon key
  order: number;
  enabled: boolean;
  gate?: "none" | "rules"; // when "rules", visitor must confirm rules before opening
  kind?: "link" | "join_group" | "channel"; // used for labelling
};

export type Profile = {
  name: string;
  handle: string;
  bio: string;
  avatar: string; // medium URL from Cloudinary (optional)
  banner: string; // medium URL from Cloudinary (optional)
  accent: string; // theme accent color
};

export type Socials = {
  instagram: string;
  tiktok: string;
  youtube: string;
  github: string;
  x: string;
  facebook: string;
  linkedin: string;
  telegram: string;
  whatsapp: string;
  spotify: string;
  discord: string;
  website: string;
};

export type FontsConfig = {
  name: string; // font key for profile name
  handle: string;
  bio: string;
  linkTitle: string;
  linkLabel: string;
  brand: string;
};

export type SeoConfig = {
  title: string;
  description: string;
  favicon: string; // image url (Cloudinary) or "" for default
  ogImage: string; // OpenGraph banner url (Cloudinary)
  rulesUrl: string; // gate rules url
};

export type ThemeMode = "dark" | "light";

export type Branding = {
  enabled: boolean;
  text: string; // "Made by XySpace Tch"
};

export type Store = {
  profile: Profile;
  links: LinkItem[];
  social: Socials;
  fonts: FontsConfig;
  seo: SeoConfig;
  theme: ThemeMode;
  branding: Branding;
};

// ---------------------------------------------------------------------------
//  Cloudflare D1 (REST API) or local file fallback
// ---------------------------------------------------------------------------
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CF_DB = process.env.CLOUDFLARE_D1_DATABASE_ID || "";
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const useD1 = Boolean(CF_ACCOUNT && CF_DB && CF_TOKEN);

const TABLE = "store";
const ROW_ID = 1;

const DEFAULT_STORE: Store = {
  profile: {
    name: "Haekal",
    handle: "@haekal",
    bio: "🎨 Web, tech & digital life · Bisa aja nongkrongi hal baru ✨",
    avatar: "",
    banner: "",
    accent: "#8b5cf6",
  },
  links: [
    {
      id: randomUUID(),
      title: "Join Group WhatsApp",
      url: "https://chat.whatsapp.com",
      icon: "whatsapp",
      order: 0,
      enabled: true,
      gate: "rules",
      kind: "join_group",
    },
    {
      id: randomUUID(),
      title: "Link Saluran Telegram",
      url: "https://t.me",
      icon: "telegram",
      order: 1,
      enabled: true,
      gate: "rules",
      kind: "channel",
    },
    {
      id: randomUUID(),
      title: "Instagram",
      url: "https://instagram.com/haekal",
      icon: "instagram",
      order: 2,
      enabled: true,
    },
    {
      id: randomUUID(),
      title: "YouTube",
      url: "https://youtube.com/@haekal",
      icon: "youtube",
      order: 3,
      enabled: true,
    },
    {
      id: randomUUID(),
      title: "GitHub",
      url: "https://github.com/xykalnotkel",
      icon: "github",
      order: 4,
      enabled: true,
    },
  ],
  social: {
    instagram: "https://instagram.com/haekal",
    tiktok: "https://tiktok.com/@haekal",
    youtube: "https://youtube.com/@haekal",
    github: "https://github.com/xykalnotkel",
    x: "https://x.com",
    facebook: "",
    linkedin: "",
    telegram: "https://t.me",
    whatsapp: "",
    spotify: "",
    discord: "",
    website: "https://haekal.web.id",
  },
  fonts: {
    name: "poppins",
    handle: "space-grotesk",
    bio: "inter",
    linkTitle: "poppins",
    linkLabel: "space-grotesk",
    brand: "space-grotesk",
  },
  seo: {
    title: "Haekal · Bio Link",
    description: "Semua link Haekal dalam satu halaman — bio.haekal.web.id",
    favicon: "",
    ogImage: "",
    rulesUrl: "https://rules.xyc.my.id/docs",
  },
  theme: "dark",
  branding: { enabled: true, text: "Made by XySpace Tch" },
};

function normalize(parsed: Partial<Store>): Store {
  const d = DEFAULT_STORE;
  return {
    profile: { ...d.profile, ...(parsed.profile || {}) },
    links: Array.isArray(parsed.links)
      ? parsed.links.map((l) => ({
          id: l.id || randomUUID(),
          title: l.title ?? "",
          url: l.url ?? "",
          icon: l.icon || "link",
          order: typeof l.order === "number" ? l.order : 0,
          enabled: l.enabled !== false,
          gate: l.gate === "rules" ? "rules" : l.gate === "none" ? "none" : "none",
          kind: ["link", "join_group", "channel"].includes(l.kind as any)
            ? (l.kind as any)
            : "link",
        }))
      : [...d.links],
    social: { ...d.social, ...(parsed.social || {}) },
    fonts: { ...d.fonts, ...(parsed.fonts || {}) },
    seo: { ...d.seo, ...(parsed.seo || {}) },
    theme: parsed.theme === "light" ? "light" : "dark",
    branding: { ...d.branding, ...(parsed.branding || {}) },
  };
}

// ---------------------------------------------------------------------------
//  Cloudflare D1
// ---------------------------------------------------------------------------
async function d1Query(sql: string): Promise<any> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`D1 error: ${JSON.stringify(json.errors || json)}`);
  return json.result;
}

async function d1Read(): Promise<Store> {
  const rows = await d1Query(`SELECT data FROM ${TABLE} WHERE id = ${ROW_ID}`);
  const first = rows?.[0]?.results?.[0];
  if (!first) {
    const store = normalize({});
    await d1Write(store);
    return store;
  }
  return normalize(JSON.parse(first.data));
}

async function d1Write(store: Store): Promise<void> {
  const data = JSON.stringify(store).replace(/'/g, "''");
  await d1Query(
    `INSERT INTO ${TABLE} (id, data) VALUES (${ROW_ID}, '${data}')
     ON CONFLICT(id) DO UPDATE SET data = excluded.data;`
  );
}

// ---------------------------------------------------------------------------
//  Local file fallback (dev)
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_STORE, null, 2), "utf-8");
  }
}
async function fileRead(): Promise<Store> {
  await ensureFile();
  return normalize(JSON.parse(await fs.readFile(DATA_FILE, "utf-8")));
}
async function fileWrite(store: Store): Promise<void> {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function readStore(): Promise<Store> {
  return useD1 ? d1Read() : fileRead();
}
export async function writeStore(store: Store): Promise<void> {
  return useD1 ? d1Write(store) : fileWrite(store);
}
export { useD1 };
