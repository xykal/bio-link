import { createClient } from "@supabase/supabase-js";
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
//  - If SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set  -> use Supabase (prod / Vercel)
//  - Otherwise -> fall back to a JSON file (local dev)
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

const TABLE = "bio_store";
const ROW_ID = 1;

function getClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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
    links: Array.isArray(parsed.links)
      ? parsed.links
      : [...DEFAULT_STORE.links],
  };
}

// ---------------------------------------------------------------------------
//  Supabase-backed
// ---------------------------------------------------------------------------
async function sbRead(): Promise<Store> {
  const client = getClient();
  const { data, error } = await client
    .from(TABLE)
    .select("data")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase read error: ${error.message}`);
  }

  if (!data) {
    // seed
    const store = normalize({});
    await sbWrite(store);
    return store;
  }
  return normalize(data.data);
}

async function sbWrite(store: Store): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from(TABLE)
    .upsert({ id: ROW_ID, data: store }, { onConflict: "id" });

  if (error) {
    throw new Error(`Supabase write error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
//  File-backed (local dev fallback)
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
  return useSupabase ? sbRead() : fileRead();
}

export async function writeStore(store: Store): Promise<void> {
  return useSupabase ? sbWrite(store) : fileWrite(store);
}

export { useSupabase };
