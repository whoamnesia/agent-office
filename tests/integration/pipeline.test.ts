import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const EMIT = path.join(root, 'plugin/bin/ao-emit');
const DAEMON = path.join(root, 'plugin/dist/daemon.mjs');
const fixtures = fs.readFileSync(path.join(root, 'tests/fixtures/hooks/real-session-subagent.jsonl'), 'utf8').trim().split('\n');

let dir: string;
let daemon: ChildProcess | undefined;
let info: { port: number; token: string; pid: number };

const env = () => ({ ...process.env, AO_DATA_DIR: dir, AO_NO_AUTOSTART: '1', AO_NO_OPEN: '1', CLAUDE_PLUGIN_DATA: '' });
function emit(stdin: string) {
  return spawnSync(process.execPath, [EMIT], { input: stdin, env: env(), encoding: 'utf8', timeout: 5000 });
}
function emitAsync(stdin: string): Promise<number> {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, [EMIT], { env: env(), stdio: ['pipe', 'ignore', 'ignore'] });
    c.on('exit', (code) => resolve(code ?? -1));
    c.stdin.end(stdin);
  });
}
async function startDaemon() {
  try {
    fs.unlinkSync(path.join(dir, 'daemon.json'));
  } catch {
    /* first start */
  }
  daemon = spawn(process.execPath, [DAEMON, '--port', '0'], { env: env(), stdio: 'ignore' });
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 50));
    try {
      info = JSON.parse(fs.readFileSync(path.join(dir, 'daemon.json'), 'utf8'));
      return;
    } catch {
      /* not yet */
    }
  }
  throw new Error('daemon did not start');
}
async function stopDaemon() {
  if (!daemon) return;
  const d = daemon;
  daemon = undefined;
  await new Promise<void>((r) => {
    d.on('exit', () => r());
    d.kill('SIGTERM');
  });
}
function req(method: string, p: string, opts: { body?: string; headers?: Record<string, string> } = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: info.port, path: p, method, headers: opts.headers }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: b }));
    });
    r.on('error', reject);
    r.end(opts.body);
  });
}
function openStream(onEvents: (events: { type: string; ts: number; agent_id?: string; status?: string }[]) => void): () => void {
  const r = http.get({ host: '127.0.0.1', port: info.port, path: '/stream?t=' + info.token }, (res) => {
    let buf = '';
    res.setEncoding('utf8');
    res.on('data', (c: string) => {
      buf += c;
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (block.startsWith('event: events')) onEvents(JSON.parse(block.split('\ndata: ')[1]!));
      }
    });
  });
  return () => r.destroy();
}

beforeAll(() => {
  if (!fs.existsSync(EMIT) || !fs.existsSync(DAEMON)) throw new Error('run `npm run bundle` first');
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-it-'));
});
afterAll(async () => {
  await stopDaemon();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('hook → ao-emit → daemon → SSE', () => {
  it('ao-emit is silent and exits 0 on anything', () => {
    for (const input of ['', 'garbage', '{}', '{"hook_event_name":"PreToolUse"}', fixtures[0]!]) {
      const r = emit(input);
      expect(r.status).toBe(0);
      expect(r.stdout).toBe('');
      expect(r.stderr).toBe('');
    }
  });

  it('spools while the daemon is down and replays the spool on start', async () => {
    emit(fixtures[3]!); // SubagentStart
    expect(fs.readFileSync(path.join(dir, 'spool.jsonl'), 'utf8')).toContain('agent.spawn');
    await startDaemon();
    const snap = JSON.parse((await req('GET', '/snapshot?t=' + info.token)).body);
    expect(snap.events.some((e: { type: string; agent_id: string }) => e.type === 'agent.spawn' && e.agent_id === 'aa113a5a56d802045')).toBe(true);
    expect(fs.existsSync(path.join(dir, 'spool.jsonl'))).toBe(false);
  });

  it('streams every hook of a real session in under a second', async () => {
    const got: { type: string; ts: number; status?: string }[] = [];
    const close = openStream((ev) => got.push(...ev.map((e) => ({ ...e, rx: Date.now() }))));
    await new Promise((r) => setTimeout(r, 200));
    const t0 = Date.now();
    for (const line of fixtures) expect(await emitAsync(line)).toBe(0);
    for (let i = 0; i < 40 && !got.some((e) => e.type === 'session.end'); i++) await new Promise((r) => setTimeout(r, 50));
    close();
    expect(got.some((e) => e.type === 'session.end')).toBe(true);
    expect(got.filter((e) => e.type === 'tool.call').length).toBeGreaterThanOrEqual(5);
    const worst = Math.max(...got.map((e) => (e as unknown as { rx: number }).rx - e.ts));
    expect(worst).toBeLessThan(1000);
    expect(Date.now() - t0).toBeLessThan(fixtures.length * 400);
  });

  it('rejects requests without token, from foreign origins or foreign hosts', async () => {
    expect((await req('GET', '/snapshot')).status).toBe(401);
    expect((await req('POST', '/events', { body: '[]' })).status).toBe(401);
    expect((await req('GET', '/snapshot?t=' + info.token, { headers: { origin: 'https://evil.example' } })).status).toBe(403);
    expect((await req('GET', '/health', { headers: { host: 'evil.example' } })).status).toBe(421);
    expect((await req('GET', '/snapshot?t=wrong')).status).toBe(401);
  });

  it('limits body size and drops invalid events', async () => {
    const big = JSON.stringify([{ pad: 'x'.repeat(600 * 1024) }]);
    expect((await req('POST', '/events', { body: big, headers: { 'x-ao-token': info.token } })).status).toBe(413);
    const r = await req('POST', '/events', { body: JSON.stringify([{ type: 'agent.status', status: 'hacking' }]), headers: { 'x-ao-token': info.token } });
    expect(r.status).toBe(202);
    expect(JSON.parse(r.body)).toEqual({ accepted: 0, rejected: 1 });
  });

  it('never stores prompts or tool output', () => {
    const journal = fs.readFileSync(path.join(dir, 'events.jsonl'), 'utf8');
    expect(journal).not.toMatch(/redacted|tool_response|last_assistant_message|transcript/);
  });

  it('restores state from the journal after a restart', async () => {
    await stopDaemon();
    await startDaemon();
    const snap = JSON.parse((await req('GET', '/snapshot?t=' + info.token)).body);
    expect(snap.events.filter((e: { type: string }) => e.type === 'tool.call').length).toBeGreaterThanOrEqual(5);
  });

  it('demo mode can be switched on at runtime and produces agents', async () => {
    const got: { type: string }[] = [];
    const close = openStream((ev) => got.push(...ev));
    expect(JSON.parse((await req('POST', '/demo?on=1', { headers: { 'x-ao-token': info.token } })).body).demo).toBe(true);
    for (let i = 0; i < 60 && !got.some((e) => e.type === 'tool.call'); i++) await new Promise((r) => setTimeout(r, 100));
    close();
    expect(got.some((e) => e.type === 'agent.spawn')).toBe(true);
    expect(got.some((e) => e.type === 'tool.call')).toBe(true);
  });
});
