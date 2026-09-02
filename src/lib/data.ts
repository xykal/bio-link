import { promises as fs } from "fs";
import path from "path";
import crypto, { randomUUID } from "crypto";
import { getTechIcon } from "./stackIcons";

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

export type ProfileShape =
  | "circle"
  | "squircle"
  | "rounded"
  | "blob"
  | "morph"
  | "abstract"
  | "hexagon"
  | "star"
  | "heart"
  | "octagon"
  | "diamond"
  | "leaf"
  | "shield"
  | "custom";

// Bentuk tombol link di halaman publik
export type LinkShape = "pill" | "rounded" | "soft" | "square";

// Perataan baris stack di halaman publik
export type StackAlign = "left" | "center" | "right";

// Gelembung pesan (bubble) di samping foto profil — tampil untuk semua orang.
export type BubbleStyle =
  | "speech"
  | "pill"
  | "glass"
  | "neon"
  | "outline"
  | "gradient"
  | "note"
  | "badge"
  | "tiktok"
  | "instagram";

export type BubblePosition =
  | "top-left"
  | "top-right"
  | "left"
  | "right"
  | "bottom-left"
  | "bottom-right";

export type Bubble = {
  enabled: boolean;
  text: string;
  style: BubbleStyle;
  position: BubblePosition;
  color: string; // warna custom (hex). "" = ikut aksen tema
};

// Story ala IG: foto/teks singkat yang tampil di ring profil.
export type StoryComment = {
  id: string;
  name: string;
  text: string;
  at: number; // timestamp ms
};

export type Story = {
  id: string;
  type: "image" | "text" | "video" | "audio";
  media: string; // url gambar/video/audio (untuk type image/video/audio)
  mediaPublicId?: string; // public_id Cloudinary (buat auto-destroy 24 jam)
  mediaResourceType?: "image" | "video" | "raw"; // resource_type Cloudinary
  text: string; // caption (image/video/audio) atau isi teks (text)
  bg: string; // warna/gradasi latar untuk story teks/audio
  duration: number; // detik per story (image/text/audio; video ikut panjang video)
  createdAt: number;
  likes: number;
  comments: StoryComment[];
};

// Story otomatis dihapus total setelah 24 jam.
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

// Cloudinary: dipakai untuk menghapus aset story yang kedaluwarsa (signed destroy).
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUD_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUD_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

// Hapus aset di Cloudinary (best-effort). Dipanggil saat story lewat 24 jam.
async function destroyCloudinary(publicId: string, resourceType: string): Promise<void> {
  if (!CLOUD_NAME || !CLOUD_API_KEY || !CLOUD_API_SECRET || !publicId) return;
  const timestamp = Math.round(Date.now() / 1000);
  // Parameter ditandatangani urut abjad: invalidate, public_id, timestamp.
  const toSign = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${CLOUD_API_SECRET}`;
  const signature = crypto.createHash("sha1").update(toSign, "utf8").digest("hex");
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    invalidate: "true",
    signature,
    api_key: CLOUD_API_KEY,
  });
  try {
    await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/destroy`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }
    );
  } catch {
    /* best-effort: kalau gagal, file yatim tak mengganggu */
  }
}

// Tata letak daftar link di halaman publik
export type LinkLayout = "list" | "grid" | "compact";

export const BUBBLE_STYLES: BubbleStyle[] = [
  "speech",
  "pill",
  "glass",
  "neon",
  "outline",
  "gradient",
  "note",
  "badge",
  "tiktok",
  "instagram",
];
export const BUBBLE_POSITIONS: BubblePosition[] = [
  "top-left",
  "top-right",
  "left",
  "right",
  "bottom-left",
  "bottom-right",
];
export const LINK_LAYOUTS: LinkLayout[] = ["list", "grid", "compact"];

// Satu item tech stack / keahlian. path/hex/title disimpan penuh supaya
// halaman publik tak perlu mem-bundle seluruh simple-icons (cukup render path).
export type StackItem = {
  id: string;
  slug: string; // simple-icons slug, mis. "flutter"
  title: string; // nama tampil, mis. "Flutter"
  hex: string; // warna asli logo, mis. "02569B"
  path: string; // SVG path data (viewBox 0 0 24 24)
};

// Anggota team / kontributor
export type Member = {
  id: string;
  name: string;
  role: string;
  avatar: string; // image url (opsional)
  url: string; // link profil (opsional)
};

