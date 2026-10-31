// Bakes the panel mod's pixel art from the office atlases:
//   node tools/panel-sprites.mjs  →  mods/agent-office-panel/hooks/sprites.ts
// The app scrubs a pane's SVG with DOMPurify: no <image>, href only to "#id". So every
// sprite becomes vector pixels (one stroked path per colour, row runs), defined once and
// placed with <use href="#id">. The room is a list of placements (floor and walls repeat);
// on top go the desks, chairs and glass in front of a seated worker, monitor screens,
// status icons and the characters' seated animations.
import { readFileSync, writeFileSync } from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const ASSETS = new URL('../packages/office-web/public/assets/', import.meta.url);
const OUT = new URL('../mods/agent-office-panel/hooks/sprites.ts', import.meta.url);

const sheets = {};
for (const name of ['office', 'chars', 'fx']) {
  const json = JSON.parse(readFileSync(new URL(`${name}.json`, ASSETS), 'utf8'));
  sheets[name] = { json, img: await loadImage(readFileSync(new URL(`${name}.png`, ASSETS))) };
}
function frame(name) {
  for (const s of Object.values(sheets)) {
    const f = s.json.frames[name];
    if (f) return { ...f, img: s.img };
  }
  throw new Error(`no frame ${name}`);
}
/** Top-left offset of a frame's trimmed pixels from the point it is placed at. */
function offset(f, charAnchor) {
  const ax = charAnchor ? 12 : f.anchor.x * f.sourceSize.w;
  const ay = charAnchor ? 34 : f.anchor.y * f.sourceSize.h;
  return [Math.round(f.spriteSourceSize.x - ax), Math.round(f.spriteSourceSize.y - ay)];
}

const isoX = (x, y) => (x - y) * 16;
const isoY = (x, y, z = 0) => (x + y) * 8 - z;
const depth = (x, y, b = 0) => x + y + b;

// ── the room ─────────────────────────────────────────────────────────────────
const W = 12;
const D = 9;
const tiles = Array.from({ length: D }, (_, y) => Array.from({ length: W }, (_, x) => ((x * 7 + y * 3) % 5 === 0 ? 'floor_wood_1' : 'floor_wood_0')));
const area = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[y][x] = t; };
area(0, 0, 4, 3, 'floor_carpet_director');
area(6, 0, 11, 3, 'floor_carpet_research');
area(6, 5, 11, 8, 'floor_carpet_frontend');
area(1, 5, 3, 8, 'floor_carpet_qa');

/** Static sprites: [name, x, y, depth, z?]. */
const statics = [];
const put = (name, x, y, d, z = 0) => statics.push({ name, px: isoX(x, y), py: isoY(x, y, z), d });

const walls = [];
for (let x = 0; x < W; x++) walls.push(['wall_x_' + (x <= 4 ? 'solid' : 'window'), x, 0]);
for (let y = 0; y < D; y++) walls.push(['wall_y_window', 0, y]);
walls.sort((a, b) => a[1] + a[2] - (b[1] + b[2]));
const wallItems = [['tv_dashboard', 0.4, 0], ['poster_2', 3.4, 0], ['kanban', 7, 0], ['whiteboard', 0, 6]];

const item = (name, x, y, w, d) => put(name, x, y, depth(x + w / 2, y + d / 2));
item('plant_big', 0, 0, 1, 1);
item('plant_big', 11, 0, 1, 1);
item('armchair', 0, 2.6, 1, 1);
item('cooler', 5.3, 0.2, 0.8, 0.6);
for (let x = 0; x <= 4; x++) if (x !== 2) put('glass_x', x, 4, depth(x + 0.5, 4));
put('glass_door_x', 2, 4, depth(2.5, 4));
for (let y = 0; y <= 3; y++) put('glass_y', 5, y, depth(5, y + 0.5));

const DECOR = ['deco_mug', 'deco_succulent', 'deco_papers', 'deco_duck', 'deco_mug_red', 'deco_sticky', 'deco_plush_bear', 'deco_frame'];
/** Seats the panel fills: the director first, then the desks in the order they're handed out. */
const seats = [];
function desk(sprite, x, y, seat, facing, chair, screen, decor) {
  const dw = sprite === 'desk_director' ? 2.4 : 2;
  const dd = depth(x + dw / 2, y + 0.5);
  put(sprite, x, y, dd);
  put(chair, seat[0] - 0.5, seat[1] - 0.5, depth(seat[0], seat[1], facing === 'ne' ? 0.06 : -0.06));
  const [dx, dy] = sprite === 'desk_b' ? [x + 1.65, y + 0.35] : [x + 0.35, y + 0.45];
  put(decor, dx, dy, dd + 0.002, 13);
  seats.push({
    px: isoX(seat[0], seat[1]), py: isoY(seat[0], seat[1]), d: depth(seat[0], seat[1], 0.001),
    back: facing === 'ne',
    screen: screen ? { px: isoX(x, y), py: isoY(x, y), d: dd + 0.001 } : undefined,
  });
}
desk('desk_director', 1, 1.3, [2.9, 0.75], 'sw', 'chair_front_coral', false, 'deco_plush');
let dk = 0;
for (const p of [0, 4]) for (const cx of p === 0 ? [6, 9] : [6, 9, 1]) {
  desk('desk_a', cx, p + 2, [cx + 1, p + 3.55], 'ne', 'chair_back', true, DECOR[dk++ % DECOR.length]);
  desk('desk_b', cx, p + 1, [cx + 1, p + 0.45], 'sw', 'chair_front', false, DECOR[dk++ % DECOR.length]);
}

