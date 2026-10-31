import http from 'node:http';
import https from 'node:https';
import { validateEvents } from '@agent-office/protocol';
import type { OfficeDaemon } from './server.js';

/**
 * Subscribes the local daemon to a relay's SSE stream. Every event from the relay is
 * re-labelled as source "cloud" (the Cloud Branch building). Reconnects with backoff.
 */
export class RelayClient {
  private req: http.ClientRequest | undefined;
  private stopped = false;
  private backoff = 1000;
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly daemon: OfficeDaemon,
    private readonly url: string,
    private readonly token: string,
  ) {}

  start(): void {
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.timer);
    this.req?.destroy();
  }

  private status(relay: 'connecting' | 'online' | 'offline') {
    this.daemon.setLink({ ...this.daemon.link, relay, relayUrl: new URL(this.url).host });
  }

  private connect(): void {
    if (this.stopped) return;
    this.status('connecting');
    const u = new URL(this.url.replace(/\/+$/, '') + '/stream');
    const lib = u.protocol === 'https:' ? https : http;
    let buf = '';
    this.req = lib.get(u, { headers: { authorization: 'Bearer ' + this.token, accept: 'text/event-stream' }, timeout: 60_000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return this.retry();
      }
      this.backoff = 1000;
      this.status('online');
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => {
        buf += chunk;
        let idx: number;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          this.onBlock(block);
        }
        if (buf.length > 2_000_000) buf = '';
      });
      res.on('end', () => this.retry());
      res.on('error', () => this.retry());
    });
    this.req.on('timeout', () => this.req?.destroy());
    this.req.on('error', () => this.retry());
  }

  private onBlock(block: string) {
    let name = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) name = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    if (!data.length) return;
    try {
      const parsed = JSON.parse(data.join('\n'));
      const items = name === 'snapshot' ? parsed.events : parsed;
      const { ok } = validateEvents(Array.isArray(items) ? items : [items]);
      this.daemon.ingest(ok.map((e) => ({ ...e, source: 'cloud' as const })));
    } catch {
      /* malformed frame: skip */
    }
  }

  private retry() {
    if (this.stopped) return;
    this.req?.destroy();
    this.req = undefined;
    this.status('offline');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.connect(), this.backoff);
    this.backoff = Math.min(this.backoff * 2, 30_000);
  }
}
