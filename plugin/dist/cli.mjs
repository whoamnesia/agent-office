import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// packages/daemon/src/cli.ts
import fs2 from "node:fs";
import path3 from "node:path";
import { fileURLToPath } from "node:url";

// packages/daemon/src/launcher.ts
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path2 from "node:path";

// packages/daemon/src/paths.ts
import os from "node:os";
import path from "node:path";
function dataDir(env = process.env) {
  return env.AO_DATA_DIR || env.CLAUDE_PLUGIN_DATA || path.join(os.homedir(), ".claude", "plugins", "data", "agent-office");
}
function files(dir = dataDir()) {
  return {
    dir,
    daemon: path.join(dir, "daemon.json"),
    lock: path.join(dir, "daemon.lock"),
    token: path.join(dir, "token"),
    spool: path.join(dir, "spool.jsonl"),
    journal: path.join(dir, "events.jsonl"),
    config: path.join(dir, "agent-office.config.json"),
    log: path.join(dir, "daemon.log")
  };
}

// packages/daemon/src/launcher.ts
function readInfo(file = files().daemon) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return void 0;
  }
}
function request(port, method, p, token, body, timeout = 600) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: "127.0.0.1", port, path: p, method, timeout, headers: { ...token ? { "x-ao-token": token } : {}, ...body ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : {} } },
      (res) => {
        let b = "";
        res.setEncoding("utf8");
        res.on("data", (c) => b += c);
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: b }));
      }
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve({ status: 0, body: "" }));
    req.end(body);
  });
}
async function healthy(info) {
  if (!info) return false;
  const r = await request(info.port, "GET", "/health");
  return r.status === 200;
}
var urlOf = (info) => `http://127.0.0.1:${info.port}/?t=${info.token}`;
async function ensureDaemon(opts) {
  const f = files();
  let info = readInfo(f.daemon);
  if (await healthy(info)) {
    if (opts.demo) await request(info.port, "POST", "/demo?on=1", info.token);
    return info;
  }
  const entry = path2.resolve(opts.binDir, "..", "dist", "daemon.mjs");
  if (!fs.existsSync(entry)) return void 0;
  fs.mkdirSync(f.dir, { recursive: true });
  const out = fs.openSync(f.log, "a");
  const child = spawn(process.execPath, [entry, ...opts.demo ? ["--demo"] : [], ...opts.extraArgs ?? []], {
    detached: true,
    stdio: ["ignore", out, out],
    env: process.env,
    windowsHide: true
  });
  child.unref();
  const deadline = Date.now() + 5e3;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 120));
    info = readInfo(f.daemon);
    if (info && await healthy(info)) return info;
  }
  return void 0;
}
function openBrowser(url) {
  if (process.env.AO_NO_OPEN === "1") return false;
  const plat = process.platform;
  const hasDisplay = plat !== "linux" || !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  if (!hasDisplay) return false;
  const [cmd, args] = plat === "darwin" ? ["open", [url]] : plat === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  try {
    const c = spawn(cmd, args, { detached: true, stdio: "ignore" });
    c.on("error", () => void 0);
    c.unref();
    return true;
  } catch {
    return false;
  }
}

