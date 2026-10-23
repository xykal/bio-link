import crypto, { randomUUID } from "crypto";
import { getTechIcon } from "./stackIcons";
import { isAllowedLinkUrl } from "./links";
import { d1Available, d1Query } from "./d1";
import { cacheGet, cacheSet, cacheInvalidate } from "./storecache";

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

// Hapus media Cloudinary dari kumpulan story (dipakai perawatan manual/cron).
export async function destroyStoryMedia(stories: Story[]): Promise<void> {
  const destroys = stories
    .filter((s) => s.mediaPublicId && s.mediaResourceType)
    .map((s) => destroyCloudinary(s.mediaPublicId as string, s.mediaResourceType as string));
  if (destroys.length) await Promise.allSettled(destroys);
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

export type ProfileFrameStyle = "none" | "morph" | "cartoon" | "paper" | "neon" | "glass";

export type AvatarOffset = { x: number; y: number }; // x: % lebar kartu, y: % tinggi avatar

export type PageBackground = {
  darkColor: string;
  lightColor: string;
  glowStrength: number; // persen, 0..40
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
  avatarOffset?: AvatarOffset; // posisi bingkai avatar yang bisa di-drag
  frameStyle?: ProfileFrameStyle; // preset bingkai visual, mengikuti bentuk avatar
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
  keywords: string[]; // kata kunci pencarian (meta keywords + JSON-LD knowsAbout)
  googleVerification: string; // isi content dari <meta name="google-site-verification">
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

// ===== Perawatan server (menu "Perawatan" di panel admin) =====
// Log + konfigurasi perawatan berkala; cron Vercel memanggil /api/cron/maintenance.
export type MaintenanceTrigger = "manual" | "cron";

export type MaintenanceLogEntry = {
  at: number;
  trigger: MaintenanceTrigger;
  ok: boolean;
  summary: string;
  storiesPruned: number;
  visitsPruned: number;
  visitorsPruned: number;
  cacheFlushed: boolean;
  error?: string;
};

export type MaintenanceConfig = {
  autoEnabled: boolean; // cron jalan / dihentikan sementara
  retentionDays: number; // retensi data analytics (visits & visitors lama)
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
  background: PageBackground;
  linkShape: LinkShape;
  stackAlign: StackAlign;
  linkLayout: LinkLayout;
  bubble: Bubble;
  sections: Sections;
  branding: Branding;
  projects: ProjectItem[];
  products: ProductItem[];
  shop: ShopConfig;
  tabs: NavTabs;
  donation: DonationConfig;
  maintenance: MaintenanceConfig & { log: MaintenanceLogEntry[] };
};

// ===== Halaman Project & Shop (tab terpisah di halaman publik) =====
export type ProjectStatus = "live" | "beta" | "soon" | "archived";

export type ProjectItem = {
  id: string;
  title: string;
  description: string;
  image: string; // cover (Cloudinary / URL)
  stack: string[]; // teknologi, mis. ["Kotlin", "Shizuku"]
  status: ProjectStatus;
  demoUrl: string;
  repoUrl: string;
  featured: boolean;
  order: number;
  enabled: boolean;
};

export type ProductKind = "digital" | "service" | "physical";

export type ProductItem = {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number; // rupiah
  originalPrice: number; // 0 = tidak ada harga coret
  category: string;
  badge: string;
  stock: number; // -1 = stok tak terbatas
  kind: ProductKind;
  order: number;
  enabled: boolean;
};

export type ShopConfig = {
  enabled: boolean;
  headline: string;
  note: string;
  methods: string[]; // metode pembayaran Pakasir, mis. ["qris"]
  /** Hanya dikirim ke client (runtime), tidak disimpan: true kalau kredensial Pakasir ada. */
  payReady?: boolean;
};

// Kartu banner donasi di bawah link. Url ke platform donasi (Saweria/Trakteer/dll).
export type DonationConfig = {
  enabled: boolean;
  headline: string;
  subtitle: string;
  note: string;
  url: string;
  ctaLabel: string;
  target: number; // 0 = progress bar disembunyikan
  raised: number;
  sound: boolean; // efek suara koin saat kartu diklik
};

// Tab yang tampil di halaman publik (Bio selalu ada).
export type NavTabs = {
  projects: boolean;
  shop: boolean;
};

export const PROJECT_STATUSES: ProjectStatus[] = ["live", "beta", "soon", "archived"];
export const PRODUCT_KINDS: ProductKind[] = ["digital", "service", "physical"];
export const SHOP_METHODS = ["qris", "bni_va", "bri_va", "permata_va", "cimb_niaga_va"];

// ---------------------------------------------------------------------------
//  Cloudflare D1 (REST API) or local file fallback
// ---------------------------------------------------------------------------
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
    avatarOffset: { x: 0, y: 0 },
    frameStyle: "none",
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
      url: "https://github.com/xykal",
      icon: "github",
      order: 4,
      enabled: true,
    },
  ],
  social: {
    instagram: "https://instagram.com/haekal",
    tiktok: "https://tiktok.com/@haekal",
    youtube: "https://youtube.com/@haekal",
    github: "https://github.com/xykal",
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
    { id: randomUUID(), name: "Haekal", role: "Founder", avatar: "", url: "https://github.com/xykal" },
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
    // Kata kunci awal: brand + nama project + topik yang memang dibahas.
    // Google tidak memakai meta keywords, tapi Bing/Yandex masih, dan daftar
    // ini juga dipakai untuk JSON-LD `knowsAbout`.
    keywords: [
      "Haekal",
      "xykal",
      "XySpace",
      "XyCloud",
      "XyCloudStore",
      "XyDesk Remote",
      "AppPerms",
      "DLAja",
      "XyDownloader",
      "Nyawit Live",
      "XyRDP",
      "remote desktop browser",
      "aplikasi Android",
      "tool Shizuku",
      "open source Indonesia",
      "link in bio",
    ],
    googleVerification: "",
  },
  theme: "dark",
  background: { darkColor: "#08080d", lightColor: "#f7f7f9", glowStrength: 22 },
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
  projects: [
    {
      id: randomUUID(),
      title: "XyDesk Remote",
      description:
        "Remote desktop Windows langsung dari browser — sesi RDP nyala dalam hitungan detik tanpa pasang aplikasi.",
      // Cover di-host lokal (public/covers, ~16 KB/WebP). Dulu pakai kartu OG
      // GitHub langsung: berat, kena rate-limit, dan bikin scroll tersendat.
      image: "/covers/XyDesk-Remote.webp",
      stack: ["Next.js", "TypeScript", "Tailscale"],
      status: "live",
      demoUrl: "https://rdp.xydesk.my.id",
      repoUrl: "https://github.com/xykal/XyDesk-Remote",
      featured: true,
      order: 0,
      enabled: true,
    },
    {
      id: randomUUID(),
      title: "AppPerms",
      description:
        "Kelola izin aplikasi Android & display-over-other-apps lewat Shizuku, tanpa root dan tanpa ribet ADB.",
      image: "/covers/AppPerms.webp",
      stack: ["Kotlin", "Android", "Shizuku"],
      status: "live",
      demoUrl: "https://appsperms.xyverse.my.id/",
      repoUrl: "https://github.com/xykal/AppPerms",
      featured: true,
      order: 1,
      enabled: true,
    },
    {
      id: randomUUID(),
      title: "DLAja · XyDownloader",
      description:
        "Downloader TikTok: video tanpa watermark, MP3, slide foto, sampai Live Photo — ringan dan offline-first.",
      image: "/covers/XyDownloader.webp",
      stack: ["Kotlin", "Jetpack Compose"],
      status: "live",
      demoUrl: "https://dlaja.xyverse.my.id",
      repoUrl: "https://github.com/xykal/XyDownloader",
      featured: true,
      order: 2,
      enabled: true,
    },
    {
      id: randomUUID(),
      title: "Nyawit Live",
      description:
        "Game 3D multiplayer bertema perkebunan sawit & haulage canter, dibangun dengan engine native buatan sendiri.",
      image: "/covers/nyawit-live.webp",
      stack: ["C#", "Unity", "Multiplayer"],
      status: "beta",
      demoUrl: "https://nyawit.xyverse.my.id",
      repoUrl: "https://github.com/xykal/nyawit-live",
      featured: false,
      order: 3,
      enabled: true,
    },
    {
      id: randomUUID(),
      title: "XyRDP",
      description:
        "Windows RDP 6 jam gratis lewat GitHub Actions + Tailscale, tinggal fork dan jalankan workflow.",
      image: "/covers/XyRDP.webp",
      stack: ["PowerShell", "GitHub Actions", "Tailscale"],
      status: "live",
      demoUrl: "",
      repoUrl: "https://github.com/xykal/XyRDP",
      featured: false,
      order: 4,
      enabled: true,
    },
    {
      id: randomUUID(),
      title: "XyCloudStore",
      description:
        "Sewa PC cloud, toko akun digital, CS realtime, dan dompet dalam satu tempat.",
      image: "/covers/XyCloudStore.webp",
      stack: ["Next.js", "Cloudflare", "Midtrans"],
      status: "live",
      demoUrl: "https://xycloud.my.id",
      repoUrl: "https://github.com/xykal/XyCloudStore",
      featured: false,
      order: 5,
      enabled: true,
    },
    {
      id: randomUUID(),
      title: "kilat-motion",
      description:
        "Editor motion graphics native Android untuk bikin animasi & video jedag-jedug tanpa watermark.",
      image: "/covers/kilat-motion.webp",
      stack: ["Kotlin", "Android", "Canvas"],
      status: "beta",
      demoUrl: "",
      repoUrl: "https://github.com/xykal/kilat-motion",
      featured: false,
      order: 6,
      enabled: true,
    },
  ],
  products: [],
  shop: {
    enabled: false,
    headline: "Shop",
    note: "Pembayaran otomatis via QRIS Pakasir. Setelah bayar, pesanan diproses manual maksimal 1x24 jam.",
    methods: ["qris"],
  },
  tabs: { projects: true, shop: false },
  donation: {
    enabled: true,
    headline: "Traktir Haekal Kopi",
    subtitle:
      "Bantu biaya server XyCloud & waktu ngoding project open-source. Sekecil apa pun tetap kepake.",
    note: "Saweria · QRIS, e-wallet, pulsa",
    url: "https://saweria.co/kallsptra",
    ctaLabel: "Dukung Sekarang",
    target: 0,
    raised: 0,
    sound: true,
  },
  maintenance: { autoEnabled: true, retentionDays: 30, log: [] },
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
      avatarOffset: {
        x: Math.max(-42, Math.min(42, Number((parsed.profile as Profile | undefined)?.avatarOffset?.x) || 0)),
        y: Math.max(-40, Math.min(120, Number((parsed.profile as Profile | undefined)?.avatarOffset?.y) || 0)),
      },
      frameStyle: (["none", "morph", "cartoon", "paper", "neon", "glass"] as const).includes(
        (parsed.profile as Profile | undefined)?.frameStyle as never
      )
        ? (parsed.profile as Profile).frameStyle
        : d.profile.frameStyle,
      customShape:
        typeof (parsed.profile || {}).customShape === "string"
          ? ((parsed.profile as Profile).customShape || "").slice(0, 8000)
          : "",
    },
    links: Array.isArray(parsed.links)
      ? parsed.links
          .filter((link) => link && typeof link.title === "string" && isAllowedLinkUrl(link.url))
          .slice(0, 100)
          .map((l) => ({
            id: typeof l.id === "string" && l.id ? l.id.slice(0, 80) : randomUUID(),
            title: l.title.trim().slice(0, 120),
            url: l.url.trim(),
            icon: typeof l.icon === "string" && l.icon.length <= 40 ? l.icon : "link",
            order: typeof l.order === "number" ? l.order : 0,
            enabled: l.enabled !== false,
            gate: l.gate === "rules" ? "rules" : "none",
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
    seo: {
      ...d.seo,
      ...(parsed.seo || {}),
      // Batas aman: maks 30 kata kunci, masing-masing 40 karakter.
      keywords: Array.isArray(parsed.seo?.keywords)
        ? parsed.seo!.keywords
            .filter((k): k is string => typeof k === "string" && Boolean(k.trim()))
            .map((k) => k.trim().slice(0, 40))
            .slice(0, 30)
        : d.seo.keywords,
      googleVerification:
        typeof parsed.seo?.googleVerification === "string"
          ? parsed.seo.googleVerification.trim().slice(0, 120)
          : d.seo.googleVerification,
    },
    theme: parsed.theme === "light" ? "light" : "dark",
    background: {
      darkColor:
        typeof parsed.background?.darkColor === "string" && /^#[0-9a-fA-F]{6}$/.test(parsed.background.darkColor)
          ? parsed.background.darkColor
          : d.background.darkColor,
      lightColor:
        typeof parsed.background?.lightColor === "string" && /^#[0-9a-fA-F]{6}$/.test(parsed.background.lightColor)
          ? parsed.background.lightColor
          : d.background.lightColor,
      glowStrength: Math.max(
        0,
        Math.min(40, Number.isFinite(parsed.background?.glowStrength) ? parsed.background!.glowStrength : d.background.glowStrength)
      ),
    },
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
    projects: Array.isArray(parsed.projects)
      ? parsed.projects
          .filter((p) => p && typeof p.title === "string" && p.title.trim())
          .slice(0, 60)
          .map((p, i) => ({
            id: typeof p.id === "string" && p.id ? p.id.slice(0, 80) : randomUUID(),
            title: p.title.trim().slice(0, 80),
            description: typeof p.description === "string" ? p.description.slice(0, 400) : "",
            image: typeof p.image === "string" ? p.image.slice(0, 500) : "",
            stack: Array.isArray(p.stack)
              ? p.stack
                  .filter((t): t is string => typeof t === "string" && Boolean(t.trim()))
                  .map((t) => t.trim().slice(0, 24))
                  .slice(0, 8)
              : [],
            status: PROJECT_STATUSES.includes(p.status as ProjectStatus)
              ? (p.status as ProjectStatus)
              : "live",
            demoUrl: typeof p.demoUrl === "string" && isAllowedLinkUrl(p.demoUrl) ? p.demoUrl.slice(0, 500) : "",
            repoUrl: typeof p.repoUrl === "string" && isAllowedLinkUrl(p.repoUrl) ? p.repoUrl.slice(0, 500) : "",
            featured: p.featured === true,
            order: typeof p.order === "number" ? p.order : i,
            enabled: p.enabled !== false,
          }))
      : [...d.projects],
    products: Array.isArray(parsed.products)
      ? parsed.products
          .filter((p) => p && typeof p.name === "string" && p.name.trim())
          .slice(0, 60)
          .map((p, i) => ({
            id: typeof p.id === "string" && p.id ? p.id.slice(0, 80) : randomUUID(),
            name: p.name.trim().slice(0, 100),
            description: typeof p.description === "string" ? p.description.slice(0, 400) : "",
            image: typeof p.image === "string" ? p.image.slice(0, 500) : "",
            price:
              typeof p.price === "number" && Number.isFinite(p.price)
                ? Math.max(0, Math.round(p.price))
                : 0,
            originalPrice:
              typeof p.originalPrice === "number" && Number.isFinite(p.originalPrice)
                ? Math.max(0, Math.round(p.originalPrice))
                : 0,
            category: typeof p.category === "string" ? p.category.slice(0, 40) : "",
            badge: typeof p.badge === "string" ? p.badge.slice(0, 24) : "",
            stock: typeof p.stock === "number" && Number.isFinite(p.stock) ? Math.round(p.stock) : -1,
            kind: PRODUCT_KINDS.includes(p.kind as ProductKind) ? (p.kind as ProductKind) : "digital",
            order: typeof p.order === "number" ? p.order : i,
            enabled: p.enabled !== false,
          }))
      : [],
    shop: {
      enabled: parsed.shop?.enabled === true,
      headline:
        typeof parsed.shop?.headline === "string" ? parsed.shop.headline.slice(0, 60) : d.shop.headline,
      note: typeof parsed.shop?.note === "string" ? parsed.shop.note.slice(0, 300) : d.shop.note,
      methods: Array.isArray(parsed.shop?.methods)
        ? parsed.shop!.methods.filter((m): m is string => SHOP_METHODS.includes(m)).slice(0, 5)
        : d.shop.methods,
    },
    donation: {
      enabled: parsed.donation?.enabled === true,
      headline:
        typeof parsed.donation?.headline === "string" && parsed.donation.headline.trim()
          ? parsed.donation.headline.trim().slice(0, 60)
          : d.donation.headline,
      subtitle:
        typeof parsed.donation?.subtitle === "string"
          ? parsed.donation.subtitle.slice(0, 220)
          : d.donation.subtitle,
      note: typeof parsed.donation?.note === "string" ? parsed.donation.note.slice(0, 80) : "",
      url:
        typeof parsed.donation?.url === "string" && isAllowedLinkUrl(parsed.donation.url)
          ? parsed.donation.url.slice(0, 500)
          : "",
      ctaLabel:
        typeof parsed.donation?.ctaLabel === "string" && parsed.donation.ctaLabel.trim()
          ? parsed.donation.ctaLabel.trim().slice(0, 32)
          : d.donation.ctaLabel,
      target:
        typeof parsed.donation?.target === "number" && Number.isFinite(parsed.donation.target)
          ? Math.max(0, Math.round(parsed.donation.target))
          : 0,
      raised:
        typeof parsed.donation?.raised === "number" && Number.isFinite(parsed.donation.raised)
          ? Math.max(0, Math.round(parsed.donation.raised))
          : 0,
      sound: parsed.donation?.sound !== false,
    },
    tabs: {
      projects: parsed.tabs?.projects !== false,
      shop: parsed.tabs?.shop === true,
    },
    maintenance: {
      autoEnabled: parsed.maintenance?.autoEnabled !== false,
      retentionDays:
        typeof parsed.maintenance?.retentionDays === "number" &&
        parsed.maintenance.retentionDays >= 7 &&
        parsed.maintenance.retentionDays <= 365
          ? Math.round(parsed.maintenance.retentionDays)
          : 30,
      log: Array.isArray(parsed.maintenance?.log)
        ? parsed.maintenance!.log
            .filter(
              (e) =>
                e &&
                typeof e.at === "number" &&
                (e.trigger === "manual" || e.trigger === "cron")
            )
            .slice(-30)
            .map((e) => ({
              at: e.at,
              trigger: e.trigger as MaintenanceTrigger,
              ok: e.ok !== false,
              summary: typeof e.summary === "string" ? e.summary.slice(0, 300) : "",
              storiesPruned:
                typeof e.storiesPruned === "number" && e.storiesPruned >= 0
                  ? Math.floor(e.storiesPruned)
                  : 0,
              visitsPruned:
                typeof e.visitsPruned === "number" && e.visitsPruned >= 0
                  ? Math.floor(e.visitsPruned)
                  : 0,
              visitorsPruned:
                typeof e.visitorsPruned === "number" && e.visitorsPruned >= 0
                  ? Math.floor(e.visitorsPruned)
                  : 0,
              cacheFlushed: e.cacheFlushed === true,
              error: typeof e.error === "string" ? e.error.slice(0, 200) : undefined,
            }))
        : [],
    },
  };
}

// ---------------------------------------------------------------------------
//  Cloudflare D1
// ---------------------------------------------------------------------------
async function d1Read(): Promise<Store> {
  const rows = await d1Query(`SELECT data FROM ${TABLE} WHERE id = ?`, [ROW_ID]);
  const first = rows?.[0]?.results?.[0] as { data?: string } | undefined;
  if (!first?.data) {
    const store = normalize({});
    await d1Write(store);
    return store;
  }
  return normalize(JSON.parse(first.data));
}

async function d1Write(store: Store): Promise<void> {
  const data = JSON.stringify(store);
  await d1Query(
    `INSERT INTO ${TABLE} (id, data) VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
    [ROW_ID, data]
  );
}

// ---------------------------------------------------------------------------
//  Local file fallback (dev)
// ---------------------------------------------------------------------------
// fs di-import dinamis: di Cloudflare Workers (workerd) filesystem tidak bisa
// ditulis, jadi modul node:fs tidak boleh ikut ke bundle utama.
async function dataPaths() {
  const [fsMod, pathMod] = await Promise.all([import("node:fs"), import("node:path")]);
  // Bentuk modul bisa beda antar bundler (named export vs hanya default).
  const fs = fsMod.promises ?? fsMod.default?.promises;
  const join = pathMod.join ?? pathMod.default?.join;
  if (!fs || !join) throw new Error("node:fs / node:path tidak tersedia di runtime ini");
  const dir = join(process.cwd(), "data");
  return { fs, dir, file: join(dir, "store.json") };
}

async function ensureFile() {
  const { fs, dir, file } = await dataPaths();
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify(DEFAULT_STORE, null, 2), "utf-8");
  }
}
async function fileRead(): Promise<Store> {
  const { fs, file } = await dataPaths();
  await ensureFile();
  return normalize(JSON.parse(await fs.readFile(file, "utf-8")));
}
async function fileWrite(store: Store): Promise<void> {
  const { fs, file } = await dataPaths();
  await ensureFile();
  await fs.writeFile(file, JSON.stringify(store, null, 2), "utf-8");
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
  // Micro-cache: hemat pemanggilan REST API D1 (lihat lib/storecache.ts).
  const hit = cacheGet();
  if (hit) return hit;

  const raw = d1Available() ? await d1Read() : await fileRead();
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
    await destroyStoryMedia(expired);
  }
  cacheSet(store);
  return store;
}
export async function writeStore(store: Store): Promise<void> {
  // Buang cache sebelum menulis supaya data basi tidak pernah terbaca.
  cacheInvalidate();
  const res = d1Available() ? await d1Write(store) : await fileWrite(store);
  cacheSet(store);
  // Halaman "/" sekarang SSR (dynamic), jadi tidak ada cache HTML yang perlu
  // di-revalidate; micro-cache di atas sudah dibuang sebelum menulis.
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/");
  } catch {
    // Route dynamic: revalidatePath tidak wajib, aman kalau tidak tersedia.
  }
  return res;
}
export { STORY_TTL_MS as STORY_TTL, pruneExpiredStories };
