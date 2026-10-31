import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
const root = '/home/user/agent-office';
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-probe-'));
const daemon = spawn(process.execPath, [path.join(root, 'plugin/dist/daemon.mjs'), '--demo', '--port', '0'], { env: { ...process.env, AO_DATA_DIR: data }, stdio: 'ignore' });
let info; for (let i = 0; i < 100 && !info; i++) { await new Promise((r) => setTimeout(r, 100)); try { info = JSON.parse(fs.readFileSync(path.join(data, 'daemon.json'), 'utf8')); } catch {} }
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://127.0.0.1:${info.port}/?t=${info.token}`);
await page.waitForFunction(() => window.__ao?.ready);
for (const wait of [4000, 8000]) {
  await page.waitForTimeout(wait);
  console.log(await page.evaluate(() => {
    const w = window.__ao.scene.world;
    return [...w.agents.values()].filter((a) => !a.director).slice(0, 8).map((a) => `${a.id.slice(0, 6)} ${a.phase}/${a.place} ${a.status} pos=${a.pos.map((v) => v.toFixed(1))} path=${a.path.length} spot=${a.spot?.pos} catch=${w.catchingUp} now=${w.now - Date.now()}`).join('\n');
  }));
}
console.log(await page.evaluate(() => {
  const sc = window.__ao.scene; const a = [...sc.world.agents.values()].find((x) => !x.director && x.phase === 'active');
  if (a) sc.focusAgent(a.key, 3);
  return new Promise((res) => setTimeout(() => {
    const out = [];
    for (const [id, v] of sc.buildings) out.push(`${id} open=${v.building.openFloor} interior=${v.interior?.floorId} chars=${v.interior ? v.interior['chars'].size : -1} agentsOnOpen=${sc.world.floorAgents(v.building.openFloor).length}`);
    res(out.join('\n') + '\nfocused ' + a?.key);
  }, 3000));
}));
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(n / 3); }; requestAnimationFrame(f); }));
console.log('rAF fps', fps, 'scene fps', await page.evaluate(() => window.__ao.scene.fps));
const t = await page.evaluate(() => { const r = window.__ao.scene.app.renderer; const t0 = performance.now(); for (let i = 0; i < 5; i++) window.__ao.scene.app.render(); return (performance.now() - t0) / 5; });
console.log('render ms', t, JSON.stringify(await page.evaluate(() => window.__ao.scene.prof)));
await browser.close(); daemon.kill();
