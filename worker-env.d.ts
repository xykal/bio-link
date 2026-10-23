// Tipe minimal runtime Worker yang dipakai entry `worker.ts`.
// Sengaja tidak memakai hasil `wrangler types`: file itu menarik
// @cloudflare/workers-types global dan mengubah tipe DOM (Response.json()
// jadi `unknown`), yang bikin typecheck seluruh komponen React ikut jebol.

declare interface ScheduledController {
  readonly cron: string;
  readonly scheduledTime: number;
  readonly type: "scheduled";
}

declare interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

declare interface ExportedHandler<Env = unknown> {
  fetch?: (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response> | Response;
  scheduled?: (
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ) => Promise<void> | void;
}
