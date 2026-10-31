/**
 * `agent-office` CLI (plugin/bin/agent-office) and `ao-daemon` (plugin/bin/ao-daemon).
 *   agent-office start [--demo] [--open]   start the daemon (detached) and print the URL
 *   agent-office stop | status | url
 *   agent-office replay <session.jsonl> [--speed 20]
 *   agent-office init-cloud [--dir <repo>] [--force]
 *   agent-office relay [--port 8787]       run the Node relay (token from AO_RELAY_TOKEN)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDaemon, openBrowser, readInfo, request, urlOf, healthy } from './launcher.js';
import { files } from './paths.js';

const distDir = path.dirname(fileURLToPath(import.meta.url));
const binDir = path.resolve(distDir, '..', 'bin');
const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes('--' + n);
const opt = (n: string) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 ? argv[i + 1] : undefined;
};
// Slash commands don't get CLAUDE_PLUGIN_DATA in their environment, but `${CLAUDE_PLUGIN_DATA}`
// is substituted in their text, so they pass it explicitly to share the hooks' data dir.
const dataOpt = opt('data');
if (dataOpt && !dataOpt.includes('${')) process.env.AO_DATA_DIR = path.resolve(dataOpt);
const say = (s: string) => {
  if (!flag('quiet')) process.stdout.write(s + '\n');
};

const HOOK_EVENTS = [
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'PermissionRequest',
  'SubagentStart',
  'SubagentStop',
  'TaskCreated',
  'TaskCompleted',
  'Notification',
  'Stop',
];

async function start(demo: boolean) {
  const info = await ensureDaemon({ demo, binDir });
  if (!info) {
    say('Agent Office: could not start the daemon. See ' + files().log);
    process.exitCode = flag('quiet') ? 0 : 1;
    return;
  }
  const url = urlOf(info);
  const opened = flag('open') ? openBrowser(url) : false;
  say(`Agent Office is running${demo ? ' (demo)' : ''}: ${url}${opened ? '  (opened in your browser)' : ''}`);
}

async function stop() {
  const info = readInfo();
  if (!info) return say('Agent Office is not running.');
  try {
    process.kill(info.pid, 'SIGTERM');
    say('Stopped Agent Office (pid ' + info.pid + ').');
  } catch {
    say('Agent Office was not running (stale state removed).');
    try {
      fs.unlinkSync(files().daemon);
    } catch {
      /* ignore */
    }
  }
}

async function replay(file: string | undefined) {
  if (!file || !fs.existsSync(file)) {
    say('usage: agent-office replay <session.jsonl> [--speed 20]');
    process.exitCode = 1;
    return;
  }
  const info = await ensureDaemon({ binDir });
  if (!info) return say('could not start the daemon');
  const main = fs.readFileSync(file, 'utf8');
  const subDir = path.join(file.replace(/\.jsonl$/, ''), 'subagents');
  const subagents = fs.existsSync(subDir) ? fs.readdirSync(subDir).filter((n) => n.endsWith('.jsonl')).map((n) => fs.readFileSync(path.join(subDir, n), 'utf8')) : [];
  const r = await request(info.port, 'POST', `/replay?speed=${Number(opt('speed')) || 20}`, info.token, JSON.stringify({ main, subagents }), 10_000);
  say(r.status === 202 ? `Replaying ${JSON.parse(r.body).events} events (${subagents.length} subagent transcripts). Open ${urlOf(info)}` : `replay failed: HTTP ${r.status}`);
}

/** Writes the minimal, dependency-free files a cloud VM needs to report to a relay. */
function initCloud() {
  const dir = path.resolve(opt('dir') ?? process.cwd());
  const target = path.join(dir, '.claude', 'agent-office');
  fs.mkdirSync(target, { recursive: true });
  const emitter = path.join(binDir, 'ao-emit');
  // .cjs: the bundle is CommonJS and must not be affected by the repo's package.json "type"
  const dest = path.join(target, 'ao-emit.cjs');
  if (fs.existsSync(dest) && !flag('force')) say('kept existing ' + path.relative(dir, dest) + ' (use --force to overwrite)');
  else {
    fs.copyFileSync(emitter, dest);
    say('wrote ' + path.relative(dir, dest));
  }

  const settingsFile = path.join(dir, '.claude', 'settings.json');
  let settings: { hooks?: Record<string, { matcher?: string; hooks: { type: string; command: string; timeout?: number }[] }[]> } & Record<string, unknown> = {};
  try {
    settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  } catch {
    /* new file */
  }
  const command = 'node "$CLAUDE_PROJECT_DIR/.claude/agent-office/ao-emit.cjs" --relay-only';
  settings.hooks ??= {};
  let added = 0;
  for (const ev of HOOK_EVENTS) {
    const list = (settings.hooks[ev] ??= []);
    if (list.some((g) => g.hooks?.some((h) => h.command?.includes('agent-office/ao-emit')))) continue;
    list.push({ ...(['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest'].includes(ev) ? { matcher: '*' } : {}), hooks: [{ type: 'command', command, timeout: 5 }] });
    added++;
  }
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2) + '\n');
  say(`${added ? 'added ' + added + ' hooks to' : 'hooks already present in'} ${path.relative(dir, settingsFile)}`);

  fs.writeFileSync(
    path.join(target, 'README.md'),
    `# Agent Office: cloud reporting

These files let a Claude Code cloud session report its activity to your Agent Office relay.
They do nothing unless the session has both environment variables:

- \`AO_RELAY_URL\`: your relay, for example \`https://agent-office-relay.<you>.workers.dev\`
- \`AO_RELAY_TOKEN\`: the relay's bearer token

Set them as environment variables or secrets of the cloud environment. Do **not** commit them.
Also add the relay host to the environment's allowed domains (network access).
Only metadata is sent: tool names, project-relative paths, statuses and token counts.
`,
  );
  say('wrote ' + path.relative(dir, path.join(target, 'README.md')));
  say('\nNext: commit .claude/, then set AO_RELAY_URL and AO_RELAY_TOKEN in the cloud environment settings and allow the relay host.');
}

async function main() {
  const cmd = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'start';
  const invokedAs = path.basename(process.argv[1] ?? '');
  if (invokedAs === 'ao-daemon') return start(flag('demo'));
  switch (cmd) {
    case 'start':
      return start(flag('demo'));
    case 'demo':
      return start(true);
    case 'stop':
      return stop();
    case 'status': {
      const info = readInfo();
      const ok = await healthy(info);
      return say(ok && info ? `running (pid ${info.pid}) ${urlOf(info)}` : 'not running');
    }
    case 'url': {
      const info = readInfo();
      return say(info && (await healthy(info)) ? urlOf(info) : 'not running');
    }
    case 'replay':
      return replay(argv[1]);
    case 'init-cloud':
      return initCloud();
    case 'relay': {
      const relay = path.join(distDir, 'relay.mjs');
      await import(relay);
      return;
    }
    default:
      say('commands: start [--demo] [--open] | stop | status | url | replay <file.jsonl> | init-cloud [--dir] | relay');
  }
}

main().catch((e) => {
  if (!flag('quiet')) console.error(e);
  process.exitCode = flag('quiet') ? 0 : 1;
});
