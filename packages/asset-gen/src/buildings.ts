/** Tower parts for project buildings, decorative Moscow-City-style glass towers and skyline layers. */
import { B, box, faceX, faceY, obj, rng, type Obj } from './common.js';
import { drawText, textWidth } from './font.js';
import { hex, Img, iso, mix, noise2, shade, type RGBA } from './raster.js';
import type { Named } from './furniture.js';

/** Office floor footprint in tiles and storey height in px (shared with the web renderer via the manifest). */
export const FLOOR_W = 20;
export const FLOOR_D = 16;
export const STOREY_H = 66;
export const SLAB_H = 8;
export const LOBBY_H = 52;

const mullion = hex('#4d4a5e');
const glassDay = (u: number, v: number, tint: RGBA, seed: number): RGBA => {
  const refl = Math.abs(((u * 2.2 + v * 0.9 + seed * 0.13) % 1) - 0.5) < 0.06;
  const base = mix(shade(tint, 0.25), shade(tint, -0.25), v * 0.8 + noise2(Math.floor(u * 40), Math.floor(v * 6), seed) * 0.15);
  return refl ? shade(base, 0.35) : base;
};

function glassFaceY(img: Img, ox: number, oy: number, x0: number, x1: number, y: number, z0: number, z1: number, tint: RGBA, cols: number, rows: number, seed: number, alpha = 255) {
  faceY(img, ox, oy, x0, x1, y, z0, z1, (_x, _y, u, v) => {
    if ((u * cols) % 1 < 0.06 || (v * rows) % 1 < 0.08) return mullion;
    const c = glassDay(u, v, tint, seed);
    return [c[0], c[1], c[2], alpha];
  });
}
function glassFaceX(img: Img, ox: number, oy: number, x: number, y0: number, y1: number, z0: number, z1: number, tint: RGBA, cols: number, rows: number, seed: number, alpha = 255) {
  faceX(img, ox, oy, x, y0, y1, z0, z1, (_x, _y, u, v) => {
    if ((u * cols) % 1 < 0.06 || (v * rows) % 1 < 0.08) return shade(mullion, -0.15);
    const c = shade(glassDay(u, v, tint, seed + 3), -0.18);
    return [c[0], c[1], c[2], alpha];
  });
}