// packages/daemon/src/cli.ts
var distDir = path3.dirname(fileURLToPath(import.meta.url));
var binDir = path3.resolve(distDir, "..", "bin");
var argv = process.argv.slice(2);
var flag = (n) => argv.includes("--" + n);
var opt = (n) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 ? argv[i + 1] : void 0;
};
var dataOpt = opt("data");
if (dataOpt && !dataOpt.includes("${")) process.env.AO_DATA_DIR = path3.resolve(dataOpt);
var say = (s) => {
  if (!flag("quiet")) process.stdout.write(s + "\n");
};
var HOOK_EVENTS = [
  "SessionStart",
  "SessionEnd",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PermissionRequest",
  "SubagentStart",
  "SubagentStop",
  "TaskCreated",
  "TaskCompleted",
  "Notification",
  "Stop"
];
async function start(demo) {
  const info = await ensureDaemon({ demo, binDir });
  if (!info) {
    say("Agent Office: could not start the daemon. See " + files().log);
    process.exitCode = flag("quiet") ? 0 : 1;
    return;
  }
  const url = urlOf(info);
  const opened = flag("open") ? openBrowser(url) : false;
  say(`Agent Office is running${demo ? " (demo)" : ""}: ${url}${opened ? "  (opened in your browser)" : ""}`);
}
async function stop() {
  const info = readInfo();
  if (!info) return say("Agent Office is not running.");
  try {
    process.kill(info.pid, "SIGTERM");
    say("Stopped Agent Office (pid " + info.pid + ").");
  } catch {
    say("Agent Office was not running (stale state removed).");
    try {
      fs2.unlinkSync(files().daemon);
    } catch {
    }
  }
}
async function replay(file) {
  if (!file || !fs2.existsSync(file)) {
    say("usage: agent-office replay <session.jsonl> [--speed 20]");
    process.exitCode = 1;
    return;
  }
  const info = await ensureDaemon({ binDir });
  if (!info) return say("could not start the daemon");
  const main2 = fs2.readFileSync(file, "utf8");
  const subDir = path3.join(file.replace(/\.jsonl$/, ""), "subagents");
  const subagents = fs2.existsSync(subDir) ? fs2.readdirSync(subDir).filter((n) => n.endsWith(".jsonl")).map((n) => fs2.readFileSync(path3.join(subDir, n), "utf8")) : [];
  const r = await request(info.port, "POST", `/replay?speed=${Number(opt("speed")) || 20}`, info.token, JSON.stringify({ main: main2, subagents }), 1e4);
  say(r.status === 202 ? `Replaying ${JSON.parse(r.body).events} events (${subagents.length} subagent transcripts). Open ${urlOf(info)}` : `replay failed: HTTP ${r.status}`);
}
function initCloud() {
  const dir = path3.resolve(opt("dir") ?? process.cwd());
  const target = path3.join(dir, ".claude", "agent-office");
  fs2.mkdirSync(target, { recursive: true });
  const emitter = path3.join(binDir, "ao-emit");
  const dest = path3.join(target, "ao-emit.cjs");
  if (fs2.existsSync(dest) && !flag("force")) say("kept existing " + path3.relative(dir, dest) + " (use --force to overwrite)");
  else {
    fs2.copyFileSync(emitter, dest);
    say("wrote " + path3.relative(dir, dest));
  }
  const settingsFile = path3.join(dir, ".claude", "settings.json");
  let settings = {};
  try {
    settings = JSON.parse(fs2.readFileSync(settingsFile, "utf8"));
  } catch {
  }
  const command = 'node "$CLAUDE_PROJECT_DIR/.claude/agent-office/ao-emit.cjs" --relay-only';
  settings.hooks ??= {};
  let added = 0;
  for (const ev of HOOK_EVENTS) {
    const list = settings.hooks[ev] ??= [];
    if (list.some((g) => g.hooks?.some((h) => h.command?.includes("agent-office/ao-emit")))) continue;
    list.push({ ...["PreToolUse", "PostToolUse", "PostToolUseFailure", "PermissionRequest"].includes(ev) ? { matcher: "*" } : {}, hooks: [{ type: "command", command, timeout: 5 }] });
    added++;
  }
  fs2.writeFileSync(settingsFile, JSON.stringify(settings, null, 2) + "\n");
  say(`${added ? "added " + added + " hooks to" : "hooks already present in"} ${path3.relative(dir, settingsFile)}`);
  fs2.writeFileSync(
    path3.join(target, "README.md"),
    `# Agent Office: cloud reporting

These files let a Claude Code cloud session report its activity to your Agent Office relay.
They do nothing unless the session has both environment variables:

- \`AO_RELAY_URL\`: your relay, for example \`https://agent-office-relay.<you>.workers.dev\`
- \`AO_RELAY_TOKEN\`: the relay's bearer token

Set them as environment variables or secrets of the cloud environment. Do **not** commit them.
Also add the relay host to the environment's allowed domains (network access).
Only metadata is sent: tool names, project-relative paths, statuses and token counts.
`
  );
  say("wrote " + path3.relative(dir, path3.join(target, "README.md")));
  say("\nNext: commit .claude/, then set AO_RELAY_URL and AO_RELAY_TOKEN in the cloud environment settings and allow the relay host.");
}
async function main() {
  const cmd = argv[0] && !argv[0].startsWith("--") ? argv[0] : "start";
  const invokedAs = path3.basename(process.argv[1] ?? "");
  if (invokedAs === "ao-daemon") return start(flag("demo"));
  switch (cmd) {
    case "start":
      return start(flag("demo"));
    case "demo":
      return start(true);
    case "stop":
      return stop();
    case "status": {
      const info = readInfo();
      const ok = await healthy(info);
      return say(ok && info ? `running (pid ${info.pid}) ${urlOf(info)}` : "not running");
    }
    case "url": {
      const info = readInfo();
      return say(info && await healthy(info) ? urlOf(info) : "not running");
    }
    case "replay":
      return replay(argv[1]);
    case "init-cloud":
      return initCloud();
    case "relay": {
      const relay = path3.join(distDir, "relay.mjs");
      await import(relay);
      return;
    }
    default:
      say("commands: start [--demo] [--open] | stop | status | url | replay <file.jsonl> | init-cloud [--dir] | relay");
  }
}
main().catch((e) => {
  if (!flag("quiet")) console.error(e);
  process.exitCode = flag("quiet") ? 0 : 1;
});
