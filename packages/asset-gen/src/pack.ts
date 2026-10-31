import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import type { Img } from './raster.js';

export interface SpriteIn {
  name: string;
  img: Img;
  /** Anchor in untrimmed image pixels (e.g. feet / footprint origin). */
  ax: number;
  ay: number;
}

interface Placed extends SpriteIn {
  x: number;
  y: number;
  tx: number;
  ty: number;
  tw: number;
  th: number;
}

export class Sheet {
  private sprites: SpriteIn[] = [];
  private anims: Record<string, string[]> = {};
  private meta: Record<string, unknown> = {};
  constructor(readonly name: string) {}

  add(name: string, img: Img, ax = 0, ay = 0): void {
    if (this.sprites.some((s) => s.name === name)) throw new Error('duplicate sprite ' + name);
    this.sprites.push({ name, img, ax, ay });
  }

  anim(name: string, frames: string[]): void {
    this.anims[name] = frames;
  }

  setMeta(key: string, value: unknown): void {
    this.meta[key] = value;
  }

  get size(): number {
    return this.sprites.length;
  }

  /** Shelf-packs trimmed sprites and writes `<name>.png` + `<name>.json` (Pixi spritesheet format). */
  write(outDir: string, maxW = 2048): { w: number; h: number; count: number } {
    const pad = 2;
    const items: Placed[] = this.sprites.map((s) => {
      const b = s.img.bounds() ?? { x: 0, y: 0, w: 1, h: 1 };
      return { ...s, x: 0, y: 0, tx: b.x, ty: b.y, tw: b.w, th: b.h };
    });
    const order = [...items].sort((a, b) => b.th - a.th || b.tw - a.tw || a.name.localeCompare(b.name));
    let x = pad;
    let y = pad;
    let rowH = 0;
    let usedW = 0;
    for (const it of order) {
      if (x + it.tw + pad > maxW) {
        x = pad;
        y += rowH + pad;
        rowH = 0;
      }
      it.x = x;
      it.y = y;
      x += it.tw + pad;
      rowH = Math.max(rowH, it.th);
      usedW = Math.max(usedW, x);
    }
    const H = y + rowH + pad;
    const W = usedW;
    const pot = (n: number) => 2 ** Math.ceil(Math.log2(Math.max(16, n)));
    const cw = pot(W);
    const ch = pot(H);
    const canvas = createCanvas(cw, ch);
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(cw, ch);
    for (const it of items) {
      for (let j = 0; j < it.th; j++)
        for (let i = 0; i < it.tw; i++) {
          const c = it.img.get(it.tx + i, it.ty + j);
          const o = ((it.y + j) * cw + it.x + i) * 4;
          image.data[o] = c[0];
          image.data[o + 1] = c[1];
          image.data[o + 2] = c[2];
          image.data[o + 3] = c[3];
        }
    }
    ctx.putImageData(image, 0, 0);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, this.name + '.png'), canvas.toBuffer('image/png'));
    const frames: Record<string, unknown> = {};
    for (const it of items.sort((a, b) => a.name.localeCompare(b.name))) {
      frames[it.name] = {
        frame: { x: it.x, y: it.y, w: it.tw, h: it.th },
        rotated: false,
        trimmed: it.tw !== it.img.w || it.th !== it.img.h,
        spriteSourceSize: { x: it.tx, y: it.ty, w: it.tw, h: it.th },
        sourceSize: { w: it.img.w, h: it.img.h },
        anchor: { x: it.ax / it.img.w, y: it.ay / it.img.h },
      };
    }
    const json = { frames, animations: this.anims, meta: { app: 'agent-office asset-gen', image: this.name + '.png', format: 'RGBA8888', size: { w: cw, h: ch }, scale: '1', ...this.meta } };
    fs.writeFileSync(path.join(outDir, this.name + '.json'), JSON.stringify(json));
    return { w: cw, h: ch, count: items.length };
  }
}

/** Writes a single image as PNG (for big parallax layers that don't belong in an atlas). */
export function writePng(file: string, img: Img): void {
  const canvas = createCanvas(img.w, img.h);
  const ctx = canvas.getContext('2d');
  const id = ctx.createImageData(img.w, img.h);
  id.data.set(img.data);
  ctx.putImageData(id, 0, 0);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, canvas.toBuffer('image/png'));
}

/** Contact sheet for eyeballing assets: sprites on a checker background, scaled up. */
export function preview(file: string, imgs: { img: Img; label?: string }[], scale = 4, cols = 12, bg = '#2a2233'): void {
  const cellW = Math.max(...imgs.map((i) => i.img.w)) + 4;
  const cellH = Math.max(...imgs.map((i) => i.img.h)) + 4;
  const rows = Math.ceil(imgs.length / cols);
  const canvas = createCanvas(cellW * Math.min(cols, imgs.length) * scale, cellH * rows * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  imgs.forEach(({ img }, k) => {
    const c = createCanvas(img.w, img.h);
    const cx = c.getContext('2d');
    const id = cx.createImageData(img.w, img.h);
    id.data.set(img.data);
    cx.putImageData(id, 0, 0);
    const x = (k % cols) * cellW + 2;
    const y = Math.floor(k / cols) * cellH + 2;
    ctx.drawImage(c, x * scale, y * scale, img.w * scale, img.h * scale);
  });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, canvas.toBuffer('image/png'));
}
