import os from 'node:os';
import path from 'node:path';

/** Per-user data directory: explicit override, then the plugin data dir Claude Code provides, then a stable fallback. */
export function dataDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.AO_DATA_DIR || env.CLAUDE_PLUGIN_DATA || path.join(os.homedir(), '.claude', 'plugins', 'data', 'agent-office');
}

export function files(dir = dataDir()) {
  return {
    dir,
    daemon: path.join(dir, 'daemon.json'),
    lock: path.join(dir, 'daemon.lock'),
    token: path.join(dir, 'token'),
    spool: path.join(dir, 'spool.jsonl'),
    journal: path.join(dir, 'events.jsonl'),
    config: path.join(dir, 'agent-office.config.json'),
    log: path.join(dir, 'daemon.log'),
  };
}

export interface DaemonInfo {
  pid: number;
  port: number;
  token: string;
  startedAt: number;
  version: string;
  demo: boolean;
}

export const DEFAULT_PORT = 47821;
export const VERSION = '0.1.0';
