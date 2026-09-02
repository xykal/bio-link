import { promises as fs } from "fs";
import path from "path";
import { useD1, d1Query } from "./d1";
import { randomAnonName } from "./names";

// Statistik pengunjung + interaksi. Persisten: Cloudflare D1 (baris id=2 di
// tabel `store`) kalau dikonfigurasi, else file data/analytics.json (dev).
// Di serverless read-only tanpa D1, write gagal diam-diam -> tetap jalan in-memory.

export type Visit = { at: number; path: string; ref: string; ua: string };
export type LinkClick = { title: string; count: number };
export type VisitorRec = {
  name: string;
  liked: string[]; // storyId yg udah di-like (1x per visitor)
  viewed: string[]; // storyId yg udah dilihat (abu selamanya)
  at: number;
};
export type AnalyticsData = {
  total: number;
  byDay: Record<string, number>;
  visits: Visit[];
  clicks: number; // total klik link
  linkClicks: Record<string, LinkClick>; // key: linkId
  refs: Record<string, number>; // key: host referrer
  devices: Record<string, number>; // key: mobile|desktop|tablet|bot
  visitors: Record<string, VisitorRec>; // key: visitorId (anon)
};

const EMPTY: AnalyticsData = {
  total: 0,
  byDay: {},
  visits: [],
  clicks: 0,
  linkClicks: {},
  refs: {},
  devices: {},
  visitors: {},
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "analytics.json");
const TABLE = "store";
const ROW_ID = 2; // id=1 dipakai data utama; id=2 untuk analytics

let cache: AnalyticsData | null = null;

function merge(raw: Partial<AnalyticsData>): AnalyticsData {
  return {
    total: typeof raw.total === "number" ? raw.total : 0,
    byDay: raw.byDay && typeof raw.byDay === "object" ? raw.byDay : {},
    visits: Array.isArray(raw.visits) ? raw.visits : [],
    clicks: typeof raw.clicks === "number" ? raw.clicks : 0,
    linkClicks: raw.linkClicks && typeof raw.linkClicks === "object" ? raw.linkClicks : {},
    refs: raw.refs && typeof raw.refs === "object" ? raw.refs : {},
    devices: raw.devices && typeof raw.devices === "object" ? raw.devices : {},
    visitors: raw.visitors && typeof raw.visitors === "object" ? raw.visitors : {},
  };
}

async function read(): Promise<AnalyticsData> {
  if (cache) return cache;
  try {
    if (useD1) {
      const rows = await d1Query(`SELECT data FROM ${TABLE} WHERE id = ${ROW_ID}`);
      const first = rows?.[0]?.results?.[0] as { data?: string } | undefined;
      cache = first?.data ? merge(JSON.parse(first.data)) : { ...EMPTY };
    } else {
      await fs.mkdir(DATA_DIR, { recursive: true });
      cache = merge(JSON.parse(await fs.readFile(FILE, "utf-8")));
    }
  } catch {
    cache = { ...EMPTY };
  }
  return cache!;
}

async function write(data: AnalyticsData) {
  cache = data;
  try {
    if (useD1) {
      const json = JSON.stringify(data).replace(/'/g, "''");
      await d1Query(
        `INSERT INTO ${TABLE} (id, data) VALUES (${ROW_ID}, '${json}')
         ON CONFLICT(id) DO UPDATE SET data = excluded.data;`
      );
    } else {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(FILE, JSON.stringify(data), "utf-8");
    }
  } catch {
    /* read-only fs / D1 gagal: in-memory saja */
  }
}

function dayKey(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}

function hostOf(ref: string) {
  if (!ref) return "langsung";
  try {
    return new URL(ref).hostname.replace(/^www\./, "") || "langsung";
  } catch {
    return "langsung";
  }
}

function deviceOf(ua: string) {
  const u = ua.toLowerCase();
  if (/bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview/i.test(u))
    return "bot";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(u)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(u)) return "mobile";
  return "desktop";
}

export async function trackVisit(v: Omit<Visit, "at">): Promise<void> {
  const data = await read();
  const now = Date.now();
  const key = dayKey(now);
  const host = hostOf(v.ref);
  const device = deviceOf(v.ua);
  await write({
    ...data,
    total: data.total + 1,
    byDay: { ...data.byDay, [key]: (data.byDay[key] || 0) + 1 },
    refs: { ...data.refs, [host]: (data.refs[host] || 0) + 1 },
    devices: { ...data.devices, [device]: (data.devices[device] || 0) + 1 },
    visits: [{ at: now, ...v }, ...data.visits].slice(0, 300),
  });
}

// Catat klik sebuah link (buat "link paling sering diklik").
export async function trackLinkClick(linkId: string, title: string): Promise<void> {
  if (!linkId) return;
  const data = await read();
  const prev = data.linkClicks[linkId] || { title: title || linkId, count: 0 };
  await write({
    ...data,
    clicks: data.clicks + 1,
    linkClicks: {
      ...data.linkClicks,
      [linkId]: { title: title || prev.title || linkId, count: prev.count + 1 },
    },
  });
}

// ---- Visitor anonim (persist di DB): nama, like 1x, viewed selamanya ----
export function sanitizeVisitorId(id: unknown): string {
  return String(id || "")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, 64);
}

function newVisitor(): VisitorRec {
  return { name: randomAnonName(), liked: [], viewed: [], at: Date.now() };
}

// Pastikan visitor ada; kalau baru, bikin nama anonim & simpan. Kembalikan rec.
export async function ensureVisitor(id: string): Promise<VisitorRec> {
  if (!id) return newVisitor();
  const data = await read();
  const existing = data.visitors[id];
  if (existing) return existing;
  const rec = newVisitor();
  await write({ ...data, visitors: { ...data.visitors, [id]: rec } });
  return rec;
}

// Like 1x per visitor. `already` true kalau visitor ini udah like story tsb.
export async function visitorLike(
  id: string,
  storyId: string
): Promise<{ rec: VisitorRec; already: boolean }> {
  const data = await read();
  const rec = data.visitors[id] || newVisitor();
  const already = rec.liked.includes(storyId);
  const next = already ? rec : { ...rec, liked: [...rec.liked, storyId] };
  await write({ ...data, visitors: { ...data.visitors, [id]: next } });
  return { rec: next, already };
}

// Tandai story dilihat (abu selamanya) per visitor.
export async function visitorView(id: string, storyId: string): Promise<VisitorRec> {
  const data = await read();
  const rec = data.visitors[id] || newVisitor();
  if (rec.viewed.includes(storyId)) return rec;
  const next = { ...rec, viewed: [...rec.viewed, storyId].slice(-300) };
  await write({ ...data, visitors: { ...data.visitors, [id]: next } });
  return next;
}

export async function getAnalytics(): Promise<AnalyticsData> {
  return read();
}

export function serverInfo() {
  const mem = process.memoryUsage();
  return {
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    uptimeSec: Math.round(process.uptime()),
    rssMB: Math.round(mem.rss / 1024 / 1024),
    heapMB: Math.round(mem.heapUsed / 1024 / 1024),
    pid: process.pid,
    time: new Date().toISOString(),
  };
}