export function towerParts(): Named[] {
  const out: Named[] = [];
  const W = FLOOR_W;
  const D = FLOOR_D;
  const tint = hex('#7fa6c4');
  out.push(['tower_slab', obj(W, D, SLAB_H + 2, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, W, D, 0, SLAB_H, box('#b9b2b8', '#a49ca6', '#8a8290'), { texture: (px, py, f) => (f === 'top' ? 0 : (noise2(px, py, 5) - 0.5) * 0.04) });
    // a thin warm light strip along the slab edge
    faceY(img, ox, oy, 0, W, D, SLAB_H - 2, SLAB_H - 1, hex('#e8d9c0'));
    faceX(img, ox, oy, W, 0, D, SLAB_H - 2, SLAB_H - 1, hex('#d8c6aa'));
  })]);
  // Closed storey: full glass curtain wall on both visible faces.
  out.push(['tower_facade', obj(W, D, STOREY_H, (img, ox, oy) => {
    glassFaceY(img, ox, oy, 0, W, D, 0, STOREY_H - SLAB_H, tint, W, 2, 1);
    glassFaceX(img, ox, oy, W, 0, D, 0, STOREY_H - SLAB_H, tint, D, 2, 2);
  })]);
  // Night overlay: warm lit panes with a few dark ones, plus silhouettes.
  out.push(['tower_facade_lit', obj(W, D, STOREY_H, (img, ox, oy) => {
    const lit = (u: number, v: number, cols: number, seed: number): RGBA | undefined => {
      if ((u * cols) % 1 < 0.06 || (v * 2) % 1 < 0.08) return undefined;
      const cell = Math.floor(u * cols);
      if (noise2(cell, Math.floor(v * 2), seed) < 0.18) return undefined;
      const warm = noise2(cell, 1, seed + 1) > 0.3 ? hex('#ffd59a') : hex('#cfe6ff');
      const person = noise2(cell, 2, seed + 2) > 0.7 && v > 0.55 && Math.abs(((u * cols) % 1) - 0.5) < 0.12;
      return person ? hex('#6b4f5a', 230) : withA(warm, 200);
    };
    faceY(img, ox, oy, 0, W, D, 0, STOREY_H - SLAB_H, (_x, _y, u, v) => lit(u, v, W, 11));
    faceX(img, ox, oy, W, 0, D, 0, STOREY_H - SLAB_H, (_x, _y, u, v) => lit(u, v, D, 12));
  })]);
  // Open storey front glass (very translucent, fades with zoom in the renderer).
  out.push(['tower_glass_front', obj(W, D, STOREY_H, (img, ox, oy) => {
    glassFaceY(img, ox, oy, 0, W, D, 0, STOREY_H - SLAB_H, tint, W, 2, 1, 120);
    glassFaceX(img, ox, oy, W, 0, D, 0, STOREY_H - SLAB_H, tint, D, 2, 2, 120);
  })]);
  out.push(['tower_lobby', obj(W, D, LOBBY_H + 30, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, W, D, 0, 4, box('#8d8086'));
    glassFaceY(img, ox, oy, 0, W, D, 4, LOBBY_H, hex('#d9c7a6'), W / 2, 1, 4);
    glassFaceX(img, ox, oy, W, 0, D, 4, LOBBY_H, hex('#d9c7a6'), D / 2, 1, 5);
    // revolving entrance on the +x face
    faceX(img, ox, oy, W + 0.01, D / 2 - 1.2, D / 2 + 1.2, 4, 34, (_x, _y, u, v) => (u < 0.06 || u > 0.94 || v < 0.05 ? hex('#3a3346') : Math.abs(u - 0.5) < 0.03 ? hex('#3a3346') : hex('#ffe2b0', 200)));
    B(img, ox, oy, W, D / 2 - 1.6, 0.5, 3.2, 36, 3, box('#3a3346'));
    // illuminated name sign over the entrance
    const t = new Img(textWidth('AGENT OFFICE') + 4, 9);
    t.rect(0, 0, t.w, t.h, hex('#2a2235'));
    drawText(t, 2, 2, 'AGENT OFFICE', hex('#ffd59a'));
    faceY(img, ox, oy, 4, 14, D + 0.01, LOBBY_H - 14, LOBBY_H - 4, (_x, _y, u, v) => t.get(Math.min(t.w - 1, Math.floor(u * t.w)), Math.min(t.h - 1, Math.floor(v * t.h))));
  })]);
  out.push(['tower_roof', obj(W, D, 150, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, W, D, 0, 6, box('#8a8290', '#7a7280', '#635b6a'));
    B(img, ox, oy, 0.4, 0.4, W - 0.8, D - 0.8, 6, 1, box('#6f6876'), { rim: false });
    // parapet
    B(img, ox, oy, 0, 0, W, 0.3, 6, 6, box('#a49ca6'));
    B(img, ox, oy, 0, 0, 0.3, D, 6, 6, box('#a49ca6'));
    B(img, ox, oy, 0, D - 0.3, W, 0.3, 6, 6, box('#b9b2b8'));
    B(img, ox, oy, W - 0.3, 0, 0.3, D, 6, 6, box('#b9b2b8'));
    // HVAC units, helipad, spire with beacon
    B(img, ox, oy, 2, 2, 3, 2, 7, 10, box('#c4bfc8'));
    B(img, ox, oy, 6, 2, 2, 2, 7, 14, box('#a9a4ae'));
    const [hx, hy] = iso(ox, oy, 11.5, 8, 7);
    img.ellipse(hx, hy, 34, 17, hex('#55505e'));
    img.ellipse(hx, hy, 30, 15, hex('#6b6676'));
    drawText(img, hx - 2, hy - 5, 'H', hex('#f2e6c9'), 2);
    const [sx, sy] = iso(ox, oy, 4, 10, 7);
    img.rect(sx, sy - 120, 2, 120, hex('#c4bfc8'));
    img.rect(sx + 1, sy - 120, 1, 120, hex('#8a8290'));
    img.rect(sx - 1, sy - 124, 4, 4, hex('#ff5a5a'));
  })]);
  return out;
}

function withA(c: RGBA, a: number): RGBA {
  return [c[0], c[1], c[2], a];
}

