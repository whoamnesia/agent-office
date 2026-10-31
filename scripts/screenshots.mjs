// npm run screenshots: starts a demo daemon, captures every phase of the day and a close-up into docs/screens/.
// Usage: node scripts/screenshots.mjs [outDir] [--only name1,name2] [--wait ms]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const outDir = path.resolve(args.find((a) => !a.startsWith('--')) ?? path.join(root, 'docs/screens'));
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : undefined;
const warm = args.includes('--wait') ? Number(args[args.indexOf('--wait') + 1]) : 9000;
fs.mkdirSync(outDir, { recursive: true });

const data = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-shots-'));
const env = { ...process.env, AO_DATA_DIR: data, AO_NO_OPEN: '1', CLAUDE_PLUGIN_DATA: '' };
const daemon = spawn(process.execPath, [path.join(root, 'plugin/dist/daemon.mjs'), '--demo', '--port', '0', '--agents', '12', '--pace', '0.7'], { env, stdio: 'ignore' });
let info;
for (let i = 0; i < 100 && !info; i++) {
  await new Promise((r) => setTimeout(r, 100));
  try {
    info = JSON.parse(fs.readFileSync(path.join(data, 'daemon.json'), 'utf8'));
  } catch {}
}
if (!info) throw new Error('daemon did not start');
const url = `http://127.0.0.1:${info.port}/?t=${info.token}`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 960 }, deviceScaleFactor: 1, locale: 'ru-RU' });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
const t0 = Date.now();
await page.goto(url);
await page.waitForFunction(() => window.__ao?.ready === true, null, { timeout: 30000 }).catch(async (e) => { console.log(errors.join('\n')); console.log(await page.content().then((h) => h.slice(-1500))); throw e; });
const readyMs = Date.now() - t0;
await page.waitForTimeout(warm);

const shots = [
  { name: 'day', t: 0.52, cam: 'hq' },
  { name: 'dawn', t: 0.27, cam: 'hq' },
  { name: 'sunset', t: 0.738, cam: 'hq' },
  { name: 'dusk', t: 0.79, cam: 'hq' },
  { name: 'night', t: 0.95, cam: 'hq' },
  { name: 'overview-day', t: 0.55, cam: 'all' },
  { name: 'overview-night', t: 0.97, cam: 'all' },
  { name: 'closeup-desk', t: 0.6, cam: 'close' },
  { name: 'closeup-night', t: 0.02, cam: 'close' },
  { name: 'street', t: 0.5, cam: 'street' },
  { name: 'street-night', t: 0.9, cam: 'street' },
  { name: 'rain', t: 0.62, cam: 'street', weather: 'rain' },
  { name: 'snow', t: 0.45, cam: 'hq', weather: 'snow' },
  { name: 'fog', t: 0.3, cam: 'all', weather: 'fog' },
];
for (const s of shots) {
  if (only && !only.includes(s.name)) continue;
  await page.evaluate(({ t, cam, weather }) => {
    const ao = window.__ao;
    ao.setTime(t);
    ao.scene.setConfig({ weather: weather ?? 'clear' });
    const sc = ao.scene;
    if (cam === 'all') sc.fitAll();
    else if (cam === 'hq') sc.focusHQ(true);
    else if (cam === 'close') {
      const a = [...sc.world.agents.values()].find((x) => !x.director && x.place === 'desk') ?? [...sc.world.agents.values()][0];
      if (a) {
        sc.focusAgent(a.key, 4);
        sc.selected = undefined;
      }
    } else if (cam === 'street') sc.camera.lookAtTile(30, 36, 0, 2, true);
  }, s);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: path.join(outDir, `${s.name}.jpg`), type: 'jpeg', quality: 86 });
}
const stats = await page.evaluate(() => window.__ao.scene.stats());
console.log(JSON.stringify({ readyMs, stats, errors: errors.slice(0, 20) }, null, 2));
await browser.close();
daemon.kill('SIGTERM');
