/**
 * Relay core on web-standard APIs only (Request/Response/ReadableStream), so the same code
 * runs in Node and inside a Cloudflare Durable Object.
 *   POST /events    (Bearer)  → accept a batch of office events from a cloud session's hooks
 *   GET  /stream    (Bearer or ?t=) → SSE: one `snapshot`, then `events` batches
 *   GET  /snapshot  (Bearer)  → recent events as JSON
 *   GET  /health              → liveness only, no data
 */
import { validateEvents, type OfficeEvent } from '@agent-office/protocol';

export interface RelayOptions {
  token: string;
  capacity?: number;
  maxBody?: number;
  /** requests per second across all clients before 429 */
  rateLimit?: number;
  now?: () => number;
}

const enc = new TextEncoder();

function safeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });

export class RelayCore {
  private events: OfficeEvent[] = [];
  private seen = new Set<string>();
  private subs = new Set<ReadableStreamDefaultController<Uint8Array>>();
  private bucket: { tokens: number; at: number };
  readonly stats = { accepted: 0, rejected: 0, subscribers: 0 };
  private heartbeat: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly opts: RelayOptions) {
    if (!opts.token || opts.token.length < 16) throw new Error('relay token must be at least 16 characters');
    this.bucket = { tokens: opts.rateLimit ?? 50, at: this.now() };
  }

  private now() {
    return this.opts.now ? this.opts.now() : Date.now();
  }

  private authorized(req: Request, url: URL): boolean {
    const h = req.headers.get('authorization') ?? '';
    const given = h.startsWith('Bearer ') ? h.slice(7) : (url.searchParams.get('t') ?? '');
    return safeEqual(given, this.opts.token);
  }

  private allow(): boolean {
    const rate = this.opts.rateLimit ?? 50;
    const t = this.now();
    this.bucket.tokens = Math.min(rate, this.bucket.tokens + ((t - this.bucket.at) / 1000) * rate);
    this.bucket.at = t;
    if (this.bucket.tokens < 1) return false;
    this.bucket.tokens -= 1;
    return true;
  }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/health') return json(200, { ok: true, app: 'agent-office-relay' });
    if (!this.allow()) return json(429, { error: 'slow down' });
    if (!this.authorized(req, url)) return json(401, { error: 'unauthorized' });
    if (url.pathname === '/events' && req.method === 'POST') return this.post(req);
    if (url.pathname === '/stream' && req.method === 'GET') return this.stream();
    if (url.pathname === '/snapshot' && req.method === 'GET') return json(200, { events: this.events, stats: this.stats });
    return json(404, { error: 'not found' });
  }

  private async post(req: Request): Promise<Response> {
    const max = this.opts.maxBody ?? 512 * 1024;
    const declared = Number(req.headers.get('content-length') ?? 0);
    if (declared > max) return json(413, { error: 'body too large' });
    const text = await req.text();
    if (text.length > max) return json(413, { error: 'body too large' });
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json(400, { error: 'bad json' });
    }
    const { ok, rejected } = validateEvents(body);
    this.stats.rejected += rejected;
    const fresh = this.add(ok);
    if (fresh.length) this.broadcast('events', fresh);
    return json(202, { accepted: fresh.length, rejected });
  }

  add(events: OfficeEvent[]): OfficeEvent[] {
    const cap = this.opts.capacity ?? 2000;
    const fresh: OfficeEvent[] = [];
    for (const e of events) {
      if (this.seen.has(e.id)) continue;
      // transcript paths never leave the machine that produced them
      const { transcript: _t, ...clean } = e as OfficeEvent & { transcript?: string };
      this.seen.add(e.id);
      this.events.push(clean as OfficeEvent);
      fresh.push(clean as OfficeEvent);
    }
    if (this.events.length > cap) for (const d of this.events.splice(0, this.events.length - cap)) this.seen.delete(d.id);
    this.stats.accepted += fresh.length;
    return fresh;
  }

  private frame(name: string, data: unknown): Uint8Array {
    return enc.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  private broadcast(name: string, data: unknown) {
    const chunk = this.frame(name, data);
    for (const c of this.subs) {
      try {
        c.enqueue(chunk);
      } catch {
        this.subs.delete(c);
      }
    }
    this.stats.subscribers = this.subs.size;
  }

  private stream(): Response {
    let ctrl: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start: (c) => {
        ctrl = c;
        this.subs.add(c);
        this.stats.subscribers = this.subs.size;
        c.enqueue(enc.encode('retry: 3000\n\n'));
        c.enqueue(this.frame('snapshot', { events: this.events }));
        this.ensureHeartbeat();
      },
      cancel: () => {
        this.subs.delete(ctrl);
        this.stats.subscribers = this.subs.size;
      },
    });
    return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } });
  }

  private ensureHeartbeat() {
    if (this.heartbeat) return;
    this.heartbeat = setInterval(() => {
      const ping = enc.encode(': ping\n\n');
      for (const c of this.subs) {
        try {
          c.enqueue(ping);
        } catch {
          this.subs.delete(c);
        }
      }
      if (!this.subs.size) {
        clearInterval(this.heartbeat);
        this.heartbeat = undefined;
      }
    }, 15_000);
  }

  close() {
    clearInterval(this.heartbeat);
    for (const c of this.subs) {
      try {
        c.close();
      } catch {
        /* already closed */
      }
    }
    this.subs.clear();
  }
}
