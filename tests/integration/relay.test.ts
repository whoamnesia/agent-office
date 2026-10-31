import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RelayCore } from '../../packages/relay/src/core.js';
import worker, { RelayRoom } from '../../packages/relay/src/worker.js';

const root = path.resolve(import.meta.dirname, '../..');
const TOKEN = 'test-relay-token-0123456789abcdef';
const fixtures = fs.readFileSync(path.join(root, 'tests/fixtures/hooks/real-session-subagent.jsonl'), 'utf8').trim().split('\n');

let tmp: string;
let relay: ChildProcess;
let daemon: ChildProcess;
let relayPort = 0;
let info: { port: number; token: string };

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = http.createServer().listen(0, '127.0.0.1', () => {
      const p = (s.address() as { port: number }).port;
      s.close(() => resolve(p));
    });
  });
}
function get(port: number, p: string, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path: p, headers }, (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: b }));
      })
      .on('error', reject);
  });
}
const waitFor = async (fn: () => Promise<boolean> | boolean, ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
};

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-relay-'));
  relayPort = await freePort();
  relay = spawn(process.execPath, [path.join(root, 'plugin/dist/relay.mjs'), '--port', String(relayPort)], { env: { ...process.env, AO_RELAY_TOKEN: TOKEN }, stdio: 'ignore' });
  expect(await waitFor(async () => (await get(relayPort, '/health').catch(() => ({ status: 0 }))).status === 200)).toBe(true);
  // the local daemon subscribes to the relay
  const data = path.join(tmp, 'data');
  daemon = spawn(process.execPath, [path.join(root, 'plugin/dist/daemon.mjs'), '--port', '0'], {
    env: { ...process.env, AO_DATA_DIR: data, AO_RELAY_URL: `http://127.0.0.1:${relayPort}`, AO_RELAY_TOKEN: TOKEN, CLAUDE_PLUGIN_DATA: '' },
    stdio: 'ignore',
  });
  expect(await waitFor(() => fs.existsSync(path.join(data, 'daemon.json')))).toBe(true);
  info = JSON.parse(fs.readFileSync(path.join(data, 'daemon.json'), 'utf8'));
});