// Frames' boxes in scene pixels.
const box = (name, px, py, char) => {
  const f = frame(name);
  const [ox, oy] = offset(f, char);
  return { x: px + ox, y: py + oy, w: f.frame.w, h: f.frame.h };
};
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const charBox = s => ({ x: s.px - 12, y: s.py - 50, w: 24, h: 54 }); // the body and an icon above it

// A static goes into the background unless it must cover a seated worker.
const baked = [];
const overlays = [];
for (const s of statics) {
  const b = box(s.name, s.px, s.py);
  (seats.some(seat => seat.d < s.d && overlap(b, charBox(seat))) ? overlays : baked).push(s);
}

// Scene bounds.
const all = [];
for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) all.push(box(tiles[y][x], isoX(x, y), isoY(x, y)));
for (const [n, x, y] of walls) all.push(box(n, isoX(x, y), isoY(x, y)));
for (const s of statics) all.push(box(s.name, s.px, s.py));
for (const s of seats) all.push(charBox(s));
const minX = Math.floor(Math.min(...all.map(b => b.x))) - 2;
const minY = Math.floor(Math.min(...all.map(b => b.y))) - 2;
const maxX = Math.ceil(Math.max(...all.map(b => b.x + b.w))) + 2;
const maxY = Math.ceil(Math.max(...all.map(b => b.y + b.h))) + 2;


/** The room behind everyone: [name, x, y] in paint order. */
const room = [];
for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) room.push([tiles[y][x], isoX(x, y), isoY(x, y)]);
for (const [n, x, y] of walls) room.push([n, isoX(x, y), isoY(x, y)]);
for (const [n, x, y] of wallItems) room.push([n, isoX(x, y), isoY(x, y)]);
for (const s of baked.sort((a, b) => a.d - b.d)) room.push([s.name, s.px, s.py]);

// ── the sprites the panel may place ──────────────────────────────────────────
const FAMILIES = ['explore', 'general', 'plan', 'review', 'qa', 'docs', 'security', 'frontend'];
const ANIMS = ['think', 'read', 'type', 'hand', 'error', 'joy', 'sit'];
const want = new Map(); // name → char anchor?
for (const [n] of room) want.set(n, false);
for (const o of overlays) want.set(o.name, false);
for (const s of ['code', 'term', 'search', 'think', 'wait', 'error', 'idle']) for (const i of [0, 1]) want.set(`screen_${s}_${i}`, false);
want.set('screen_code_2', false);
want.set('screen_done_0', false);
for (const n of ['icon_think_0', 'icon_think_1', 'icon_think_2', 'icon_alert', 'icon_error', 'icon_done', 'icon_search', 'icon_gear', 'icon_book', 'icon_pen', 'icon_zzz_0', 'icon_zzz_1', 'smoke_0', 'smoke_1', 'smoke_2', 'confetti_0', 'confetti_1', 'confetti_2', 'confetti_3'])
  want.set(n, false);
const anims = {};
for (const preset of [...FAMILIES.map(f => `${f}_0`), 'director'])
  for (const side of preset === 'director' ? ['front'] : ['front', 'back'])
    for (const a of ANIMS) {
      const key = `${preset}/${side}/${a}`;
      const names = sheets.chars.json.animations[key] ?? [`${key}/0`];
      anims[key] = names;
      for (const n of names) want.set(n, true);
    }

