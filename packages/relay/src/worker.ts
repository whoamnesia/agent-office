/**
 * Cloudflare Worker + Durable Object variant of the relay.
 * All requests go to one Durable Object instance which keeps the ring buffer and SSE streams.
 * Secret: `wrangler secret put AO_RELAY_TOKEN`.
 */
import { RelayCore } from './core.js';

interface Env {
  AO_RELAY_TOKEN: string;
  RELAY: { idFromName(name: string): unknown; get(id: unknown): { fetch(req: Request): Promise<Response> } };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const id = env.RELAY.idFromName('default');
    return env.RELAY.get(id).fetch(req);
  },
};

export class RelayRoom {
  private core: RelayCore;
  constructor(_state: unknown, env: Env) {
    this.core = new RelayCore({ token: env.AO_RELAY_TOKEN });
  }
  fetch(req: Request): Promise<Response> {
    return this.core.handle(req);
  }
}
