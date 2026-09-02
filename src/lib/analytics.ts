import { promises as fs } from "fs";
import path from "path";

// Statistik pengunjung sederhana. Disimpan di data/analytics.json (mode file).
// Di serverless read-only, write gagal diam-diam -> tetap jalan in-memory.
export type Visit = { at: number; path: string; ref: string; ua: string };
export type AnalyticsData = {
  total: number;
  byDay: Record<string, number>;
  visits: Visit[];
};

const EMPTY: AnalyticsData = { total: 0, byDay: {}, visits: [] };
const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "analytics.json");

let cache: AnalyticsData | null = null;

async function read(): Promise<AnalyticsData> {
  if (cache) return cache;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(FILE, "utf-8");
    cache = { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    cache = { ...EMPTY };
  }
  return cache!;
}

async function write(data: AnalyticsData) {
  cache = data;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(data), "utf-8");
  } catch {
    /* read-only fs: in-memory saja */
  }
}

function dayKey(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}

export async function trackVisit(v: Omit<Visit, "at">): Promise<void> {
  const data = await read();
  const now = Date.now();
  const key = dayKey(now);
  await write({
    total: data.total + 1,
    byDay: { ...data.byDay, [key]: (data.byDay[key] || 0) + 1 },
    visits: [{ at: now, ...v }, ...data.visits].slice(0, 300),
  });
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
