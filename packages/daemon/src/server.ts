import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {
  parseJsonl,
  stripLocalFields,
  sumUsage,
  transcriptToEvents,
  validateEvents,
  SCHEMA_VERSION,
  type OfficeEvent,
} from '@agent-office/protocol';
import { publicConfig, saveConfig, UI_WRITABLE, type OfficeConfig } from './config.js';
import { EventStore } from './store.js';

const MAX_BODY = 512 * 1024;
const MAX_REPLAY_BODY = 16 * 1024 * 1024;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

export interface LinkStatus {
  relay: 'off' | 'connecting' | 'online' | 'offline';
  relayUrl?: string;
  lastEventAt?: number;
}

export interface DaemonOptions {
  token: string;
  webDir?: string;
  journalFile?: string;
  configFile?: string;
  config: OfficeConfig;
  /** Extra allowed browser origins (dev server). */
  extraOrigins?: string[];
  /** Where to look for transcripts for token totals; defaults to ~/.claude/projects. */
  projectsDir?: string;
  log?: (msg: string) => void;
  /** Toggles the demo generator on a running daemon (POST /demo). */
  setDemo?: (on: boolean) => boolean;
}

interface Client {
  res: http.ServerResponse;
  id: number;
}

/** The local daemon: validates and stores events, fans them out over SSE, serves the UI. */
export class OfficeDaemon {
  readonly store: EventStore;
  readonly server: http.Server;
  config: OfficeConfig;
  link: LinkStatus = { relay: 'off' };
  private clients = new Set<Client>();
  private nextClient = 1;
  private port = 0;
  private heartbeat: NodeJS.Timeout | undefined;
  private transcripts = new Map<string, string>();
  private usageTimers = new Map<string, NodeJS.Timeout>();
  stats = { received: 0, rejected: 0 };

  constructor(private readonly opts: DaemonOptions) {
    this.config = opts.config;
    this.store = new EventStore(opts.journalFile);
    this.server = http.createServer((req, res) => {
      this.handle(req, res).catch(() => {
        if (!res.headersSent) send(res, 500, { error: 'internal' });
        else res.end();
      });
    });
    this.server.headersTimeout = 10_000;
    this.server.requestTimeout = 30_000;
  }

  async listen(port: number, host = '127.0.0.1'): Promise<number> {
    await new Promise<void>((resolve, reject) => {
      const onErr = (e: Error) => {
        this.server.off('listening', onOk);
        reject(e);
      };
      const onOk = () => {
        this.server.off('error', onErr);
        resolve();
      };
      this.server.once('error', onErr);
      this.server.once('listening', onOk);
      this.server.listen(port, host);
    });
    this.port = (this.server.address() as { port: number }).port;
    this.heartbeat = setInterval(() => this.broadcastRaw(': ping\n\n'), 15_000);
    this.heartbeat.unref();
    return this.port;
  }