export type Profile = {
  name: string;
  handle: string;
  bio: string;
  avatar: string; // medium URL from Cloudinary (optional)
  banner: string; // medium URL from Cloudinary (optional)
  accent: string; // theme accent color
  shape: ProfileShape;
  avatarPos?: string; // object-position foto avatar, mis. "50% 20%"
  customShape?: string; // SVG path (koordinat 0..1) utk shape="custom"
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

// Section mana saja yang tampil di halaman publik
export type Sections = {
  stack: boolean;
  team: boolean;
};

export type Store = {
  profile: Profile;
  links: LinkItem[];
  social: Socials;
  stack: StackItem[];
  team: Member[];
  stories: Story[];
  fonts: FontsConfig;
  seo: SeoConfig;
  theme: ThemeMode;
  linkShape: LinkShape;
  stackAlign: StackAlign;
  linkLayout: LinkLayout;
  bubble: Bubble;
  sections: Sections;
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

// Bangun StackItem lengkap dari slug (server-side; pakai simple-icons).
function makeStack(slug: string): StackItem | null {
  const ic = getTechIcon(slug);
  return ic
    ? { id: randomUUID(), slug: ic.slug, title: ic.title, hex: ic.hex, path: ic.path }
    : null;
}

const DEFAULT_STACK_SLUGS = [
  "flutter", "dart", "kotlin", "android", "nextdotjs",
  "react", "typescript", "vite", "tailwindcss", "nodedotjs",
];

const DEFAULT_STORE: Store = {
  profile: {
    name: "Haekal",
    handle: "@haekal",
    bio: "Web, tech & digital life. Kadang nongkrongin hal baru.",
    avatar: "",
    banner: "",
    accent: "#8b5cf6",
    shape: "circle",
    avatarPos: "50% 50%",
    customShape: "",
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
  stack: DEFAULT_STACK_SLUGS.map(makeStack).filter((x): x is StackItem => x !== null),
  team: [
    { id: randomUUID(), name: "Haekal", role: "Founder", avatar: "", url: "https://github.com/xykalnotkel" },
    { id: randomUUID(), name: "XySpace", role: "Team", avatar: "", url: "" },
  ],
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
    rulesUrl: "https://rules.xyc.my.id/",
  },
  theme: "dark",
  linkShape: "rounded",
  stackAlign: "right",
  linkLayout: "list",
  bubble: {
    enabled: true,
    text: "Halo! Selamat datang",
    style: "speech",
    position: "top-right",
    color: "",
  },
  stories: [],
  sections: { stack: true, team: true },
  branding: { enabled: true, text: "Made by XySpace Tch" },
};

export function normalize(parsed: Partial<Store>): Store {
  const d = DEFAULT_STORE;
  return {
    profile: {
      ...d.profile,
      ...(parsed.profile || {}),
      avatarPos:
        typeof (parsed.profile || {}).avatarPos === "string"
          ? (parsed.profile as Profile).avatarPos
          : d.profile.avatarPos,
      customShape:
        typeof (parsed.profile || {}).customShape === "string"
          ? ((parsed.profile as Profile).customShape || "").slice(0, 8000)
          : "",
    },
    links: Array.isArray(parsed.links)
      ? parsed.links.map((l) => ({
          id: l.id || randomUUID(),
          title: l.title ?? "",
          url: l.url ?? "",
          icon: l.icon || "link",
          order: typeof l.order === "number" ? l.order : 0,
          enabled: l.enabled !== false,
          gate: l.gate === "rules" ? "rules" : l.gate === "none" ? "none" : "none",
          kind: (["link", "join_group", "channel"] as NonNullable<LinkItem["kind"]>[]).includes(
            l.kind as NonNullable<LinkItem["kind"]>
          )
            ? (l.kind as NonNullable<LinkItem["kind"]>)
            : "link",
        }))
      : [...d.links],
    social: { ...d.social, ...(parsed.social || {}) },
    stack: Array.isArray(parsed.stack)
      ? parsed.stack
          .map((s) => {
            const slug = typeof s?.slug === "string" ? s.slug.trim() : "";
            const ic = getTechIcon(slug);
            if (!ic) return null;
            return {
              id: typeof s.id === "string" && s.id ? s.id : randomUUID(),
              slug: ic.slug,
              title: ic.title,
              hex: ic.hex,
              path: ic.path,
            };
          })
          .filter((x): x is StackItem => x !== null)
      : [...d.stack],
    team: Array.isArray(parsed.team)
      ? parsed.team
          .filter((m) => m && typeof m.name === "string" && m.name.trim())
          .map((m) => ({
            id: m.id || randomUUID(),
            name: m.name.trim(),
            role: typeof m.role === "string" ? m.role : "",
            avatar: typeof m.avatar === "string" ? m.avatar : "",
            url: typeof m.url === "string" ? m.url : "",
          }))
      : [...d.team],
    stories: Array.isArray(parsed.stories)
      ? parsed.stories
          .filter(
            (s) =>
              s &&
              (s.type === "image" ||
                s.type === "text" ||
                s.type === "video" ||
                s.type === "audio")
          )
          .slice(0, 30)
          .map((s) => ({
            id: typeof s.id === "string" && s.id ? s.id : randomUUID(),
            type:
              s.type === "text"
                ? "text"
                : s.type === "video"
                  ? "video"
                  : s.type === "audio"
                    ? "audio"
                    : "image",
            media: typeof s.media === "string" ? s.media.slice(0, 500) : "",
            mediaPublicId:
              typeof s.mediaPublicId === "string" ? s.mediaPublicId.slice(0, 300) : "",
            mediaResourceType:
              s.mediaResourceType === "image" ||
              s.mediaResourceType === "video" ||
              s.mediaResourceType === "raw"
                ? s.mediaResourceType
                : undefined,
            text: typeof s.text === "string" ? s.text.slice(0, 280) : "",
            bg: typeof s.bg === "string" ? s.bg.slice(0, 120) : "",
            duration:
              typeof s.duration === "number" && s.duration >= 1 && s.duration <= 120
                ? Math.round(s.duration)
                : 5,
            createdAt: typeof s.createdAt === "number" ? s.createdAt : Date.now(),
            likes: typeof s.likes === "number" && s.likes >= 0 ? Math.floor(s.likes) : 0,
            comments: Array.isArray(s.comments)
              ? s.comments
                  .filter((c) => c && typeof c.text === "string" && c.text.trim())
                  .slice(0, 100)
                  .map((c) => ({
                    id: typeof c.id === "string" && c.id ? c.id : randomUUID(),
                    name: typeof c.name === "string" ? c.name.slice(0, 40) : "Anon",
                    text: c.text.slice(0, 200),
                    at: typeof c.at === "number" ? c.at : Date.now(),
                  }))
              : [],
          }))
      : [],
    fonts: { ...d.fonts, ...(parsed.fonts || {}) },
    seo: { ...d.seo, ...(parsed.seo || {}) },
    theme: parsed.theme === "light" ? "light" : "dark",
    linkShape: (["pill", "rounded", "soft", "square"] as const).includes(
      parsed.linkShape as never
    )
      ? (parsed.linkShape as Store["linkShape"])
      : "rounded",
    stackAlign: (["left", "center", "right"] as const).includes(parsed.stackAlign as never)
      ? (parsed.stackAlign as Store["stackAlign"])
      : "right",
    linkLayout: LINK_LAYOUTS.includes(parsed.linkLayout as never)
      ? (parsed.linkLayout as Store["linkLayout"])
      : "list",
    bubble: {
      enabled: (parsed.bubble?.enabled ?? d.bubble.enabled) === true,
      text:
        typeof parsed.bubble?.text === "string"
          ? parsed.bubble.text.slice(0, 140)
          : d.bubble.text,
      style: BUBBLE_STYLES.includes(parsed.bubble?.style as never)
        ? (parsed.bubble!.style as BubbleStyle)
        : d.bubble.style,
      position: BUBBLE_POSITIONS.includes(parsed.bubble?.position as never)
        ? (parsed.bubble!.position as BubblePosition)
        : d.bubble.position,
      color:
        typeof parsed.bubble?.color === "string" ? parsed.bubble.color.slice(0, 32) : "",
    },
    sections: {
      stack: parsed.sections?.stack !== false,
      team: parsed.sections?.team !== false,
    },
    branding: { ...d.branding, ...(parsed.branding || {}) },
  };
}

// ---------------------------------------------------------------------------
//  Cloudflare D1
// ---------------------------------------------------------------------------
type D1ResultSet = { results?: Array<Record<string, unknown>> };
async function d1QueryOnce(sql: string): Promise<D1ResultSet[]> {
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
// D1 kadang balik "internal error" sesaat (blip Cloudflare). Retry beberapa kali
// biar halaman gak 500 cuma karena gangguan sepersekian detik.
async function d1Query(sql: string): Promise<D1ResultSet[]> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await d1QueryOnce(sql);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function d1Read(): Promise<Store> {
  const rows = await d1Query(`SELECT data FROM ${TABLE} WHERE id = ${ROW_ID}`);
  const first = rows?.[0]?.results?.[0] as { data?: string } | undefined;
  if (!first?.data) {
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

// Buang story yang sudah lewat 24 jam (auto-hapus total). Kembalikan juga story
// yang dihapus agar medianya bisa dibuang dari Cloudinary.
function pruneExpiredStories(store: Store): {
  store: Store;
  changed: boolean;
  expired: Story[];
} {
  const now = Date.now();
  const kept: Story[] = [];
  const expired: Story[] = [];
  for (const s of store.stories) {
    if (now - (s.createdAt || 0) < STORY_TTL_MS) kept.push(s);
    else expired.push(s);
  }
  if (expired.length === 0) return { store, changed: false, expired };
  return { store: { ...store, stories: kept }, changed: true, expired };
}

export async function readStore(): Promise<Store> {
  const raw = useD1 ? await d1Read() : await fileRead();
  const { store, changed, expired } = pruneExpiredStories(raw);
  if (changed) {
    // Persist penghapusan. Di fs read-only (serverless file-mode) gagal diam-diam;
    // story tetap disembunyikan dari hasil baca.
    try {
      await writeStore(store);
    } catch {
      /* ignore */
    }
    // Hapus media story kedaluwarsa dari Cloudinary (best-effort, di-await agar
    // tuntas sebelum function selesai di serverless).
    const destroys = expired
      .filter((s) => s.mediaPublicId && s.mediaResourceType)
      .map((s) => destroyCloudinary(s.mediaPublicId as string, s.mediaResourceType as string));
    if (destroys.length) await Promise.allSettled(destroys);
  }
  return store;
}
export async function writeStore(store: Store): Promise<void> {
  return useD1 ? d1Write(store) : fileWrite(store);
}
export { useD1, STORY_TTL_MS as STORY_TTL };
