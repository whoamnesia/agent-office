// npm run demo: start the office in demo mode (no Claude Code needed) and print/open the URL.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const plugin = path.join(root, 'plugin');
if (!fs.existsSync(path.join(plugin, 'dist/web/index.html')) || !fs.existsSync(path.join(plugin, 'dist/daemon.mjs'))) {
  console.log('First run: building the UI and runtime…');
  const r = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
// a repo-local data dir keeps the demo separate from a real plugin installation
const env = { ...process.env, AO_DATA_DIR: process.env.AO_DATA_DIR ?? path.join(root, '.ao-data') };
const t0 = Date.now();
const r = spawnSync(process.execPath, [path.join(plugin, 'bin/agent-office'), 'start', '--demo', '--open'], { env, stdio: 'inherit' });
console.log(`(daemon ready in ${Date.now() - t0} ms; stop with: AO_DATA_DIR=.ao-data node plugin/bin/agent-office stop)`);
process.exit(r.status ?? 0);
