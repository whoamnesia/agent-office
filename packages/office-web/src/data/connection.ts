import { validateEvents, type OfficeEvent } from '@agent-office/protocol';

export type LinkState = 'connecting' | 'live' | 'offline' | 'no-token';
export interface Snapshot {
  events: OfficeEvent[];
  config: Record<string, unknown>;
  link: { relay: string; relayUrl?: string; lastEventAt?: number };
  demo: boolean;
  now: number;
}

export interface Handlers {
  snapshot(s: Snapshot): void;
  events(e: OfficeEvent[]): void;
  config(c: Record<string, unknown>): void;
  link(l: Snapshot['link']): void;
  demo(on: boolean): void;
  state(s: LinkState): void;
}

/** Reads the token from ?t= once, keeps it in sessionStorage and strips it from the address bar. */
export function takeToken(): string | undefined {
  const url = new URL(location.href);
  const t = url.searchParams.get('t');
  if (t) {
    try {
      sessionStorage.setItem('ao-token', t);
    } catch {
      /* private mode */
    }
    url.searchParams.delete('t');
    history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
    return t;
  }
  try {
    return sessionStorage.getItem('ao-token') ?? undefined;
  } catch {
    return undefined;
  }
}

/** SSE client with automatic reconnect; the office keeps simulating while offline. */
export class Connection {
  private es?: EventSource;
  private backoff = 1000;
  private timer?: number;
  state: LinkState = 'connecting';

  constructor(
    private readonly token: string | undefined,
    private readonly h: Handlers,
  ) {}

  start() {
    if (!this.token) return this.set('no-token');
    this.open();
  }

  private set(s: LinkState) {
    this.state = s;
    this.h.state(s);
  }

  private open() {
    this.es?.close();
    this.set('connecting');
    const es = new EventSource(`stream?t=${encodeURIComponent(this.token!)}`);
    this.es = es;
    es.addEventListener('snapshot', (m) => {
      this.backoff = 1000;
      this.set('live');
      try {
        const s = JSON.parse((m as MessageEvent).data) as Snapshot;
        s.events = validateEvents(s.events).ok;
        this.h.snapshot(s);
      } catch {
        /* ignore malformed */
      }
    });
    es.addEventListener('events', (m) => {
      try {
        this.h.events(validateEvents(JSON.parse((m as MessageEvent).data)).ok);
      } catch {
        /* ignore */
      }
    });
    es.addEventListener('config', (m) => this.h.config(JSON.parse((m as MessageEvent).data)));
    es.addEventListener('link', (m) => this.h.link(JSON.parse((m as MessageEvent).data)));
    es.addEventListener('demo', (m) => this.h.demo(JSON.parse((m as MessageEvent).data).demo));
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED || this.state === 'live') {
        this.set('offline');
        es.close();
        clearTimeout(this.timer);
        this.timer = window.setTimeout(() => this.open(), this.backoff);
        this.backoff = Math.min(this.backoff * 2, 15000);
      }
    };
  }

  async post(path: string, body: unknown, contentType = 'application/json'): Promise<Response | undefined> {
    if (!this.token) return undefined;
    try {
      return await fetch(path, { method: 'POST', headers: { 'content-type': contentType, 'x-ao-token': this.token }, body: typeof body === 'string' ? body : JSON.stringify(body) });
    } catch {
      return undefined;
    }
  }
}
