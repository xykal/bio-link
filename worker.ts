// Custom Worker entry untuk OpenNext.
//
// Worker hasil generate adapter hanya mengekspor `fetch`, jadi Cron Trigger
// Cloudflare tidak akan pernah jalan tanpa wrapper ini (error khas:
// "Handler does not export a scheduled() function"). Di sini kita:
//   1. tetap meneruskan seluruh trafik Next.js ke handler generated, dan
//   2. menambahkan `scheduled()` yang memanggil route cron yang sudah ada
//      (`/api/cron/maintenance`) lewat WORKER_SELF_REFERENCE — bukan import
//      langsung, supaya logika + cek CRON_SECRET tetap satu jalur.

import { default as handler } from "./.open-next/worker.js";

type CronEnv = {
  CRON_SECRET?: string;
  WORKER_SELF_REFERENCE?: { fetch: (req: Request) => Promise<Response> };
};

export default {
  fetch: handler.fetch,
  async scheduled(
    controller: ScheduledController,
    env: CronEnv,
    ctx: ExecutionContext
  ): Promise<void> {
    const secret = env.CRON_SECRET || "";
    const target = new URL("https://bio.haekal.web.id/api/cron/maintenance");
    const run = (async () => {
      const response = await handler.fetch(
        new Request(target, {
          method: "GET",
          headers: secret ? { authorization: `Bearer ${secret}` } : {},
        }),
        env as never,
        ctx as never
      );
      const body = await response.text();
      console.log(`cron ${controller.cron} -> ${response.status} ${body.slice(0, 400)}`);
    })();
    ctx.waitUntil(run);
    await run;
  },
} satisfies ExportedHandler<CronEnv>;
