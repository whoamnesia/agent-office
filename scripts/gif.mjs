// Renders docs/screens/day-cycle.gif: one full day over the office, captured frame by frame from the demo.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'docs/screens/day-cycle.gif');
const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-gif-'));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-gif-data-'));
const daemon = spawn(process.execPath, [path.join(root, 'plugin/dist/daemon.mjs'), '--demo', '--port', '0'], { env: { ...process.env, AO_DATA_DIR: data }, stdio: 'ignore' });
let info;
for (let i = 0; i < 100 && !info; i++) {
  await new Promise((r) => setTimeout(r, 100));
  try {
    info = JSON.parse(fs.readFileSync(path.join(data, 'daemon.json'), 'utf8'));
  } catch {}
}
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 600 }, locale: 'ru-RU' });
await page.goto(`http://127.0.0.1:${info.port}/?t=${info.token}`);
await page.waitForFunction(() => window.__ao?.ready === true);
await page.waitForTimeout(15000);
await page.evaluate(() => {
  document.documentElement.classList.add('ao-ui-hidden');
  window.__ao.scene.setConfig({ showUI: false, weather: 'clear' });
  window.__ao.scene.camera.lookAtTile(22, 22, 40, 1, true);
});
const N = 36;
for (let i = 0; i < N; i++) {
  await page.evaluate((t) => window.__ao.setTime(t), (0.22 + i / N) % 1);
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(frames, `f${String(i).padStart(3, '0')}.png`) });
}
await browser.close();
daemon.kill();
const pal = path.join(frames, 'pal.png');
spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '6', '-i', path.join(frames, 'f%03d.png'), '-vf', 'scale=720:-1:flags=neighbor,palettegen=max_colors=128', pal], { stdio: 'inherit' });
spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '6', '-i', path.join(frames, 'f%03d.png'), '-i', pal, '-lavfi', 'scale=720:-1:flags=neighbor[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4', out], { stdio: 'inherit' });
console.log('wrote', path.relative(root, out), (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
