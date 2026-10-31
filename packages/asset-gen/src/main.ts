/**
 * `npm run assets`: deterministic procedural generation of every sprite atlas.
 * Output → packages/office-web/public/assets (atlases, sky layers, manifest) and plugin/.claude-plugin/icon.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { FLOOR_D, FLOOR_W, LOBBY_H, SLAB_H, STOREY_H, decorTowers, skyline, towerParts } from './buildings.js';
import { ANIMS, CHAR_H, CHAR_W, drawCharacter, drawMascot, FAMILY_KEYS, FEET_X, FEET_Y, PRESETS } from './chars.js';
import { chairs, DESK_H, desks, furniture, MONITOR, screens, walls, WALL_H, type Named } from './furniture.js';
import { fx } from './fx.js';
import { animals, streetProps, trees, vehicles } from './outdoor.js';
import { preview, Sheet, writePng } from './pack.js';
import { makeTiles } from './tiles.js';

const root = path.resolve(import.meta.dirname, '../../..');
const outDir = path.join(root, 'packages/office-web/public/assets');
const t0 = Date.now();

function addNamed(sheet: Sheet, list: Named[]) {
  for (const [name, o] of list) sheet.add(name, o.img, o.ax, o.ay);
}

// characters
const chars = new Sheet('chars');
for (const pr of PRESETS)
  for (const facing of ['front', 'back'] as const)
    for (const [anim, poses] of Object.entries(ANIMS)) {
      const names: string[] = [];
      poses.forEach((pose, i) => {
        const name = `${pr.id}/${facing}/${anim}/${i}`;
        chars.add(name, drawCharacter(pr, facing, pose), FEET_X, FEET_Y);
        names.push(name);
      });
      chars.anim(`${pr.id}/${facing}/${anim}`, names);
    }
for (let f = 0; f < 2; f++) chars.add(`mascot_${f}`, drawMascot(f), 8, 15);
addNamed(chars, animals());

const tiles = makeTiles();
const office = new Sheet('office');
const city = new Sheet('city');
for (const t of tiles) (t.name.startsWith('floor_') ? office : city).add(t.name, t.img, 16, 0);
addNamed(office, [...desks(), ...chairs(), ...screens(), ...walls(), ...furniture()]);
addNamed(city, [...trees(), ...streetProps(), ...vehicles()]);
const fxSheet = new Sheet('fx');
addNamed(fxSheet, fx());
const buildings = new Sheet('buildings');
addNamed(buildings, [...towerParts(), ...decorTowers()]);

const results: Record<string, { w: number; h: number; count: number }> = {};
for (const s of [chars, office, city, fxSheet, buildings]) results[s.name] = s.write(outDir, s.name === 'buildings' ? 4096 : 2048);

for (const { name, img } of skyline()) writePng(path.join(outDir, 'sky', name + '.png'), img);

const manifest = {
  version: 1,
  generatedBy: '@agent-office/asset-gen',
  sheets: Object.keys(results),
  sky: ['sky_far', 'sky_far_night', 'sky_mid', 'sky_mid_night', 'cloud_0', 'cloud_1', 'cloud_2'],
  tile: { w: 32, h: 16 },
  floor: { w: FLOOR_W, d: FLOOR_D, storeyH: STOREY_H, slabH: SLAB_H, lobbyH: LOBBY_H, wallH: WALL_H },
  desk: { h: DESK_H, monitor: MONITOR },
  char: { w: CHAR_W, h: CHAR_H, feetX: FEET_X, feetY: FEET_Y, presets: PRESETS.map((p) => p.id), families: FAMILY_KEYS, anims: Object.fromEntries(Object.entries(ANIMS).map(([k, v]) => [k, v.length])) },
};
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Plugin icon: the mascot on a warm tile, scaled with nearest-neighbour.
{
  const size = 512;
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, '#3b2a4a');
  g.addColorStop(1, '#1f1729');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, 96);
  ctx.fill();
  const glow = ctx.createRadialGradient(256, 300, 10, 256, 300, 230);
  glow.addColorStop(0, 'rgba(255,200,120,0.55)');
  glow.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  const m = drawMascot(0);
  const mc = createCanvas(m.w, m.h);
  const mctx = mc.getContext('2d');
  const id = mctx.createImageData(m.w, m.h);
  id.data.set(m.data);
  mctx.putImageData(id, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mc, 64, 64, 384, 384);
  const iconFile = path.join(root, 'plugin/.claude-plugin/icon.png');
  fs.writeFileSync(iconFile, c.toBuffer('image/png'));
}

if (process.argv.includes('--preview')) {
  const dir = process.argv[process.argv.indexOf('--preview') + 1] ?? '/tmp';
  preview(path.join(dir, 'city-preview.png'), [...trees(), ...streetProps(), ...vehicles().filter((_, i) => i % 4 === 0), ...animals()].map(([, o]) => ({ img: o.img })), 2, 12);
  preview(path.join(dir, 'fx-preview.png'), fx().filter(([n]) => !n.startsWith('light')).map(([, o]) => ({ img: o.img })), 5, 16);
  preview(path.join(dir, 'buildings-preview.png'), [...towerParts(), ...decorTowers()].map(([, o]) => ({ img: o.img })), 1, 8);
}

for (const [k, v] of Object.entries(results)) console.log(`${k.padEnd(10)} ${String(v.count).padStart(5)} sprites  ${v.w}×${v.h}`);
console.log(`assets generated in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${path.relative(root, outDir)}`);
