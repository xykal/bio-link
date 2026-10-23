// Deklarasi tipe untuk Worker hasil generate OpenNext (`.open-next/worker.js`).
// File itu baru ada setelah `opennextjs-cloudflare build`, jadi tanpa deklarasi
// ini `tsc --noEmit` (CI) gagal. Wildcard dipakai supaya path relatif dari
// `worker.ts` tetap cocok.
declare module "*/.open-next/worker.js" {
  type OpenNextHandler = {
    fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response>;
  };
  const handler: OpenNextHandler;
  export default handler;
}
