import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { files, type DaemonInfo } from './paths.js';

export function readInfo(file = files().daemon): DaemonInfo | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as DaemonInfo;
  } catch {
    return undefined;
  }
}

export function request(port: number, method: string, p: string, token?: string, body?: string, timeout = 600): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: p, method, timeout, headers: { ...(token ? { 'x-ao-token': token } : {}), ...(body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {}) } },
      (res) => {
        let b = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: b }));
      },
    );
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve({ status: 0, body: '' }));
    req.end(body);
  });
}

export async function healthy(info: DaemonInfo | undefined): Promise<boolean> {
  if (!info) return false;
  const r = await request(info.port, 'GET', '/health');
  return r.status === 200;
}

export const urlOf = (info: DaemonInfo) => `http://127.0.0.1:${info.port}/?t=${info.token}`;

export interface EnsureOptions {
  demo?: boolean;
  binDir: string;
  extraArgs?: string[];
}

/** Starts the daemon detached unless a healthy one is already running; resolves with its info. */
export async function ensureDaemon(opts: EnsureOptions): Promise<DaemonInfo | undefined> {
  const f = files();
  let info = readInfo(f.daemon);
  if (await healthy(info)) {
    if (opts.demo) await request(info!.port, 'POST', '/demo?on=1', info!.token);
    return info;
  }
  const entry = path.resolve(opts.binDir, '..', 'dist', 'daemon.mjs');
  if (!fs.existsSync(entry)) return undefined;
  fs.mkdirSync(f.dir, { recursive: true });
  const out = fs.openSync(f.log, 'a');
  const child = spawn(process.execPath, [entry, ...(opts.demo ? ['--demo'] : []), ...(opts.extraArgs ?? [])], {
    detached: true,
    stdio: ['ignore', out, out],
    env: process.env,
    windowsHide: true,
  });
  child.unref();
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 120));
    info = readInfo(f.daemon);
    if (info && (await healthy(info))) return info;
  }
  return undefined;
}

/** Best-effort browser open; silently does nothing on headless machines. */
export function openBrowser(url: string): boolean {
  if (process.env.AO_NO_OPEN === '1') return false;
  const plat = process.platform;
  const hasDisplay = plat !== 'linux' || !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  if (!hasDisplay) return false;
  const [cmd, args] = plat === 'darwin' ? ['open', [url]] : plat === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  try {
    const c = spawn(cmd as string, args as string[], { detached: true, stdio: 'ignore' });
    c.on('error', () => undefined);
    c.unref();
    return true;
  } catch {
    return false;
  }
}