afterAll(() => {
  relay?.kill();
  daemon?.kill();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('cloud relay (Node)', () => {
  it('rejects requests without the bearer token', async () => {
    expect((await get(relayPort, '/snapshot')).status).toBe(401);
    expect((await get(relayPort, '/snapshot', { authorization: 'Bearer wrong-token-wrong-token!!' })).status).toBe(401);
  });

  it('init-cloud writes a dependency-free emitter and project hooks', () => {
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    const r = spawnSync(process.execPath, [path.join(root, 'plugin/bin/agent-office'), 'init-cloud', '--dir', repo], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    const settings = JSON.parse(fs.readFileSync(path.join(repo, '.claude/settings.json'), 'utf8'));
    expect(settings.hooks.PreToolUse[0].hooks[0].command).toContain('.claude/agent-office/ao-emit.cjs');
    expect(settings.hooks.PreToolUse[0].hooks[0].command).toContain('--relay-only');
    expect(fs.existsSync(path.join(repo, '.claude/agent-office/ao-emit.cjs'))).toBe(true);
    expect(fs.readFileSync(path.join(repo, '.claude/agent-office/README.md'), 'utf8')).toContain('AO_RELAY_TOKEN');
    // idempotent: running again adds nothing
    const again = spawnSync(process.execPath, [path.join(root, 'plugin/bin/agent-office'), 'init-cloud', '--dir', repo], { encoding: 'utf8' });
    expect(again.stdout).toContain('hooks already present');
  });

  it('without relay variables the project emitter stays silent and spools nothing', () => {
    const repo = path.join(tmp, 'repo');
    const data = path.join(tmp, 'emitter-data');
    const r = spawnSync(process.execPath, [path.join(repo, '.claude/agent-office/ao-emit.cjs'), '--relay-only'], { input: fixtures[3], env: { ...process.env, AO_DATA_DIR: data, AO_RELAY_URL: '', AO_RELAY_TOKEN: '' }, encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).toBe('');
    expect(fs.existsSync(path.join(data, 'spool.jsonl'))).toBe(false);
  });

  it('emulated cloud session → relay → local daemon shows it as source "cloud"', async () => {
    const repo = path.join(tmp, 'repo');
    // what the cloud VM runs: the committed emitter with the relay secrets in its environment
    for (const line of fixtures) {
      const r = spawnSync(process.execPath, [path.join(repo, '.claude/agent-office/ao-emit.cjs'), '--relay-only'], {
        input: line,
        env: { ...process.env, AO_RELAY_URL: `http://127.0.0.1:${relayPort}`, AO_RELAY_TOKEN: TOKEN, AO_DATA_DIR: path.join(tmp, 'vm') },
        encoding: 'utf8',
      });
      expect(r.status).toBe(0);
      expect(r.stdout).toBe('');
    }
    const relaySnap = JSON.parse((await get(relayPort, '/snapshot', { authorization: 'Bearer ' + TOKEN })).body);
    expect(relaySnap.events.length).toBeGreaterThan(20);
    expect(relaySnap.events.every((e: { source: string }) => e.source === 'cloud')).toBe(true);
    expect(JSON.stringify(relaySnap)).not.toMatch(/transcript|redacted|tool_response/);
    const ok = await waitFor(async () => {
      const s = JSON.parse((await get(info.port, '/snapshot?t=' + info.token)).body);
      return s.link.relay === 'online' && s.events.some((e: { source: string; type: string }) => e.source === 'cloud' && e.type === 'agent.spawn');
    });
    expect(ok).toBe(true);
  });
});

describe('relay core / Cloudflare Durable Object', () => {
  it('the Worker forwards to the Durable Object, which enforces auth and stores events', async () => {
    const room = new RelayRoom({}, { AO_RELAY_TOKEN: TOKEN } as never);
    const env = { AO_RELAY_TOKEN: TOKEN, RELAY: { idFromName: () => 'x', get: () => room } };
    const event = { v: 1, id: 'e1', ts: 1, source: 'cloud', session_id: 's', type: 'agent.spawn', agent_id: 'a', agent_type: 'Explore' };
    expect((await worker.fetch(new Request('https://relay/events', { method: 'POST', body: '[]' }), env as never)).status).toBe(401);
    const post = await worker.fetch(new Request('https://relay/events', { method: 'POST', headers: { authorization: 'Bearer ' + TOKEN }, body: JSON.stringify([event, { bogus: true }]) }), env as never);
    expect(await post.json()).toEqual({ accepted: 1, rejected: 1 });
    const snap = await worker.fetch(new Request('https://relay/snapshot', { headers: { authorization: 'Bearer ' + TOKEN } }), env as never);
    expect(((await snap.json()) as { events: unknown[] }).events).toHaveLength(1);
    // SSE: first frame is the snapshot
    const stream = await worker.fetch(new Request('https://relay/stream?t=' + TOKEN), env as never);
    const reader = stream.body!.getReader();
    let text = '';
    while (!text.includes('event: snapshot')) text += new TextDecoder().decode((await reader.read()).value);
    expect(text).toContain('"agent_id":"a"');
    await reader.cancel();
  });

  it('limits body size and rate', async () => {
    let now = 0;
    const core = new RelayCore({ token: TOKEN, maxBody: 100, rateLimit: 3, now: () => now });
    const auth = { authorization: 'Bearer ' + TOKEN };
    expect((await core.handle(new Request('https://r/events', { method: 'POST', headers: auth, body: 'x'.repeat(200) }))).status).toBe(413);
    await core.handle(new Request('https://r/snapshot', { headers: auth }));
    await core.handle(new Request('https://r/snapshot', { headers: auth }));
    expect((await core.handle(new Request('https://r/snapshot', { headers: auth }))).status).toBe(429);
    now += 2000;
    expect((await core.handle(new Request('https://r/snapshot', { headers: auth }))).status).toBe(200);
  });

  it('refuses weak tokens', () => {
    expect(() => new RelayCore({ token: 'short' })).toThrow();
  });
});
