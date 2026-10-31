/** Tiny RGBA raster with pixel-exact primitives. Everything is deterministic (no Math.random). */

export type RGBA = readonly [number, number, number, number];

export function hex(h: string, a = 255): RGBA {
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

export function withAlpha(c: RGBA, a: number): RGBA {
  return [c[0], c[1], c[2], Math.round(a)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h /= 6;
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

function lerpHue(a: number, b: number, t: number) {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return a + d * t;
}

/**
 * Hue-shifted shading: k<0 darkens towards violet-blue (coloured shadows),
 * k>0 lightens towards warm yellow. |k| in 0..1.
 */
export function shade(c: RGBA, k: number): RGBA {
  const [h, s, l] = rgbToHsl(c[0], c[1], c[2]);
  let nh = h;
  let ns = s;
  let nl = l;
  if (k < 0) {
    const t = -k;
    nh = lerpHue(h, 255, t * 0.35);
    ns = Math.min(1, s * (1 + t * 0.15) + t * 0.05);
    nl = l * (1 - t * 0.62);
  } else if (k > 0) {
    const t = k;
    nh = lerpHue(h, 48, t * 0.25);
    ns = s * (1 - t * 0.12);
    nl = l + (1 - l) * t * 0.55;
  }
  const [r, g, b] = hslToRgb(nh, ns, nl);
  return [Math.round(r), Math.round(g), Math.round(b), c[3]];
}

export function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round(a[3] + (b[3] - a[3]) * t),
  ];
}

/** Integer hash → [0,1) for per-pixel deterministic texture noise. */
export function noise2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) % 100000) / 100000;
}

export class Img {
  readonly data: Uint8ClampedArray;
  /** Optional clip predicate; pixels where it returns false are left untouched. */
  clip: ((x: number, y: number) => boolean) | undefined;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  get(x: number, y: number): RGBA {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i]!, this.data[i + 1]!, this.data[i + 2]!, this.data[i + 3]!];
  }

  alphaAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3]!;
  }

  /** Source-over blend of one pixel. */
  px(x: number, y: number, c: RGBA, alpha = 1): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (this.clip && !this.clip(x, y)) return;
    const a = (c[3] / 255) * alpha;
    if (a <= 0) return;
    const i = (y * this.w + x) * 4;
    const da = this.data[i + 3]! / 255;
    const oa = a + da * (1 - a);
    if (oa <= 0) return;
    for (let k = 0; k < 3; k++) this.data[i + k] = (c[k]! * a + this.data[i + k]! * da * (1 - a)) / oa;
    this.data[i + 3] = oa * 255;
  }

  /** Overwrite (no blending). */
  set(x: number, y: number, c: RGBA): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = c[3];
  }

  erase(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[(y * this.w + x) * 4 + 3] = 0;
  }

  rect(x: number, y: number, w: number, h: number, c: RGBA, alpha = 1): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c, alpha);
  }

  /** Rounded rectangle: corners cut by `r` pixels (pixel-art style). */
  rrect(x: number, y: number, w: number, h: number, r: number, c: RGBA, alpha = 1): void {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const dx = i < r ? r - i : i >= w - r ? i - (w - r - 1) : 0;
        const dy = j < r ? r - j : j >= h - r ? j - (h - r - 1) : 0;
        if (dx * dx + dy * dy > r * r + 0.5 && dx > 0 && dy > 0) continue;
        this.px(x + i, y + j, c, alpha);
      }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGBA, alpha = 1): void {
    const x0 = Math.floor(cx - rx - 1);
    const x1 = Math.ceil(cx + rx + 1);
    const y0 = Math.floor(cy - ry - 1);
    const y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c, alpha);
      }
  }

  /** Soft radial blob: alpha falls off smoothly; used for glows and contact shadows. */
  blob(cx: number, cy: number, rx: number, ry: number, c: RGBA, alpha = 1, power = 1.6): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1) this.px(x, y, c, alpha * Math.pow(1 - d, power));
      }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGBA, alpha = 1): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c, alpha);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Scanline polygon fill with pixel-centre sampling; `fill(x,y)` may return a per-pixel colour. */
  poly(pts: [number, number][], c: RGBA | ((x: number, y: number) => RGBA | undefined), alpha = 1): void {
    if (pts.length < 3) return;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const sy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]!;
        const b = pts[(i + 1) % pts.length]!;
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + ((sy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]!); x < Math.round(xs[k + 1]!); x++) {
          const col = typeof c === 'function' ? c(x, y) : c;
          if (col) this.px(x, y, col, alpha);
        }
      }
    }
  }

  blit(src: Img, dx: number, dy: number, opts: { flipX?: boolean; alpha?: number } = {}): void {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.get(opts.flipX ? src.w - 1 - x : x, y);
        if (c[3]) this.px(dx + x, dy + y, c, opts.alpha ?? 1);
      }
  }

  /** Selective outline: transparent pixels touching opaque ones get the neighbour mixed towards a deep plum. */
  outline(darken = 0.55, minAlpha = 140, diagonal = false, ink: RGBA = [42, 26, 46, 255]): void {
    const add: [number, number, RGBA][] = [];
    const dirs = diagonal ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.alphaAt(x, y) > 10) continue;
        for (const [dx, dy] of dirs) {
          const n = this.get(x + dx!, y + dy!);
          if (n[3] >= minAlpha) {
            add.push([x, y, mix([n[0], n[1], n[2], 255], ink, darken)]);
            break;
          }
        }
      }
    for (const [x, y, c] of add) this.set(x, y, c);
  }

  /** Inner rim darkening on the lower/right silhouette edge (soft volume without black lines). */
  rimShade(k = 0.25): void {
    const changes: [number, number, RGBA][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c[3] < 200) continue;
        if (this.alphaAt(x + 1, y) < 40 || this.alphaAt(x, y + 1) < 40) changes.push([x, y, shade(c, -k)]);
        else if (this.alphaAt(x - 1, y) < 40 || this.alphaAt(x, y - 1) < 40) changes.push([x, y, shade(c, k * 0.6)]);
      }
    for (const [x, y, c] of changes) this.set(x, y, c);
  }

  /** Bounding box of non-transparent pixels, or undefined when empty. */
  bounds(): { x: number; y: number; w: number; h: number } | undefined {
    let x0 = this.w;
    let y0 = this.h;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (this.data[(y * this.w + x) * 4 + 3]! > 0) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    return x1 < 0 ? undefined : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  crop(x: number, y: number, w: number, h: number): Img {
    const o = new Img(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) o.set(i, j, this.get(x + i, y + j));
    return o;
  }
}

