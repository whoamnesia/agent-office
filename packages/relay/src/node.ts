/**
 * Node relay: `agent-office relay` or `node plugin/dist/relay.mjs`.
 * Env: AO_RELAY_TOKEN (required, ≥16 chars), PORT (8787), HOST (127.0.0.1 — expose it through a
 * tunnel such as cloudflared, or set HOST=0.0.0.0 behind your own TLS-terminating proxy).
 */
import http from 'node:http';
import { Readable } from 'node:stream';
import { RelayCore } from './core.js';

const argv = process.argv.slice(2);
const opt = (n: string) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 ? argv[i + 1] : undefined;
};

export function startRelay(token: string, port: number, host: string) {
  const core = new RelayCore({ token });
  const server = http.createServer(async (req, res) => {
    try {
      const url = `http://${req.headers.host ?? 'relay'}${req.url ?? '/'}`;
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const request = new Request(url, {
        method: req.method,
        headers: req.headers as Record<string, string>,
        ...(hasBody ? { body: Readable.toWeb(req) as ReadableStream, duplex: 'half' } : {}),
      } as RequestInit);
      const response = await core.handle(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (!response.body) return res.end();
      const reader = response.body.getReader();
      req.on('close', () => void reader.cancel().catch(() => undefined));
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } catch {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
  });
  server.listen(port, host);
  return { server, core };
}

const token = opt('token') ?? process.env.AO_RELAY_TOKEN ?? '';
const port = Number(opt('port') ?? process.env.PORT ?? 8787);
const host = opt('host') ?? process.env.HOST ?? '127.0.0.1';
if (!token || token.length < 16) {
  console.error('agent-office relay: set AO_RELAY_TOKEN (at least 16 random characters), e.g. `openssl rand -hex 24`');
  process.exit(1);
}
const { server } = startRelay(token, port, host);
server.on('listening', () => console.log(`agent-office relay listening on http://${host}:${(server.address() as { port: number }).port}`));
