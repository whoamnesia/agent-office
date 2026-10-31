// npm run dev: daemon in demo mode + Vite dev server with hot reload, proxied to the daemon.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const data = path.join(root, '.ao-data-dev');
const env = { ...process.env, AO_DATA_DIR: data };
if (!fs.existsSync(path.join(root, 'plugin/dist/daemon.mjs'))) spawnSync('node', ['scripts/bundle.mjs'], { cwd: root, stdio: 'inherit' });
if (!fs.existsSync(path.join(root, 'packages/office-web/public/assets/manifest.json'))) spawnSync('npm', ['run', 'assets'], { cwd: root, stdio: 'inherit' });
spawnSync(process.execPath, [path.join(root, 'plugin/bin/agent-office'), 'start', '--demo', '--quiet'], { env, stdio: 'inherit' });
const info = JSON.parse(fs.readFileSync(path.join(data, 'daemon.json'), 'utf8'));
const vite = spawn('npx', ['vite', '--port', '5173', '--strictPort'], { cwd: path.join(root, 'packages/office-web'), env: { ...process.env, AO_DAEMON_URL: `http://127.0.0.1:${info.port}` }, stdio: 'inherit', shell: process.platform === 'win32' });
setTimeout(() => console.log(`\n  Agent Office dev: http://localhost:5173/?t=${info.token}\n`), 1500);
const stop = () => {
  vite.kill();
  spawnSync(process.execPath, [path.join(root, 'plugin/bin/agent-office'), 'stop'], { env, stdio: 'inherit' });
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