/** Isometric projection used by every asset: tile = 32×16 art pixels, z is pixels up. */
export const TILE_W = 32;
export const TILE_H = 16;
export function iso(ox: number, oy: number, tx: number, ty: number, z = 0): [number, number] {
  return [ox + (tx - ty) * (TILE_W / 2), oy + (tx + ty) * (TILE_H / 2) - z];
}

export interface BoxColors {
  top: RGBA;
  left: RGBA;
  right: RGBA;
}

/** Solid iso box with soft vertical gradient, rim highlight and bottom AO. */
export function isoBox(
  img: Img,
  ox: number,
  oy: number,
  x: number,
  y: number,
  w: number,
  d: number,
  z: number,
  h: number,
  col: BoxColors,
  opts: { texture?: (x: number, y: number, face: 'top' | 'left' | 'right') => number; ao?: boolean; rim?: boolean } = {},
): void {
  const P = (tx: number, ty: number, tz: number) => iso(ox, oy, tx, ty, tz);
  const tex = opts.texture;
  const grad = (c: RGBA, face: 'top' | 'left' | 'right', zTop: number, zBot: number) => (px: number, py: number) => {
    let k = 0;
    if (face !== 'top' && zTop !== zBot) {
      // lighter near the top edge of side faces
      const [, yt] = P(x, y + d, zTop);
      const [, yb] = P(x, y + d, zBot);
      const t = Math.max(0, Math.min(1, (py - yt) / Math.max(1, yb - yt)));
      k = 0.08 * (1 - t) - (opts.ao !== false && t > 0.82 ? 0.18 * ((t - 0.82) / 0.18) : 0);
    }
    if (tex) k += tex(px, py, face);
    return k === 0 ? c : shade(c, k);
  };
  const top: [number, number][] = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const left: [number, number][] = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const right: [number, number][] = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
  if (h > 0) {
    img.poly(left, grad(col.left, 'left', z + h, z));
    img.poly(right, grad(col.right, 'right', z + h, z));
  }
  img.poly(top, grad(col.top, 'top', 0, 0));
  if (opts.rim !== false) {
    const hi = shade(col.top, 0.35);
    const [ax, ay] = P(x, y + d, z + h);
    const [bx, by] = P(x + w, y + d, z + h);
    const [cx, cy] = P(x + w, y, z + h);
    img.line(ax, ay - 1, bx, by - 1, hi, 0.7);
    img.line(bx, by - 1, cx, cy - 1, hi, 0.55);
    if (h > 2) {
      const [ex, ey] = P(x + w, y + d, z);
      img.line(bx, by, ex, ey - 1, shade(col.left, 0.25), 0.6);
    }
  }
}

/** Flat iso diamond (floor tile) filled with a colour function. */
export function isoDiamond(img: Img, ox: number, oy: number, x: number, y: number, w: number, d: number, fill: RGBA | ((x: number, y: number) => RGBA | undefined), z = 0) {
  img.poly([iso(ox, oy, x, y, z), iso(ox, oy, x + w, y, z), iso(ox, oy, x + w, y + d, z), iso(ox, oy, x, y + d, z)], fill);
}