  async close(): Promise<void> {
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const t of this.usageTimers.values()) clearTimeout(t);
    for (const c of this.clients) c.res.end();
    this.clients.clear();
    this.store.close();
    await new Promise<void>((r) => this.server.close(() => r()));
  }

  /** Single entry point for every event source (hooks, spool, demo, relay, replay). */
  ingest(events: OfficeEvent[], persist = true): OfficeEvent[] {
    for (const e of events) this.watchUsage(e);
    const fresh = this.store.add(events, persist);
    if (fresh.length) {
      this.broadcast('events', fresh);
      if (fresh.some((e) => e.source === 'cloud')) this.link.lastEventAt = Date.now();
    }
    return fresh;
  }

  setLink(l: LinkStatus): void {
    this.link = l;
    this.broadcast('link', l);
  }

  // ---- token totals from local transcripts -------------------------------------------------

  private watchUsage(e: OfficeEvent): void {
    if (e.source !== 'local') return;
    if (e.type === 'session.start' && e.transcript) this.transcripts.set(e.session_id, e.transcript);
    if (e.type === 'agent.end' && e.transcript) this.scheduleUsage(e, e.agent_id, e.transcript, 300);
    if (e.type === 'agent.status' && e.agent_id === 'main' && e.status === 'idle') {
      const t = this.transcripts.get(e.session_id) ?? this.findTranscript(e.session_id);
      if (t) this.scheduleUsage(e, 'main', t, 1500);
    }
  }

  private findTranscript(sessionId: string): string | undefined {
    if (!/^[\w-]+$/.test(sessionId)) return undefined;
    const root = this.opts.projectsDir ?? path.join(os.homedir(), '.claude', 'projects');
    try {
      for (const d of fs.readdirSync(root)) {
        const p = path.join(root, d, sessionId + '.jsonl');
        if (fs.existsSync(p)) {
          this.transcripts.set(sessionId, p);
          return p;
        }
      }
    } catch {
      /* no projects dir */
    }
    return undefined;
  }

  private scheduleUsage(e: OfficeEvent, agentId: string, file: string, delay: number): void {
    const key = e.session_id + '/' + agentId;
    clearTimeout(this.usageTimers.get(key));
    const t = setTimeout(() => {
      this.usageTimers.delete(key);
      try {
        const st = fs.statSync(file);
        if (st.size > 50_000_000) return;
        const usage = sumUsage(parseJsonl(fs.readFileSync(file, 'utf8')));
        if (usage.tokens <= 0) return;
        const { ok } = validateEvents([
          {
            v: SCHEMA_VERSION,
            id: `tok-${key}-${Date.now().toString(36)}`,
            ts: Date.now(),
            source: 'local',
            session_id: e.session_id,
            ...(e.project ? { project: e.project } : {}),
            type: 'cost.tick',
            agent_id: agentId,
            tokens: usage.tokens,
            mode: 'absolute',
          },
        ]);
        this.ingest(ok);
      } catch {
        /* transcript missing or unreadable */
      }
    }, delay);
    t.unref();
    this.usageTimers.set(key, t);
  }

  // ---- HTTP --------------------------------------------------------------------------------

  private allowedOrigins(): Set<string> {
    const p = this.port;
    return new Set([`http://127.0.0.1:${p}`, `http://localhost:${p}`, ...(this.opts.extraOrigins ?? [])]);
  }

  private hostOk(req: http.IncomingMessage): boolean {
    // DNS-rebinding guard: only loopback host names are accepted.
    const host = (req.headers.host ?? '').toLowerCase();
    const name = host.replace(/:\d+$/, '');
    return name === '127.0.0.1' || name === 'localhost' || name === '[::1]';
  }

  private tokenOk(req: http.IncomingMessage, url: URL): boolean {
    const auth = req.headers.authorization;
    const header = req.headers['x-ao-token'];
    const given = (typeof header === 'string' && header) || (auth?.startsWith('Bearer ') ? auth.slice(7) : '') || url.searchParams.get('t') || '';
    return safeEqual(given, this.opts.token);
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (!this.hostOk(req)) return send(res, 421, { error: 'bad host' });
    const origin = req.headers.origin;
    if (origin && !this.allowedOrigins().has(origin)) return send(res, 403, { error: 'origin not allowed' });
    if (origin) res.setHeader('vary', 'origin');

    if (url.pathname === '/health') return send(res, 200, { ok: true, app: 'agent-office', v: SCHEMA_VERSION });

    const api = ['/events', '/stream', '/snapshot', '/config', '/replay', '/stats', '/demo'];
    if (api.includes(url.pathname)) {
      if (!this.tokenOk(req, url)) return send(res, 401, { error: 'token required' });
      if (url.pathname === '/events' && req.method === 'POST') return this.postEvents(req, res);
      if (url.pathname === '/stream' && req.method === 'GET') return this.stream(req, res);
      if (url.pathname === '/snapshot' && req.method === 'GET') return send(res, 200, this.snapshot());
      if (url.pathname === '/stats' && req.method === 'GET') return send(res, 200, { ...this.stats, clients: this.clients.size, events: this.store.all().length });
      if (url.pathname === '/config' && req.method === 'POST') return this.postConfig(req, res);
      if (url.pathname === '/replay' && req.method === 'POST') return this.postReplay(req, res);
      if (url.pathname === '/demo' && req.method === 'POST') {
        const on = url.searchParams.get('on') !== '0';
        const demo = this.opts.setDemo?.(on) ?? false;
        this.broadcast('demo', { demo });
        return send(res, 200, { demo });
      }
      return send(res, 405, { error: 'method' });
    }
    if (req.method === 'GET' || req.method === 'HEAD') return this.serveStatic(url.pathname, res);
    return send(res, 404, { error: 'not found' });
  }

  demo = false;

  opts_setDemo(on: boolean): boolean {
    return this.opts.setDemo?.(on) ?? false;
  }

  snapshot() {
    return { v: SCHEMA_VERSION, now: Date.now(), events: this.store.all(), config: publicConfig(this.config), link: this.link, demo: this.demo };
  }

  private async postEvents(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await readBody(req, MAX_BODY);
    if (body === undefined) return send(res, 413, { error: 'body too large' });
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return send(res, 400, { error: 'bad json' });
    }
    const { ok, rejected } = validateEvents(parsed);
    this.stats.received += ok.length;
    this.stats.rejected += rejected;
    this.ingest(ok);
    send(res, 202, { accepted: ok.length, rejected });
  }

  private async postConfig(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await readBody(req, 64 * 1024);
    let patch: Record<string, unknown> = {};
    try {
      patch = JSON.parse(body ?? '{}');
    } catch {
      return send(res, 400, { error: 'bad json' });
    }
    const allowed: Record<string, unknown> = {};
    for (const k of UI_WRITABLE) if (k in patch) allowed[k] = patch[k];
    this.config = this.opts.configFile ? saveConfig(this.opts.configFile, allowed as Partial<OfficeConfig>) : { ...this.config, ...allowed };
    this.broadcast('config', publicConfig(this.config));
    send(res, 200, publicConfig(this.config));
  }

  /**
   * Plays a transcript back as source "replay", time-compressed. Body is either raw JSONL
   * (content-type application/x-ndjson) or JSON {main, subagents?: string[]}.
   */
  private async postReplay(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await readBody(req, MAX_REPLAY_BODY);
    if (body === undefined) return send(res, 413, { error: 'body too large' });
    const speed = Math.max(1, Math.min(500, Number(new URL(req.url ?? '/', 'http://x').searchParams.get('speed')) || 20));
    let main = body;
    let subagents: { text: string }[] = [];
    if ((req.headers['content-type'] ?? '').startsWith('application/json')) {
      try {
        const o = JSON.parse(body) as { main?: unknown; subagents?: unknown };
        main = typeof o.main === 'string' ? o.main : '';
        subagents = Array.isArray(o.subagents) ? o.subagents.filter((x): x is string => typeof x === 'string').map((text) => ({ text })) : [];
      } catch {
        return send(res, 400, { error: 'bad json' });
      }
    }
    const events = validateEvents(transcriptToEvents(main, { subagents, showContent: this.config.showContent, hidePaths: this.config.hidePaths })).ok;
    send(res, 202, { events: events.length, speed });
    this.playback(events, speed);
  }

  playback(events: OfficeEvent[], speed: number): void {
    if (!events.length) return;
    const t0 = events[0]!.ts;
    const now = Date.now();
    for (const e of events) {
      const delay = Math.min((e.ts - t0) / speed, 10 * 60_000);
      const t = setTimeout(() => this.ingest([{ ...e, ts: now + delay }]), delay);
      t.unref();
    }
  }

  private stream(req: http.IncomingMessage, res: http.ServerResponse) {
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    res.write('retry: 2000\n\n');
    const client: Client = { res, id: this.nextClient++ };
    this.clients.add(client);
    writeEvent(res, 'snapshot', this.snapshot());
    req.on('close', () => this.clients.delete(client));
  }

  broadcast(name: string, data: unknown): void {
    const payload = Array.isArray(data) ? data.map((e) => stripLocalFields(e as OfficeEvent)) : data;
    const chunk = `event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`;
    this.broadcastRaw(chunk);
  }

  private broadcastRaw(chunk: string): void {
    for (const c of this.clients) {
      try {
        c.res.write(chunk);
      } catch {
        this.clients.delete(c);
      }
    }
  }

  private serveStatic(pathname: string, res: http.ServerResponse) {
    const root = this.opts.webDir;
    if (!root) return send(res, 404, { error: 'ui not built' });
    let rel = decodeURIComponent(pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.resolve(root, '.' + rel);
    if (!file.startsWith(path.resolve(root) + path.sep)) return send(res, 403, { error: 'forbidden' });
    let target = file;
    try {
      if (!fs.statSync(target).isFile()) target = path.join(root, 'index.html');
    } catch {
      if (path.extname(rel)) return send(res, 404, { error: 'not found' });
      target = path.join(root, 'index.html');
    }
    const ext = path.extname(target);
    res.writeHead(200, {
      'content-type': MIME[ext] ?? 'application/octet-stream',
      'cache-control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      ...(ext === '.html'
        ? {
            'content-security-policy':
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
            'x-frame-options': 'DENY',
          }
        : {}),
    });
    fs.createReadStream(target).pipe(res);
  }
}

function send(res: http.ServerResponse, status: number, body: unknown) {
  if (res.headersSent) return void res.end();
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  });
  res.end(text);
}

function writeEvent(res: http.ServerResponse, name: string, data: unknown) {
  res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

function readBody(req: http.IncomingMessage, limit: number): Promise<string | undefined> {
  return new Promise((resolve) => {
    const declared = Number(req.headers['content-length'] ?? 0);
    if (declared > limit) {
      req.resume();
      return resolve(undefined);
    }
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        req.destroy();
        resolve(undefined);
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(undefined));
  });
}

function safeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