/** Decorative tower: stacked iso boxes with curtain walls. Returns the day image and a night-windows overlay. */
function decorTower(kind: number): { day: Obj; night: Obj } {
  const r = rng(300 + kind);
  const tint = [hex('#7fa6c4'), hex('#8fb3b0'), hex('#a39ab8'), hex('#7d93b8'), hex('#9cb7c9')][kind % 5]!;
  type Seg = { x: number; y: number; w: number; d: number; z: number; h: number };
  const segs: Seg[] = [];
  const W = 9;
  const D = 9;
  let H = 0;
  if (kind === 0) {
    // stepped crown with spire
    segs.push({ x: 0, y: 0, w: W, d: D, z: 0, h: 260 }, { x: 1, y: 1, w: W - 2, d: D - 2, z: 260, h: 50 }, { x: 2.5, y: 2.5, w: W - 5, d: D - 5, z: 310, h: 34 });
    H = 344;
  } else if (kind === 1) {
    // "twisting" tower: segments shifted step by step
    for (let i = 0; i < 9; i++) {
      const s = Math.sin(i * 0.7) * 0.8;
      segs.push({ x: 0.8 + s, y: 0.8 - s, w: W - 1.6, d: D - 1.6, z: i * 40, h: 40 });
    }
    H = 360;
  } else if (kind === 2) {
    // slab tower with slanted roof
    segs.push({ x: 0, y: 1.5, w: W, d: D - 3, z: 0, h: 300 });
    H = 330;
  } else if (kind === 3) {
    // twin towers with a sky bridge
    segs.push({ x: 0, y: 0, w: 4, d: D, z: 0, h: 240 }, { x: 5, y: 0, w: 4, d: D, z: 0, h: 280 }, { x: 4, y: 3, w: 1, d: 3, z: 170, h: 14 });
    H = 280;
  } else {
    // round-ish tower: chamfered corners via inset stacks
    segs.push({ x: 1, y: 0, w: W - 2, d: D, z: 0, h: 220 }, { x: 0, y: 1, w: W, d: D - 2, z: 0, h: 220 }, { x: 1.5, y: 1.5, w: W - 3, d: D - 3, z: 220, h: 40 });
    H = 260;
  }
  const draw = (night: boolean) =>
    obj(W, D, H + 40, (img, ox, oy) => {
      // render back-to-front: sort by depth of segment front corner
      for (const s of [...segs].sort((a, b) => a.z - b.z || a.x + a.w + a.y + a.d - (b.x + b.w + b.y + b.d))) {
        if (!night) {
          B(img, ox, oy, s.x, s.y, s.w, s.d, s.z, s.h, box(shade(tint, 0.2), tint, shade(tint, -0.25)), { rim: true, ao: false });
          const rows = Math.max(1, Math.round(s.h / 10));
          glassFaceY(img, ox, oy, s.x, s.x + s.w, s.y + s.d, s.z, s.z + s.h, tint, Math.round(s.w * 1.5), rows, kind * 7 + s.z);
          glassFaceX(img, ox, oy, s.x + s.w, s.y, s.y + s.d, s.z, s.z + s.h, tint, Math.round(s.d * 1.5), rows, kind * 9 + s.z);
        } else {
          const rows = Math.max(1, Math.round(s.h / 10));
          const lit = (u: number, v: number, cols: number, seed: number): RGBA | undefined => {
            if ((u * cols) % 1 < 0.12 || (v * rows) % 1 < 0.2) return undefined;
            const n = noise2(Math.floor(u * cols), Math.floor(v * rows), seed);
            if (n > 0.42) return undefined;
            return n < 0.06 ? hex('#cfe6ff', 220) : hex('#ffd59a', n < 0.25 ? 230 : 150);
          };
          faceY(img, ox, oy, s.x, s.x + s.w, s.y + s.d, s.z, s.z + s.h, (_x, _y, u, v) => lit(u, v, Math.round(s.w * 1.5), kind * 13 + s.z));
          faceX(img, ox, oy, s.x + s.w, s.y, s.y + s.d, s.z, s.z + s.h, (_x, _y, u, v) => lit(u, v, Math.round(s.d * 1.5), kind * 17 + s.z));
        }
      }
      if (kind === 0) {
        const [x, y] = iso(ox, oy, W / 2, D / 2, 344);
        if (!night) {
          img.rect(x, y - 36, 2, 36, hex('#d6d3dc'));
          img.rect(x - 1, y - 38, 4, 3, hex('#ff5a5a'));
        } else img.rect(x - 1, y - 38, 4, 3, hex('#ff5a5a'));
      }
      if (kind === 2 && !night) {
        img.poly([iso(ox, oy, 0, 1.5, 300), iso(ox, oy, W, 1.5, 330), iso(ox, oy, W, D - 1.5, 330), iso(ox, oy, 0, D - 1.5, 300)], shade(tint, 0.3));
      }
      if (!night) for (let i = 0; i < 6; i++) img.px(...iso(ox, oy, r() * W, r() * D, 0), shade(tint, -0.3));
    });
  return { day: draw(false), night: draw(true) };
}

