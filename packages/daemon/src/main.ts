/** Daemon process entry (plugin/dist/daemon.mjs). Normally started detached by ao-daemon. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { DemoGenerator } from './demo.js';
import { files, VERSION, type DaemonInfo } from './paths.js';
import { RelayClient } from './relay-client.js';
import { OfficeDaemon } from './server.js';
import { drainSpool } from './store.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes('--' + name);

const here = path.dirname(fileURLToPath(import.meta.url));
const f = files(arg('data') ? path.resolve(arg('data')!) : undefined);
fs.mkdirSync(f.dir, { recursive: true, mode: 0o700 });

const logStream = fs.createWriteStream(f.log, { flags: 'a' });
const log = (m: string) => {
  const line = `[${new Date().toISOString()}] ${m}\n`;
  logStream.write(line);
  if (process.stdout.isTTY || flag('verbose')) process.stdout.write(line);
};

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function health(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 400 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(false));
  });
}

async function acquireLock(): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(f.lock, 'wx', 0o600);
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      return true;
    } catch {
      let pid = 0;
      try {
        pid = Number(fs.readFileSync(f.lock, 'utf8')) || 0;
      } catch {
        /* vanished */
      }
      let info: DaemonInfo | undefined;
      try {
        info = JSON.parse(fs.readFileSync(f.daemon, 'utf8'));
      } catch {
        /* none */
      }
      if (pid && alive(pid) && info && info.pid === pid && (await health(info.port))) return false;
      if (pid && alive(pid) && !info) {
        // another instance is starting right now
        await new Promise((r) => setTimeout(r, 800));
        if (fs.existsSync(f.daemon)) return false;
      }
      try {
        fs.unlinkSync(f.lock);
      } catch {
        /* race with another cleaner */
      }
    }
  }
  return false;
}

function loadToken(): string {
  try {
    const t = fs.readFileSync(f.token, 'utf8').trim();
    if (t.length >= 20) return t;
  } catch {
    /* create */
  }
  const t = crypto.randomBytes(18).toString('base64url');
  fs.writeFileSync(f.token, t, { mode: 0o600 });
  return t;
}

async function main() {
  if (!(await acquireLock())) {
    log('another daemon is already running; exiting');
    process.exit(0);
  }
  const config = loadConfig(f.config);
  const token = loadToken();
  const webDir = arg('web') ? path.resolve(arg('web')!) : path.join(here, 'web');
  let demo: DemoGenerator | undefined;
  const daemon: OfficeDaemon = new OfficeDaemon({
    token,
    webDir,
    journalFile: f.journal,
    configFile: f.config,
    config,
    extraOrigins: (process.env.AO_DEV_ORIGIN ?? '').split(',').filter(Boolean),
    log,
    setDemo: (on) => {
      if (on && !demo) {
        demo = new DemoGenerator((ev) => daemon.ingest(ev, false), { agents: Number(arg('agents')) || 9, pace: Number(arg('pace')) || 1 });
        demo.start();
      } else if (!on && demo) {
        demo.stop();
        demo = undefined;
      }
      daemon.demo = !!demo;
      return daemon.demo;
    },
  });

  const restored = daemon.store.restore();
  const spooled = daemon.ingest(drainSpool(f.spool));
  log(`restored ${restored} events from journal, ${spooled.length} from spool`);

  const wanted = arg('port') !== undefined ? Number(arg('port')) : config.port;
  let port: number;
  try {
    port = await daemon.listen(wanted);
  } catch {
    port = await daemon.listen(0);
  }
  const info: DaemonInfo = { pid: process.pid, port, token, startedAt: Date.now(), version: VERSION, demo: flag('demo') };
  const tmp = f.daemon + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(info), { mode: 0o600 });
  fs.renameSync(tmp, f.daemon);
  log(`listening on http://127.0.0.1:${port}/ (web: ${fs.existsSync(webDir) ? webDir : 'not built'})`);

  // The emitter spools while the daemon is down or slow; pick those up continuously.
  const spoolTimer = setInterval(() => {
    const ev = drainSpool(f.spool);
    if (ev.length) daemon.ingest(ev);
  }, 1500);

  if (flag('demo')) daemon.opts_setDemo(true);

  let relay: RelayClient | undefined;
  const relayUrl = process.env.AO_RELAY_URL || config.relayUrl;
  const relayToken = process.env.AO_RELAY_TOKEN || config.relayToken;
  if (relayUrl && relayToken) {
    relay = new RelayClient(daemon, relayUrl, relayToken);
    relay.start();
    log(`subscribed to relay ${new URL(relayUrl).host}`);
  }

  const shutdown = async () => {
    clearInterval(spoolTimer);
    demo?.stop();
    relay?.stop();
    try {
      const cur = JSON.parse(fs.readFileSync(f.daemon, 'utf8')) as DaemonInfo;
      if (cur.pid === process.pid) fs.unlinkSync(f.daemon);
    } catch {
      /* already gone */
    }
    try {
      if (Number(fs.readFileSync(f.lock, 'utf8')) === process.pid) fs.unlinkSync(f.lock);
    } catch {
      /* already gone */
    }
    await daemon.close().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGHUP', shutdown);
}

main().catch((e) => {
  log('fatal: ' + (e as Error).stack);
  process.exit(1);
});
