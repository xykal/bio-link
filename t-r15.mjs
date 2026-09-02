import { chromium } from "playwright";

const base = "http://localhost:3111";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));

await page.goto(base, { waitUntil: "load" });
await page.waitForTimeout(1200);
await page.click('[aria-label^="Lihat story"]');
await page.waitForTimeout(300); // ganti story CEPAT sebelum stagger jalan
await page.click('[aria-label^="Story berikutnya"]', { position: { x: 100, y: 140 } });
await page.waitForTimeout(2600);
const leaked = await page.getByText("Keren banget sumpah").count();
console.log("T1 leak video->audio setelah switch cepat (harus 0):", leaked);
const ownFloat = await page.getByText("Suaranya jernih bro").count();
console.log("T2 float milik audio sendiri (boleh >=1):", ownFloat);

// VN: progres harus DIAM sebelum diputar
const bar = page.locator('div[role="dialog"] div.h-0\\.5 > div').nth(1);
const w0 = await bar.getAttribute("style");
await page.waitForTimeout(3000);
const w1 = await bar.getAttribute("style");
console.log("T3 progres VN diam sebelum play:", w0 === w1, "|", w1);

// setelah play -> jalan
await page.locator('[aria-label="Putar voice note"]').click();
await page.waitForTimeout(2500);
const w2 = await bar.getAttribute("style");
console.log("T4 progres VN jalan setelah play:", w2 !== w1, "|", w2);

console.log("ERR:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