// 4 bits a channel: near shades merge into longer runs, roughly halving the paths.
const Q4 = +(process.env.Q4 ?? 1);
const q = v => (Q4 ? Math.min(255, Math.round(v / 17) * 17) : v);
const hex2 = v => v.toString(16).padStart(2, '0');
function colour(r, g, b) {
  const h = hex2(r) + hex2(g) + hex2(b);
  return h[0] === h[1] && h[2] === h[3] && h[4] === h[5] ? '#' + h[0] + h[2] + h[4] : '#' + h;
}
/** A frame's pixels as stroked paths, one per colour and opacity: "M x y.5h n m dx dy h n …". */
/** A frame's opaque pixels in placement space: "x,y" → "colour|opacity". */
function pixels(name, char) {
  const f = frame(name);
  const { x: fx, y: fy, w, h } = f.frame;
  const [ox, oy] = offset(f, char);
  const c = createCanvas(w, h).getContext('2d');
  c.drawImage(f.img, fx, fy, w, h, 0, 0, w, h);
  const px = c.getImageData(0, 0, w, h).data;
  const out = new Map();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = px[i + 3];
      if (a < 8) continue;
      out.set(`${x + ox},${y + oy}`, `${colour(q(px[i]), q(px[i + 1]), q(px[i + 2]))}|${a >= 248 ? 1 : Math.round((a / 255) * 100) / 100}`);
    }
  return out;
}
/** Pixels as [offsetX, offsetY, paths]: one stroked path per colour, row runs "M x y.5h n m dx dy h n …". */
function paths(map) {
  if (map.size === 0) return [0, 0, ''];
  const pts = [...map.keys()].map(k => k.split(',').map(Number));
  const x0 = Math.min(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1]));
  const x1 = Math.max(...pts.map(p => p[0])), y1 = Math.max(...pts.map(p => p[1]));
  const runs = new Map(); // key → [x, y, n][]
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; ) {
      const key = map.get(`${x},${y}`);
      let n = 1;
      while (x + n <= x1 && map.get(`${x + n},${y}`) === key) n++;
      if (key) {
        if (!runs.has(key)) runs.set(key, []);
        runs.get(key).push([x - x0, y - y0, n]);
      }
      x += n;
    }
  let out = '';
  for (const [key, rs] of runs) {
    const [col, op] = key.split('|');
    let d = '', cx = 0, cy = 0;
    rs.forEach(([x, y, n], k) => {
      d += k === 0 ? `M${x} ${y}.5h${n}` : `m${x - cx}${y - cy < 0 ? '' : ' '}${y - cy}h${n}`;
      cx = x + n;
      cy = y;
    });
    out += `<path stroke="${col}"${op === '1' ? '' : ` stroke-opacity="${op}"`} d="${d}"/>`;
  }
  return [x0, y0, out];
}

const V = {};
for (const [name, char] of want) if (!char) V[name] = paths(pixels(name, false));
// An animation's frames share most pixels: those go once into "<anim>/c", each frame keeps the rest.
for (const [key, names] of Object.entries(anims)) {
  const maps = names.map(n => pixels(n, true));
  if (maps.length === 1) { V[names[0]] = paths(maps[0]); continue; }
  const common = new Map([...maps[0]].filter(([k, v]) => maps.every(m => m.get(k) === v)));
  V[`${key}/c`] = paths(common);
  names.forEach((n, i) => (V[n] = paths(new Map([...maps[i]].filter(([k]) => !common.has(k))))));
}
const rnd = v => Math.round(v * 1000) / 1000;
const scene = {
  x: minX, y: minY, w: maxX - minX, h: maxY - minY,
  room,
  overlays: overlays.map(o => [o.name, o.px, o.py, rnd(o.d)]),
  seats: seats.map(s => ({ px: s.px, py: s.py, d: rnd(s.d), back: s.back, ...(s.screen ? { screen: [s.screen.px, s.screen.py, rnd(s.screen.d)] } : {}) })),
};

const ts = `// Generated by tools/panel-sprites.mjs from the office atlases. Do not edit.
/* eslint-disable */
/** name → [offsetX, offsetY, paths]: the sprite as stroked pixel paths, offset from the point it is placed at. */
export const V: Record<string, readonly [number, number, string]> = ${JSON.stringify(V)}
/** Seated animations: \`<preset>/<front|back>/<anim>\` → frame names. */
export const ANIM: Record<string, readonly string[]> = ${JSON.stringify(anims)}
export type Seat = { px: number; py: number; d: number; back: boolean; screen?: readonly [number, number, number] }
/** The room in scene pixels: room is [name, x, y] behind everyone, overlays are [name, x, y, depth]; seat 0 is the director's. */
export const SCENE: { x: number; y: number; w: number; h: number; room: readonly (readonly [string, number, number])[]; overlays: readonly (readonly [string, number, number, number])[]; seats: readonly Seat[] } = ${JSON.stringify(scene)}
`;
writeFileSync(OUT, ts);
const roomNames = new Set(room.map(r => r[0]));
const roomChars = [...roomNames].reduce((n, k) => n + V[k][2].length, 0) + room.length * 30;
console.log(`${want.size} sprites · room ${room.length} placements of ${roomNames.size} ≈ ${roomChars} chars · ${overlays.length} overlays · ${seats.length} seats · sprites.ts ${ts.length} chars`);
