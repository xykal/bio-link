import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:3111";
const viewports = [
  { width: 320, height: 640 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: viewports[0] });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  const seedResponse = await fetch(`${base}/api/data`);
  assert.equal(seedResponse.status, 200, "public data API should load");
  const seed = await seedResponse.json();
  const stack = Array.from({ length: 20 }, (_, index) => {
    const item = seed.stack[index % Math.max(1, seed.stack.length)] || {};
    return { ...item, id: `responsive-${index}` };
  });
  await page.route("**/api/data", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ...seed, stack }),
  }));
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator('[aria-label="Tech stack"] span').nth(19).waitFor();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(() => {
      const root = document.querySelector('[aria-label="Tech stack"]');
      const bounds = root?.getBoundingClientRect();
      const icons = [...(root?.querySelectorAll("span") || [])];
      return Boolean(bounds && icons.length === 20 && icons.every((icon) => {
        const rect = icon.getBoundingClientRect();
        return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
      }));
    });
    const metrics = await page.evaluate(() => {
      const stackRoot = document.querySelector('[aria-label="Tech stack"]');
      const bounds = stackRoot?.getBoundingClientRect();
      const icons = [...(stackRoot?.querySelectorAll("span") || [])].map((item) => {
        const rect = item.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top };
      });
      const content = [...(document.querySelector('.bio-page')?.children || [])].find((child) => child.classList.contains("my-auto"));
      const heading = document.querySelector('.bio-page h1');
      return {
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        contentTop: content?.getBoundingClientRect().top ?? null,
        headingTop: heading?.getBoundingClientRect().top ?? null,
        stackBounds: bounds ? { left: bounds.left, right: bounds.right } : null,
        icons,
      };
    });
    assert.ok(metrics.documentWidth <= metrics.clientWidth + 1, `public page overflow at ${viewport.width}px`);
    assert.ok(metrics.contentTop !== null && metrics.contentTop >= 0, `public content must not be cropped above the viewport at ${viewport.width}px`);
    assert.ok(metrics.headingTop !== null && metrics.headingTop >= 0, `profile heading must remain visible below the top edge at ${viewport.width}px`);
    assert.ok(metrics.stackBounds, "tech stack should be present");
    assert.equal(metrics.icons.length, 20, "all stack icons should remain visible");
    assert.equal(new Set(metrics.icons.map((icon) => Math.round(icon.top))).size, 1, "stack must stay in its original single overlapping row");
    assert.ok(metrics.icons.every((icon) => icon.left >= metrics.stackBounds.left - 1 && icon.right <= metrics.stackBounds.right + 1), `stack icons must fit inside the page at ${viewport.width}px`);
  }

  await page.unroute("**/api/data");
  await page.setViewportSize(viewports[0]);
  await page.goto(`${base}/admin`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD || "0099");
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.getByText("Bio Link Admin").waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "Buka menu" }).click();
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await page.getByRole("heading", { name: "Link", exact: true }).waitFor();

  const csrfStatus = await page.request.post(`${base}/api/admin/reset`, {
    headers: { Origin: "https://untrusted.example" },
    data: {},
  }).then((response) => response.status());
  assert.equal(csrfStatus, 403, "cross-origin admin state changes must be rejected");

  await page.evaluate(async () => {
    const data = await fetch("/api/data").then((response) => response.json());
    const stale = (data.links || []).filter((link) => link.title.startsWith("Responsive QA "));
    await Promise.all(stale.map((link) => fetch(`/api/admin/links/${link.id}`, { method: "DELETE" })));
  });

  const title = `Responsive QA ${Date.now()}`;
  await page.getByRole("button", { name: /Tambah Link/ }).click();
  const editor = page.locator("#link-editor");
  await editor.locator("input").nth(0).fill(title);
  await editor.locator("input").nth(1).fill("https://example.com/first");
  await editor.getByRole("button", { name: "Tambah link", exact: true }).click();
  await page.getByText(title, { exact: true }).waitFor();

  await page.getByRole("button", { name: `Edit ${title}` }).click();
  await editor.locator("input").nth(0).fill(`${title} updated`);
  await editor.locator("input").nth(1).fill("https://example.com/updated");
  await editor.getByRole("button", { name: "Simpan perubahan", exact: true }).click();
  await page.getByText(`${title} updated`, { exact: true }).waitFor();

  const invalidLinkStatus = await page.evaluate(async () => {
    const response = await fetch("/api/admin/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "bad", url: "javascript:alert(1)" }),
    });
    return response.status;
  });
  assert.equal(invalidLinkStatus, 400, "unsafe link protocols must be rejected");

  const savedLink = await page.evaluate(async (expectedTitle) => {
    const data = await fetch("/api/data").then((response) => response.json());
    return (data.links || []).find((link) => link.title === expectedTitle) || null;
  }, `${title} updated`);
  assert.ok(savedLink?.id, "edited link should be present in the saved public data");
  const cleanupStatus = await page.evaluate(async (id) => {
    const response = await fetch(`/api/admin/links/${id}`, { method: "DELETE" });
    return response.status;
  }, savedLink.id);
  assert.equal(cleanupStatus, 200, "test link cleanup should succeed");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText("Bio Link Admin").waitFor({ timeout: 10_000 });
  assert.equal(await page.getByText(`${title} updated`, { exact: true }).count(), 0, "test link should be removed");

  const adminSections = ["preview", "profil", "link", "stack", "story", "bubble", "tampilan", "data", "perawatan", "stats"];
  const sectionViewports = [viewports[0], viewports[4], viewports[6]];
  for (const section of adminSections) {
    await page.goto(`${base}/admin#${section}`, { waitUntil: "domcontentloaded" });
    await page.getByText("Bio Link Admin").waitFor({ timeout: 10_000 });
    for (const viewport of sectionViewports) {
      await page.setViewportSize(viewport);
      const metrics = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      assert.ok(metrics.documentWidth <= metrics.clientWidth + 1, `admin #${section} overflow at ${viewport.width}px`);
    }
  }

  assert.deepEqual(errors, [], `browser errors: ${errors.join("; ")}`);
  console.log(`Responsive public/admin + link add/edit + CSRF/URL validation: PASS (public ${viewports.map((v) => v.width).join(", ")}px; all admin sections 320, 768, 1440px)`);
} finally {
  await browser.close();
}