export function decorTowers(): Named[] {
  const out: Named[] = [];
  for (let k = 0; k < 5; k++) {
    const t = decorTower(k);
    out.push([`dtower_${k}`, t.day], [`dtower_${k}_night`, t.night]);
  }
  return out;
}

/** Wide, horizontally tileable skyline layers (not isometric). Day silhouettes + night window overlays. */
export function skyline(): { name: string; img: Img }[] {
  const out: { name: string; img: Img }[] = [];
  const W = 1536;
  const layer = (seed: number, H: number, base: RGBA, minH: number, maxH: number, density: number, landmarks: boolean) => {
    const day = new Img(W, H);
    const night = new Img(W, H);
    const r = rng(seed);
    let x = 0;
    while (x < W) {
      const w = 26 + Math.floor(r() * 46);
      const h = minH + Math.floor(r() * (maxH - minH));
      const c = shade(base, (r() - 0.5) * 0.12);
      const top = H - h;
      day.rect(x, top, w, h, c);
      day.rect(x + w - Math.max(3, Math.floor(w * 0.3)), top, Math.max(3, Math.floor(w * 0.3)), h, shade(c, -0.12));
      if (r() < 0.3) day.rect(x + 4, top - 8, w - 8, 8, c);
      if (r() < 0.2) day.rect(x + Math.floor(w / 2), top - 20, 2, 20, c);
      for (let wy = top + 4; wy < H - 4; wy += 6)
        for (let wx = x + 3; wx < x + w - 3; wx += 4) {
          if (noise2(wx, wy, seed) < density) night.rect(wx, wy, 2, 3, noise2(wx, wy, seed + 1) > 0.15 ? hex('#ffd59a', 210) : hex('#cfe6ff', 200));
          else if (noise2(wx, wy, seed + 9) > 0.6) day.rect(wx, wy, 2, 3, shade(c, 0.08));
        }
      x += w + Math.floor(r() * 6);
    }
    if (landmarks) {
      // a TV tower (generic needle), a stepped high-rise with a spire, and a bridge arc
      const tx = 380;
      const g = shade(base, -0.05);
      day.poly([[tx - 10, H], [tx + 10, H], [tx + 2, H - 200], [tx - 2, H - 200]], g);
      day.ellipse(tx, H - 150, 8, 5, g);
      day.rect(tx - 1, H - 250, 2, 50, g);
      night.rect(tx - 1, H - 252, 2, 3, hex('#ff5a5a', 255));
      night.rect(tx - 6, H - 151, 12, 1, hex('#ffd59a', 220));
      const sx = 1040;
      for (const [w, h] of [[90, 120], [64, 160], [40, 195], [22, 215]] as [number, number][]) day.rect(sx - w / 2, H - h, w, h, g);
      day.rect(sx - 1, H - 260, 3, 45, g);
      night.rect(sx, H - 262, 2, 3, hex('#ff5a5a', 255));
      for (let i = 0; i < 40; i++) night.rect(sx - 40 + (i % 10) * 8, H - 110 + Math.floor(i / 10) * 10, 2, 3, hex('#ffd59a', 180));
      const bx = 700;
      for (let i = 0; i <= 120; i++) {
        const t = i / 120;
        const y = H - 40 - Math.sin(t * Math.PI) * 34;
        day.rect(bx + i * 2, y, 2, 3, g);
        if (i % 12 === 0) night.rect(bx + i * 2, y - 2, 2, 2, hex('#fff1c6', 230));
      }
      day.rect(bx - 10, H - 40, 260, 4, g);
    }
    return { day, night };
  };
  const far = layer(501, 300, hex('#a7a3c4'), 50, 150, 0.08, true);
  const mid = layer(502, 300, hex('#8b86ab'), 70, 230, 0.12, false);
  out.push({ name: 'sky_far', img: far.day }, { name: 'sky_far_night', img: far.night }, { name: 'sky_mid', img: mid.day }, { name: 'sky_mid_night', img: mid.night });
  // clouds
  for (let k = 0; k < 3; k++) {
    const img = new Img(120, 44);
    const r = rng(600 + k);
    for (let i = 0; i < 14; i++) img.blob(20 + r() * 80, 22 + (r() - 0.5) * 12, 14 + r() * 12, 10 + r() * 6, hex('#ffffff'), 0.9, 0.7);
    out.push({ name: `cloud_${k}`, img });
  }
  return out;
}
