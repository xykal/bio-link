import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type LinkItem = {
  id: string;
  title: string;
  url: string;
  icon: string; // icon key, "link" for auto/default
  order: number;
  enabled: boolean;
};

export type Profile = {
  name: string;
  handle: string;
  bio: string;
  avatar: string; // url or "" for initial fallback
  accent: string; // css color used for the gradient ring/buttons
};

export type Store = {
  profile: Profile;
  links: LinkItem[];
};

// ---------------------------------------------------------------------------
//  Storage selector
//  - If CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_D1_DATABASE_ID + CLOUDFLARE_API_TOKEN
//    are set  -> use Cloudflare D1 (prod / Vercel)
//  - Otherwise -> fall back to a local JSON file (dev)
// ---------------------------------------------------------------------------
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CF_DB = process.env.CLOUDFLARE_D1_DATABASE_ID || "";
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const useD1 = Boolean(CF_ACCOUNT && CF_DB && CF_TOKEN);

const TABLE = "store";
const ROW_ID = 1;

// ---------------------------------------------------------------------------
//  Default / seed data
// ---------------------------------------------------------------------------
const DEFAULT_STORE: Store = {
  profile: {
    name: "Haekal",
    handle: "@haekal",
    bio: "🎨 Web, tech & digital life · Bisa aja nongkrongi hal baru ✨",
    avatar: "",
    accent: "#8b5cf6",
  },
  links: [
    {
      id: randomUUID(),
      title: "Website",
      url: "https://haekal.web.id",
      icon: "website",
      order: 0,
      enabled: true,
    },
    {
      id: randomUUID(),
      title: "Instagram",
      url: "https://instagram.com",
      icon: "instagram",
      order: 1,
      enabled: true,
    },
    {
      id: randomUUID(),
      title: "YouTube",
      url: "https://youtube.com",
      icon: "youtube",
      order: 2,
      enabled: true,
    },
    {
      id: randomUUID(),
      title: "GitHub",
      url: "https://github.com",
      icon: "github",
      order: 3,
      enabled: true,
    },
    {
      id: randomUUID(),
      title: "X / Twitter",
      url: "https://x.com",
      icon: "x",
      order: 4,
      enabled: true,
    },
  ],
};

function normalize(parsed: Partial<Store>): Store {
  return {
    profile: { ...DEFAULT_STORE.profile, ...(parsed.profile || {}) },
    links: Array.isArray(parsed.links) ? parsed.links : [...DEFAULT_STORE.links],
  };
}

// ---------------------------------------------------------------------------
//  Cloudflare D1 (via REST API) — works from any Node.js runtime incl. Vercel
// ---------------------------------------------------------------------------
async function d1Query(sql: string): Promise<any> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`D1 error: ${JSON.stringify(json.errors || json)}`);
  }
  return json.result;
}

async function d1Read(): Promise<Store> {
  const rows = await d1Query(`SELECT data FROM ${TABLE} WHERE id = ${ROW_ID}`);
  const first = rows?.[0]?.results?.[0];
  if (!first) {
    // seed default then write
    const store = normalize({});
    await d1Write(store);
    return store;
  }
  return normalize(JSON.parse(first.data));
}

async function d1Write(store: Store): Promise<void> {
  const data = JSON.stringify(store);
  // escape single quotes for SQL
  const escaped = data.replace(/'/g, "''");
  await d1Query(
    `INSERT INTO ${TABLE} (id, data) VALUES (${ROW_ID}, '${escaped}')
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
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  return normalize(JSON.parse(raw));
}

async function fileWrite(store: Store): Promise<void> {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
//  Public API used by routes
// ---------------------------------------------------------------------------
export async function readStore(): Promise<Store> {
  return useD1 ? d1Read() : fileRead();
}

export async function writeStore(store: Store): Promise<void> {
  return useD1 ? d1Write(store) : fileWrite(store);
}

export { useD1 };
