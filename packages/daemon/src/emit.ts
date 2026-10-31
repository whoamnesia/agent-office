declare const require: (id: string) => unknown;
/**
 * ao-emit — the hook handler. Contract with Claude Code:
 *   - never writes to stdout/stderr, always exits 0 (exit 2 would block the tool);
 *   - bounded runtime: 300 ms network timeout locally, hard stop at 1.5 s;
 *   - if the daemon is down, appends to a spool file the daemon replays on start.
 * Bundled to plugin/bin/ao-emit with esbuild; imports must stay dependency-free.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { hookToEvents } from '@agent-office/protocol/mapping';
import { parseJsonl, sumUsage } from '@agent-office/protocol/transcript';
import { loadConfig } from './config.js';
import { files, type DaemonInfo } from './paths.js';

const HARD_STOP_MS = 1500;
const LOCAL_TIMEOUT_MS = 300;

function done(): never {
  process.exit(0);
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const t = setTimeout(() => resolve(data), 500);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => {
      data += c;
      if (data.length > 4_000_000) resolve(data);
    });
    process.stdin.on('end', () => {
      clearTimeout(t);
      resolve(data);
    });
    process.stdin.on('error', () => resolve(data));
  });
}

function post(url: string, body: string, headers: Record<string, string>, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return resolve(false);
    }
    // https is only needed for relays; loading it lazily keeps local hooks fast
    const lib: typeof http = u.protocol === 'https:' ? (require('node:https') as typeof http) : http;
    const req = lib.request(
      u,
      { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), ...headers }, timeout: timeoutMs },
      (res) => {
        res.resume();
        resolve((res.statusCode ?? 500) < 300);
      },
    );
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
    req.end(body);
  });
}

function readDaemon(file: string): DaemonInfo | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as DaemonInfo;
  } catch {
    return undefined;
  }
}

function spool(file: string, lines: string): void {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // keep the spool bounded: if it ever grows past 5 MB, start over
    try {
      if (fs.statSync(file).size > 5_000_000) fs.truncateSync(file, 0);
    } catch {
      /* no spool yet */
    }
    fs.appendFileSync(file, lines);
  } catch {
    /* read-only home or similar: drop the event */
  }
}

function startDaemon(): void {
  try {
    const launcher = path.join(path.dirname(process.argv[1] ?? '.'), 'ao-daemon');
    const { spawn } = require('node:child_process') as typeof import('node:child_process');
    const child = spawn(process.execPath, [launcher, '--quiet'], { detached: true, stdio: 'ignore', env: process.env });
    child.unref();
  } catch {
    /* ignore */
  }
}

async function main(): Promise<void> {
  const text = await readStdin();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return;
  }
  const env = process.env;
  const f = files();
  const projectDir = env.CLAUDE_PROJECT_DIR || (payload as { cwd?: string })?.cwd;
  const cfg = loadConfig(env.AO_CONFIG || f.config, projectDir);
  const relayUrl = env.AO_RELAY_URL || cfg.relayUrl || '';
  const relayToken = env.AO_RELAY_TOKEN || cfg.relayToken || '';
  const cloud = !!(relayUrl && relayToken);
  // Project-level hooks written by `init-cloud` pass --relay-only, so a machine that also has
  // the plugin installed doesn't report every local event twice.
  if (!cloud && process.argv.includes('--relay-only')) return;

  const events = hookToEvents(payload, {
    source: cloud ? 'cloud' : 'local',
    projectDir,
    showContent: cfg.showContent,
    hidePaths: cfg.hidePaths,
    ...(cfg.deptRules ? { deptRules: cfg.deptRules } : {}),
    includeTranscripts: !cloud,
  });
  if (events.length === 0) return;

  if (cloud) {
    // The daemon can't read cloud transcripts, so token totals are computed here, only on rare stop events.
    const p = payload as { hook_event_name?: string; agent_transcript_path?: string; transcript_path?: string; agent_id?: string };
    const tp = p.hook_event_name === 'SubagentStop' ? p.agent_transcript_path : p.hook_event_name === 'Stop' ? p.transcript_path : undefined;
    if (tp) {
      try {
        const st = fs.statSync(tp);
        if (st.size < 8_000_000) {
          const usage = sumUsage(parseJsonl(fs.readFileSync(tp, 'utf8')));
          const base = events[0]!;
          events.push({ ...base, id: base.id + '-tok', type: 'cost.tick', agent_id: p.hook_event_name === 'Stop' ? 'main' : (p.agent_id ?? 'main'), tokens: usage.tokens, mode: 'absolute' } as never);
        }
      } catch {
        /* transcript not there yet */
      }
    }
    const url = relayUrl.replace(/\/+$/, '') + '/events';
    await post(url, JSON.stringify(events), { authorization: 'Bearer ' + relayToken }, Number(env.AO_RELAY_TIMEOUT_MS) || 1000);
    return;
  }

  const body = JSON.stringify(events);
  const info = readDaemon(f.daemon);
  const ok = info ? await post(`http://127.0.0.1:${info.port}/events`, body, { 'x-ao-token': info.token }, LOCAL_TIMEOUT_MS) : false;
  if (!ok) {
    spool(f.spool, events.map((e) => JSON.stringify(e)).join('\n') + '\n');
    const hook = (payload as { hook_event_name?: string }).hook_event_name;
    if (hook === 'SessionStart' && cfg.autostart && env.AO_NO_AUTOSTART !== '1') startDaemon();
  }
}

process.on("uncaughtException", done);
process.on("unhandledRejection", done);
setTimeout(done, HARD_STOP_MS).unref();
main().then(done, done);
