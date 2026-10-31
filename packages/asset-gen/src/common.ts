import { hex, Img, iso, isoBox, shade, type BoxColors, type RGBA } from './raster.js';

/** A sprite anchored at the screen position of its footprint's back corner (tile 0,0, z=0). */
export interface Obj {
  img: Img;
  ax: number;
  ay: number;
}

/** Allocates an image big enough for a w×d footprint of height h and returns the anchor. */
export function obj(w: number, d: number, h: number, draw: (img: Img, ox: number, oy: number) => void, pad = 3): Obj {
  const W = Math.ceil((w + d) * 16) + pad * 2;
  const H = Math.ceil((w + d) * 8) + h + pad * 2;
  const img = new Img(W, H);
  const ox = Math.ceil(d * 16) + pad;
  const oy = h + pad;
  draw(img, ox, oy);
  return { img, ax: ox, ay: oy };
}

export const box = (top: string | RGBA, left?: string | RGBA, right?: string | RGBA): BoxColors => {
  const t = typeof top === 'string' ? hex(top) : top;
  return {
    top: t,
    left: left ? (typeof left === 'string' ? hex(left) : left) : shade(t, -0.18),
    right: right ? (typeof right === 'string' ? hex(right) : right) : shade(t, -0.36),
  };
};

/** Box helper with tile-unit footprint and pixel heights. */
export function B(img: Img, ox: number, oy: number, x: number, y: number, w: number, d: number, z: number, h: number, c: BoxColors | string, opts?: Parameters<typeof isoBox>[10]) {
  isoBox(img, ox, oy, x, y, w, d, z, h, typeof c === 'string' ? box(c) : c, opts);
}

/** Fills a parallelogram lying in the x–z plane (a face looking towards +y) — for screens, posters, windows. */
export function faceY(img: Img, ox: number, oy: number, x0: number, x1: number, y: number, z0: number, z1: number, c: RGBA | ((px: number, py: number, u: number, v: number) => RGBA | undefined)) {
  const p = (x: number, z: number) => iso(ox, oy, x, y, z);
  const a = p(x0, z1);
  const b = p(x1, z1);
  const cc = p(x1, z0);
  const d = p(x0, z0);
  img.poly([a, b, cc, d], (px, py) => {
    if (typeof c !== 'function') return c;
    // inverse map to (u along x, v down z) in 0..1
    const u = (px + 0.5 - a[0]) / (b[0] - a[0] || 1);
    const yTop = a[1] + (b[1] - a[1]) * u;
    const v = (py + 0.5 - yTop) / (d[1] - a[1] || 1);
    return c(px, py, Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v)));
  });
}

/** Same for a face lying in the y–z plane (looking towards +x). */
export function faceX(img: Img, ox: number, oy: number, x: number, y0: number, y1: number, z0: number, z1: number, c: RGBA | ((px: number, py: number, u: number, v: number) => RGBA | undefined)) {
  const p = (y: number, z: number) => iso(ox, oy, x, y, z);
  const a = p(y0, z1);
  const b = p(y1, z1);
  const cc = p(y1, z0);
  const d = p(y0, z0);
  img.poly([a, b, cc, d], (px, py) => {
    if (typeof c !== 'function') return c;
    const u = (px + 0.5 - a[0]) / (b[0] - a[0] || 1);
    const yTop = a[1] + (b[1] - a[1]) * u;
    const v = (py + 0.5 - yTop) / (d[1] - a[1] || 1);
    return c(px, py, Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v)));
  });
}

/** Seeded PRNG for deterministic decoration placement. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The warm "lamp-lit" palette shared by every asset. */
export const PAL = {
  ink: hex('#2a1a2e'),
  oak: hex('#d39d63'),
  oakDark: hex('#a8703f'),
  walnut: hex('#7a4b33'),
  cream: hex('#efe4d2'),
  wall: hex('#e9dcc6'),
  wallShade: hex('#cdb99c'),
  trim: hex('#8a634a'),
  metal: hex('#8d90a6'),
  metalDark: hex('#5b5d72'),
  screenOff: hex('#1d2033'),
  leaf: hex('#5f9e57'),
  leafDark: hex('#3c7346'),
  leafLight: hex('#93c76b'),
  pot: hex('#c86f4e'),
  teal: hex('#4f8f8c'),
  mustard: hex('#d9a441'),
  terracotta: hex('#c96a4a'),
  plum: hex('#7e5a8c'),
  glass: hex('#a8d6e8', 90),
  white: hex('#fbf6ee'),
};
