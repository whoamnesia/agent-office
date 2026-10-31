/** Street furniture, vehicles, trees and animals for the Moscow City block. */
import { B, box, faceX, faceY, obj, rng, type Obj } from './common.js';
import { drawText, textWidth } from './font.js';
import { hex, Img, iso, mix, shade, type RGBA } from './raster.js';
import type { Named } from './furniture.js';

/** Maps a text bitmap onto an iso face (+y facing) with nearest sampling. */
function signY(img: Img, ox: number, oy: number, x0: number, x1: number, y: number, z0: number, z1: number, text: string, fg: RGBA, bg: RGBA) {
  const t = new Img(textWidth(text) + 4, 9);
  t.rect(0, 0, t.w, t.h, bg);
  drawText(t, 2, 2, text, fg);
  faceY(img, ox, oy, x0, x1, y, z0, z1, (_x, _y, u, v) => t.get(Math.min(t.w - 1, Math.floor(u * t.w)), Math.min(t.h - 1, Math.floor(v * t.h))));
}
function signX(img: Img, ox: number, oy: number, x: number, y0: number, y1: number, z0: number, z1: number, text: string, fg: RGBA, bg: RGBA) {
  const t = new Img(textWidth(text) + 4, 9);
  t.rect(0, 0, t.w, t.h, bg);
  drawText(t, 2, 2, text, fg);
  faceX(img, ox, oy, x, y0, y1, z0, z1, (_x, _y, u, v) => t.get(Math.min(t.w - 1, Math.floor(u * t.w)), Math.min(t.h - 1, Math.floor(v * t.h))));
}

function canopy(img: Img, cx: number, cy: number, rx: number, ry: number, base: RGBA, seed: number, count = 40) {
  const r = rng(seed);
  const dark = shade(base, -0.32);
  const light = shade(base, 0.28);
  img.ellipse(cx + 2, cy + 2, rx, ry, dark);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const x = cx + Math.cos(a) * rx * d * 0.95;
    const y = cy + Math.sin(a) * ry * d * 0.95;
    const t = (y - (cy - ry)) / (2 * ry) - (x - cx) / (rx * 4);
    img.ellipse(x, y, 3 + r() * 2.5, 2.5 + r() * 2, t < 0.38 ? light : t < 0.7 ? base : dark);
  }
}

export function trees(): Named[] {
  const out: Named[] = [];
  const kinds: [string, string, number][] = [
    ['tree_birch', '#e6b53e', 1],
    ['tree_maple', '#d8643a', 2],
    ['tree_linden', '#c8b24a', 3],
    ['tree_oak', '#b3793a', 4],
  ];
  for (const [name, col, seed] of kinds) {
    out.push([name, obj(1, 1, 76, (img, ox, oy) => {
      const [x, y] = iso(ox, oy, 0.5, 0.5, 0);
      const birch = name === 'tree_birch';
      img.rect(x - 1, y - 30, 3, 30, birch ? hex('#ece6dc') : hex('#6b4a36'));
      img.rect(x + 1, y - 30, 1, 30, birch ? hex('#bfb6a8') : hex('#4f3527'));
      if (birch) for (let k = 0; k < 5; k++) img.rect(x - 1 + (k % 2), y - 6 - k * 5, 2, 1, hex('#3a3236'));
      img.line(x, y - 22, x - 7, y - 32, hex('#5a3d2e'));
      img.line(x + 1, y - 26, x + 8, y - 36, hex('#5a3d2e'));
      canopy(img, x, y - 46, 15, 17, hex(col), seed);
      img.outline(0.5, 200);
    })]);
  }
  out.push(['tree_pine', obj(1, 1, 80, (img, ox, oy) => {
    const [x, y] = iso(ox, oy, 0.5, 0.5, 0);
    img.rect(x - 1, y - 12, 3, 12, hex('#5a3d2e'));
    for (let k = 0; k < 5; k++) {
      const w = 16 - k * 3;
      const ty = y - 12 - k * 11;
      img.poly([[x - w, ty], [x + w + 1, ty], [x + 0.5, ty - 18]], k % 2 ? hex('#3c6b4a') : hex('#335f42'));
      img.line(x - w + 2, ty - 1, x, ty - 15, hex('#5a8f5f'), 0.7);
    }
    img.outline(0.5, 200);
  })]);
  out.push(['tree_bare', obj(1, 1, 70, (img, ox, oy) => {
    const [x, y] = iso(ox, oy, 0.5, 0.5, 0);
    const br = hex('#6b4a36');
    img.rect(x - 1, y - 34, 3, 34, br);
    const r = rng(7);
    const branch = (x0: number, y0: number, a: number, len: number, depth: number) => {
      const x1 = x0 + Math.cos(a) * len;
      const y1 = y0 + Math.sin(a) * len;
      img.line(x0, y0, x1, y1, br);
      if (depth > 0) {
        branch(x1, y1, a - 0.5 - r() * 0.3, len * 0.7, depth - 1);
        branch(x1, y1, a + 0.4 + r() * 0.3, len * 0.7, depth - 1);
      }
    };
    branch(x, y - 30, -Math.PI / 2, 14, 3);
    for (let i = 0; i < 12; i++) img.px(x - 12 + r() * 24, y - 60 + r() * 24, hex('#e3a03d'));
    img.outline(0.45, 200);
  })]);
  out.push(['bush', obj(1, 1, 24, (img, ox, oy) => {
    const [x, y] = iso(ox, oy, 0.5, 0.5, 0);
    canopy(img, x, y - 7, 12, 7, hex('#6f9a4f'), 31, 30);
    img.outline(0.5, 200);
  })]);
  out.push(['bush_red', obj(1, 1, 24, (img, ox, oy) => {
    const [x, y] = iso(ox, oy, 0.5, 0.5, 0);
    canopy(img, x, y - 7, 12, 7, hex('#b8473a'), 32, 30);
    img.outline(0.5, 200);
  })]);
  return out;
}

export function streetProps(): Named[] {
  const out: Named[] = [];
  out.push(['bench', obj(2, 1, 20, (img, ox, oy) => {
    const metal = box('#3a3a48');
    for (const x of [0.2, 1.7]) B(img, ox, oy, x, 0.3, 0.1, 0.4, 0, 8, metal, { rim: false });
    B(img, ox, oy, 0.1, 0.25, 1.8, 0.5, 8, 2, box('#b8814f'));
    B(img, ox, oy, 0.1, 0.2, 1.8, 0.08, 10, 9, box('#a8703f'));
  })]);
  out.push(['bench_y', obj(1, 2, 20, (img, ox, oy) => {
    const metal = box('#3a3a48');
    for (const y of [0.2, 1.7]) B(img, ox, oy, 0.3, y, 0.4, 0.1, 0, 8, metal, { rim: false });
    B(img, ox, oy, 0.25, 0.1, 0.5, 1.8, 8, 2, box('#b8814f'));
    B(img, ox, oy, 0.2, 0.1, 0.08, 1.8, 10, 9, box('#a8703f'));
  })]);
  out.push(['lamppost', obj(0.6, 0.6, 72, (img, ox, oy) => {
    const [x, y] = iso(ox, oy, 0.3, 0.3, 0);
    img.rect(x - 2, y - 3, 5, 3, hex('#2f3040'));
    img.rect(x, y - 58, 2, 56, hex('#3a3b4c'));
    img.rect(x + 1, y - 58, 1, 56, hex('#55576b'));
    img.rect(x - 8, y - 60, 11, 2, hex('#3a3b4c'));
    img.rrect(x - 10, y - 59, 6, 4, 1, hex('#fff1c6'));
  })]);
  for (const [k, col] of [['red', '#ff4a4a'], ['yellow', '#ffc23d'], ['green', '#5dff8a']] as [string, string][]) {
    out.push([`traffic_${k}`, obj(0.5, 0.5, 52, (img, ox, oy) => {
      const [x, y] = iso(ox, oy, 0.25, 0.25, 0);
      img.rect(x, y - 36, 2, 36, hex('#3a3b4c'));
      img.rect(x - 2, y - 50, 6, 15, hex('#26283a'));
      const idx = k === 'red' ? 0 : k === 'yellow' ? 1 : 2;
      for (let i = 0; i < 3; i++) img.rect(x - 1, y - 48 + i * 4, 3, 3, i === idx ? hex(col) : hex('#3d3f52'));
    })]);
  }
  for (let f = 0; f < 3; f++) {
    out.push([`fountain_${f}`, obj(3, 3, 40, (img, ox, oy) => {
      const [x, y] = iso(ox, oy, 1.5, 1.5, 0);
      img.ellipse(x, y + 1, 34, 17, hex('#8d8086'));
      img.ellipse(x, y, 33, 16, hex('#b3a8ab'));
      img.ellipse(x, y, 29, 14, hex('#4f88a8'));
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + f * 0.35;
        img.px(x + Math.cos(a) * (12 + (i % 3) * 5), y + Math.sin(a) * (6 + (i % 3) * 2.5), hex('#bfe6f2'));
      }
      img.rect(x - 2, y - 14, 5, 14, hex('#b3a8ab'));
      img.ellipse(x + 0.5, y - 14, 7, 3, hex('#9d9296'));
      for (let i = -3; i <= 3; i++) {
        const h = 18 - Math.abs(i) * 3 + ((i + f) % 3);
        img.line(x + 0.5, y - 16, x + 0.5 + i * 3, y - 16 - h * 0.6, hex('#d9f2fa', 220));
        img.px(x + 0.5 + i * 5, y - 10 + ((f + i) % 3), hex('#e9fbff'));
      }
    })]);
  }
  out.push(['bus_stop', obj(3, 1, 40, (img, ox, oy) => {
    B(img, ox, oy, 0.1, 0.1, 0.08, 0.08, 0, 30, box('#3a3b4c'), { rim: false });
    B(img, ox, oy, 2.8, 0.1, 0.08, 0.08, 0, 30, box('#3a3b4c'), { rim: false });
    faceY(img, ox, oy, 0.15, 2.8, 0.12, 4, 28, hex('#cfe9f5', 90));
    B(img, ox, oy, 0.6, 0.3, 1.8, 0.4, 7, 2, box('#b8814f'));
    B(img, ox, oy, 0, 0, 3, 1, 30, 3, box('#2f6db0', '#285e98', '#1f4c7c'));
    signY(img, ox, oy, 2.2, 2.9, 0.2, 18, 26, 'АВТ', hex('#ffffff'), hex('#2f6db0'));
  })]);
  out.push(['cafe', obj(6, 4, 64, (img, ox, oy) => {
    const warm = hex('#ffd9a0');
    B(img, ox, oy, 0, 0, 6, 4, 0, 4, box('#8d8086'));
    B(img, ox, oy, 0.1, 0.1, 5.8, 3.8, 4, 30, box('#efe4d2', '#e9dcc6', '#cdb99c'));
    faceY(img, ox, oy, 0.3, 5.7, 3.9, 6, 30, (_x, _y, u, v) => ((u * 6) % 1 < 0.05 ? hex('#5b4e5a') : v > 0.8 ? hex('#7a4b33') : mix(warm, hex('#f2b56b'), v)));
    faceX(img, ox, oy, 5.9, 0.3, 3.7, 6, 30, (_x, _y, u, v) => ((u * 4) % 1 < 0.06 ? hex('#5b4e5a') : Math.abs(u - 0.5) < 0.12 ? hex('#7a4b33', 255) : mix(warm, hex('#e0a058'), v)));
    // striped awning
    const aw = (px: number, py: number, u: number) => (Math.floor(u * 14) % 2 ? hex('#e9e1d4') : hex('#c94f45'));
    img.poly([iso(ox, oy, 0, 4, 34), iso(ox, oy, 6, 4, 34), iso(ox, oy, 6, 4.8, 26), iso(ox, oy, 0, 4.8, 26)], (px, py) => {
      const u = (px - iso(ox, oy, 0, 4.4, 30)[0]) / (6 * 16);
      return aw(px, py, u);
    });
    B(img, ox, oy, 0, 0, 6, 4, 34, 4, box('#7a4b33'));
    signY(img, ox, oy, 1.5, 4.5, 4, 40, 50, 'КОФЕ', hex('#fff4d6'), hex('#4a2e24'));
    B(img, ox, oy, 1.5, 3.95, 3, 0.05, 39, 12, box('#4a2e24'), { rim: false });
    signY(img, ox, oy, 1.6, 4.4, 4.0, 40, 50, 'КОФЕ', hex('#fff4d6'), hex('#4a2e24'));
  })]);
  out.push(['cafe_table', obj(1, 1, 40, (img, ox, oy) => {
    B(img, ox, oy, 0.45, 0.45, 0.1, 0.1, 0, 10, box('#3a3a48'), { rim: false });
    B(img, ox, oy, 0.2, 0.2, 0.6, 0.6, 10, 2, box('#e9e1d4'));
    const [x, y] = iso(ox, oy, 0.5, 0.5, 12);
    img.rect(x, y - 22, 1, 22, hex('#5a3d2e'));
    img.poly([[x - 14, y - 18], [x + 15, y - 18], [x + 0.5, y - 28]], hex('#2f8f7a'));
    img.line(x - 14, y - 18, x + 15, y - 18, hex('#e9e1d4'));
  })]);
  out.push(['food_truck', obj(3, 1.4, 44, (img, ox, oy) => {
    for (const x of [0.4, 2.3]) {
      const [wx, wy] = iso(ox, oy, x, 1.4, 3);
      img.ellipse(wx, wy, 4, 4, hex('#24232f'));
      img.ellipse(wx, wy, 2, 2, hex('#8d90a6'));
    }
    B(img, ox, oy, 0, 0, 3, 1.4, 3, 26, box('#f2efe8', '#e3a63b', '#c98f2e'));
    faceY(img, ox, oy, 0.6, 2.2, 1.4, 12, 24, hex('#ffd9a0'));
    B(img, ox, oy, 0.5, 1.35, 1.8, 0.25, 12, 2, box('#9c6342'));
    signY(img, ox, oy, 0.4, 2.6, 1.42, 25, 31, 'ШАУРМА', hex('#fff4d6'), hex('#c94f45'));
    B(img, ox, oy, 0, 0, 3, 1.4, 29, 3, box('#c94f45'));
  })]);
  out.push(['flower_stall', obj(2, 1.2, 40, (img, ox, oy) => {
    B(img, ox, oy, 0.1, 0.1, 1.8, 1, 0, 12, box('#7a4b33'));
    const r = rng(5);
    const cols = ['#ff6f91', '#ffd34d', '#ff8f4a', '#c86fe0', '#ffffff', '#e83c4f'];
    for (let i = 0; i < 6; i++) {
      const [x, y] = iso(ox, oy, 0.3 + (i % 3) * 0.6, 0.3 + Math.floor(i / 3) * 0.5, 12);
      img.rect(x - 2, y - 4, 5, 4, hex('#5a6b8a'));
      for (let k = 0; k < 6; k++) img.ellipse(x - 2 + r() * 5, y - 6 - r() * 4, 1.5, 1.5, hex(cols[(i + k) % cols.length]!));
    }
    B(img, ox, oy, 0.05, 0.05, 0.08, 0.08, 0, 32, box('#3a3a48'), { rim: false });
    B(img, ox, oy, 1.87, 0.05, 0.08, 0.08, 0, 32, box('#3a3a48'), { rim: false });
    B(img, ox, oy, 0, 0, 2, 1.2, 32, 2, box('#4f9a7a', '#3f8a6a', '#2f6a52'));
    signY(img, ox, oy, 0.2, 1.8, 1.2, 25, 31, 'ЦВЕТЫ', hex('#ffffff'), hex('#4f9a7a'));
  })]);
  out.push(['metro', obj(3, 2, 56, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, 3, 2, 0, 4, box('#8d8086'));
    faceY(img, ox, oy, 0.4, 2.6, 1.6, 4, 26, (_x, _y, u, v) => (v > 0.25 ? mix(hex('#5b5d72'), hex('#2a2a38'), v) : hex('#9a9aa8')));
    B(img, ox, oy, 0.2, 0.2, 0.2, 1.6, 0, 28, box('#c94f45'));
    B(img, ox, oy, 2.6, 0.2, 0.2, 1.6, 0, 28, box('#c94f45'));
    B(img, ox, oy, 0, 0, 3, 2, 28, 4, box('#d65a4a', '#c94f45', '#a93f37'));
    const [x, y] = iso(ox, oy, 1.5, 1.0, 46);
    img.ellipse(x, y, 7, 7, hex('#fff4ee'));
    drawText(img, x - 3, y - 5, 'М', hex('#d8323e'), 2);
    img.rect(x, y + 7, 1, 8, hex('#3a3b4c'));
  })]);
  out.push(['trash', obj(0.5, 0.5, 16, (img, ox, oy) => {
    B(img, ox, oy, 0.1, 0.1, 0.3, 0.3, 0, 12, box('#5b6b5a'));
    B(img, ox, oy, 0.08, 0.08, 0.34, 0.34, 12, 2, box('#3f4b3e'));
  })]);
  out.push(['bike_rack', obj(2, 0.6, 22, (img, ox, oy) => {
    for (let i = 0; i < 2; i++) {
      const [x, y] = iso(ox, oy, 0.5 + i * 0.9, 0.3, 0);
      const c = i ? hex('#3f7fd0') : hex('#d8423b');
      img.ellipse(x - 5, y - 4, 4, 4, hex('#24232f'));
      img.ellipse(x - 5, y - 4, 2.5, 2.5, hex('#00000000'));
      img.ellipse(x + 5, y - 4, 4, 4, hex('#24232f'));
      img.line(x - 5, y - 4, x, y - 9, c);
      img.line(x, y - 9, x + 5, y - 4, c);
      img.line(x - 2, y - 9, x + 3, y - 9, c);
      img.rect(x + 3, y - 12, 3, 1, hex('#24232f'));
    }
  })]);
  for (const [k, c] of [['green', '#3fc070'], ['purple', '#8f5ae0']] as [string, string][]) {
    out.push([`scooter_${k}`, obj(0.8, 0.4, 20, (img, ox, oy) => {
      const [x, y] = iso(ox, oy, 0.4, 0.2, 0);
      img.ellipse(x - 5, y - 2, 2, 2, hex('#24232f'));
      img.ellipse(x + 5, y - 2, 2, 2, hex('#24232f'));
      img.rect(x - 5, y - 4, 10, 2, hex(c));
      img.line(x + 4, y - 4, x + 5, y - 16, hex('#3a3a48'));
      img.rect(x + 3, y - 17, 5, 1, hex('#3a3a48'));
    })]);
  }
  out.push(['billboard', obj(3, 0.3, 80, (img, ox, oy) => {
    const [x, y] = iso(ox, oy, 1.5, 0.15, 0);
    img.rect(x - 1, y - 46, 3, 46, hex('#3a3b4c'));
    B(img, ox, oy, 0, 0, 3, 0.2, 44, 30, box('#2a2a38'));
    faceY(img, ox, oy, 0.08, 2.92, 0.21, 46, 72, (_x, _y, u, v) => (v < 0.5 ? mix(hex('#ff8fbf'), hex('#ffd34d'), u) : Math.hypot((u - 0.75) * 2, v - 0.7) < 0.2 ? hex('#ffffff') : hex('#6b3e8a')));
    signY(img, ox, oy, 0.2, 1.6, 0.22, 52, 60, 'CITY 24/7', hex('#2a1a2e'), hex('#ffd34d'));
  })]);
  out.push(['planter', obj(2, 0.8, 22, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, 2, 0.8, 0, 10, box('#9a8f8a'));
    const [x, y] = iso(ox, oy, 1, 0.4, 10);
    canopy(img, x, y - 4, 14, 5, hex('#6f9a4f'), 41, 26);
    for (let i = 0; i < 8; i++) img.px(x - 12 + i * 3, y - 5 + (i % 2) * 2, hex(i % 2 ? '#ff8f4a' : '#ffd34d'));
  })]);
  out.push(['hydrant', obj(0.4, 0.4, 14, (img, ox, oy) => {
    B(img, ox, oy, 0.1, 0.1, 0.2, 0.2, 0, 9, box('#d8423b'));
    B(img, ox, oy, 0.05, 0.05, 0.3, 0.3, 9, 2, box('#b5332d'));
  })]);
  out.push(['bollard', obj(0.3, 0.3, 12, (img, ox, oy) => B(img, ox, oy, 0.08, 0.08, 0.14, 0.14, 0, 9, box('#3a3b4c')))]);
  // seasonal
  for (const [k, s] of [['pumpkin', 1], ['pumpkin_big', 1.5]] as [string, number][]) {
    out.push([k, obj(0.6 * s, 0.6 * s, 14 * s, (img, ox, oy) => {
      const [x, y] = iso(ox, oy, 0.3 * s, 0.3 * s, 0);
      for (let i = -1; i <= 1; i++) img.ellipse(x + i * 2.4 * s, y - 4 * s, 3.4 * s, 4 * s, i === 0 ? hex('#f08a2a') : hex('#d8701e'));
      img.rect(x, y - 9 * s, 2, 2 * s, hex('#5a7a3a'));
      img.outline(0.5, 200);
    })]);
  }
  out.push(['jack_o_lantern', obj(0.7, 0.7, 16, (img, ox, oy) => {
    const [x, y] = iso(ox, oy, 0.35, 0.35, 0);
    for (let i = -1; i <= 1; i++) img.ellipse(x + i * 3, y - 5, 4, 5, i === 0 ? hex('#f08a2a') : hex('#d8701e'));
    img.rect(x - 4, y - 7, 2, 2, hex('#ffe08a'));
    img.rect(x + 2, y - 7, 2, 2, hex('#ffe08a'));
    img.rect(x - 3, y - 4, 7, 1, hex('#ffe08a'));
    img.rect(x, y - 11, 2, 2, hex('#5a7a3a'));
    img.outline(0.5, 200);
  })]);
  return out;
}

/** Vehicles: `_x` drives along world x (SE/NW), `_y` along world y (SW/NE). `p`/`n` = positive/negative direction. */
export function vehicles(): Named[] {
  const out: Named[] = [];
  const carColors: [string, string][] = [['white', '#eeeae4'], ['red', '#c94f45'], ['blue', '#3f6fb0'], ['graphite', '#4a4c5e'], ['taxi', '#f2c230']];
  for (const [name, col] of carColors) {
    for (const axis of ['x', 'y'] as const) {
      for (const dir of ['p', 'n'] as const) {
        const L = 2;
        const W = 1;
        const w = axis === 'x' ? L : W;
        const d = axis === 'x' ? W : L;
        out.push([`car_${name}_${axis}${dir}`, obj(w, d, 26, (img, ox, oy) => {
          const body = hex(col);
          const glass = hex('#3a4a66');
          const wheels: [number, number][] = axis === 'x' ? [[0.4, W - 0.1], [1.6, W - 0.1]] : [[W - 0.1, 0.4], [W - 0.1, 1.6]];
          for (const [wx, wy] of wheels) {
            const [x, y] = iso(ox, oy, wx, wy, 3);
            img.ellipse(x, y, 3.5, 3.5, hex('#1e1d28'));
            img.ellipse(x, y, 1.6, 1.6, hex('#8d90a6'));
          }
          if (axis === 'x') {
            B(img, ox, oy, 0.05, 0.15, L - 0.1, W - 0.3, 3, 7, box(body));
            B(img, ox, oy, 0.5, 0.2, 0.95, W - 0.4, 10, 6, box(shade(body, 0.05)));
            faceY(img, ox, oy, 0.55, 1.4, W - 0.2, 11, 15, glass);
            faceX(img, ox, oy, 1.45, 0.22, W - 0.22, 11, 15, shade(glass, 0.15));
            const front = dir === 'p' ? L - 0.05 : 0.05;
            faceY(img, ox, oy, front - (dir === 'p' ? 0.15 : 0), front + (dir === 'p' ? 0 : 0.15), W - 0.15, 6, 8, dir === 'p' ? hex('#fff6c2') : hex('#ff5a4a'));
            if (dir === 'p') faceX(img, ox, oy, L - 0.05, 0.25, W - 0.25, 6, 8, hex('#fff6c2'));
          } else {
            B(img, ox, oy, 0.15, 0.05, W - 0.3, L - 0.1, 3, 7, box(body));
            B(img, ox, oy, 0.2, 0.5, W - 0.4, 0.95, 10, 6, box(shade(body, 0.05)));
            faceX(img, ox, oy, W - 0.2, 0.55, 1.4, 11, 15, glass);
            faceY(img, ox, oy, 0.22, W - 0.22, 1.45, 11, 15, shade(glass, 0.15));
            if (dir === 'p') faceY(img, ox, oy, 0.25, W - 0.25, L - 0.05, 6, 8, hex('#fff6c2'));
            else faceY(img, ox, oy, 0.25, W - 0.25, L - 0.05, 6, 8, hex('#ff5a4a'));
          }
          if (name === 'taxi') {
            const [x, y] = axis === 'x' ? iso(ox, oy, 1, 0.5, 16) : iso(ox, oy, 0.5, 1, 16);
            img.rect(x - 3, y - 2, 6, 2, hex('#2a2235'));
            img.px(x - 2, y - 2, hex('#ffe08a'));
            img.px(x, y - 2, hex('#ffe08a'));
            img.px(x + 2, y - 2, hex('#ffe08a'));
          }
        })]);
      }
    }
  }
  const longVehicle = (name: string, len: number, col: string, stripe: string, h: number, label?: string) => {
    for (const dir of ['p', 'n'] as const) {
      out.push([`${name}_x${dir}`, obj(len, 1.1, h + 12, (img, ox, oy) => {
        for (let i = 0; i < Math.round(len); i += 2) {
          const [x, y] = iso(ox, oy, 0.6 + i, 1.0, 3);
          img.ellipse(x, y, 3.5, 3.5, hex('#1e1d28'));
        }
        B(img, ox, oy, 0, 0.05, len, 1, 3, h, box(col));
        faceY(img, ox, oy, 0.3, len - 0.3, 1.05, h * 0.5, h * 0.85, (_x, _y, u) => ((u * len * 1.6) % 1 < 0.1 ? hex(col) : hex('#3a4a66')));
        faceY(img, ox, oy, 0, len, 1.05, h * 0.25, h * 0.35, hex(stripe));
        const front = dir === 'p';
        faceX(img, ox, oy, len, 0.15, 0.95, h * 0.45, h * 0.9, hex('#3a4a66'));
        faceX(img, ox, oy, len, 0.2, 0.35, 5, 7, front ? hex('#fff6c2') : hex('#ff5a4a'));
        faceX(img, ox, oy, len, 0.75, 0.9, 5, 7, front ? hex('#fff6c2') : hex('#ff5a4a'));
        if (label) signY(img, ox, oy, 0.4, 0.4 + label.length * 0.22, 1.06, h * 0.86, h * 0.98, label, hex('#ffffff'), hex(stripe));
      })]);
    }
  };
  longVehicle('bus', 4, '#e9e6e0', '#2f6db0', 22, 'Т');
  longVehicle('tram', 5, '#e8e2d8', '#c94f45', 22);
  for (const dir of ['p', 'n'] as const) {
    out.push([`train_x${dir}`, obj(4, 1, 30, (img, ox, oy) => {
      B(img, ox, oy, 0, 0.05, 4, 0.9, 2, 18, box('#d65a4a', '#c94f45', '#a93f37'));
      faceY(img, ox, oy, 0.2, 3.8, 0.95, 8, 16, (_x, _y, u) => ((u * 7) % 1 < 0.15 ? hex('#c94f45') : hex('#3a4a66')));
      faceY(img, ox, oy, 0, 4, 0.95, 4, 6, hex('#e9e6e0'));
      B(img, ox, oy, 0.1, 0.1, 3.8, 0.8, 20, 2, box('#9a9aa8'));
    })]);
  }
  for (const dir of ['p', 'n'] as const) {
    out.push([`boat_x${dir}`, obj(4, 1.4, 34, (img, ox, oy) => {
      img.poly([iso(ox, oy, 0, 0.1, 6), iso(ox, oy, dir === 'p' ? 3.4 : 4, 0.1, 6), iso(ox, oy, dir === 'p' ? 4 : 3.4, 0.7, 6), iso(ox, oy, dir === 'p' ? 3.4 : 4, 1.3, 6), iso(ox, oy, 0, 1.3, 6)], hex('#f4f2ee'));
      faceY(img, ox, oy, 0, 3.4, 1.3, 0, 6, (_x, _y, _u, v) => (v < 0.4 ? hex('#2f6db0') : hex('#e9e6e0')));
      B(img, ox, oy, 0.8, 0.3, 2, 0.8, 6, 10, box('#e9e6e0'));
      faceY(img, ox, oy, 0.9, 2.7, 1.1, 8, 14, (_x, _y, u) => ((u * 6) % 1 < 0.15 ? hex('#e9e6e0') : hex('#3a4a66')));
      B(img, ox, oy, 0.7, 0.25, 2.2, 0.9, 16, 2, box('#2f6db0'));
      const [x, y] = iso(ox, oy, 1.5, 0.6, 18);
      img.rect(x, y - 10, 1, 10, hex('#3a3a48'));
      img.rect(x + 1, y - 10, 5, 3, hex('#e8423b'));
    })]);
  }
  return out;
}

/** Small animals: 2-frame cycles, front/back facings. */
export function animals(): Named[] {
  const out: Named[] = [];
  const mk = (name: string, w: number, h: number, draw: (img: Img, f: number) => void, frames = 2) => {
    for (let f = 0; f < frames; f++) {
      const img = new Img(w, h);
      draw(img, f);
      img.outline(0.55, 160);
      out.push([`${name}_${f}`, { img, ax: Math.floor(w / 2), ay: h - 2 }]);
    }
  };
  const catCol = hex('#e09a52');
  mk('cat_sit', 14, 14, (img, f) => {
    img.ellipse(7, 9, 4, 3.5, catCol);
    img.ellipse(7, 5, 3.2, 3, catCol);
    img.poly([[4, 4], [5, 0], [7, 3]], catCol);
    img.poly([[10, 4], [9, 0], [7, 3]], catCol);
    img.px(6, 5, hex('#2a1a2e'));
    img.px(8, 5, hex('#2a1a2e'));
    img.line(11, 11, 13, 7 - f, catCol);
    img.rect(5, 8, 1, 2, shade(catCol, -0.25));
  });
  mk('cat_walk', 16, 12, (img, f) => {
    img.ellipse(7, 6, 5, 3, catCol);
    img.ellipse(12, 4, 3, 2.8, catCol);
    img.poly([[10, 2], [11, -1], [12, 2]], catCol);
    img.poly([[13, 2], [14, -1], [14, 3]], catCol);
    img.px(13, 4, hex('#2a1a2e'));
    img.line(2, 5, 0, 1 + f, catCol);
    for (const [x, o] of [[4, f], [6, 1 - f], [9, f], [11, 1 - f]] as [number, number][]) img.rect(x, 8, 1, 2 + o, shade(catCol, -0.15));
  });
  mk('cat_sleep', 14, 9, (img, f) => {
    img.ellipse(7, 5, 6, 3 + f * 0.3, catCol);
    img.ellipse(10, 4, 2.5, 2.2, catCol);
    img.rect(9, 4, 2, 1, hex('#2a1a2e'));
    img.line(2, 6, 7, 7, shade(catCol, -0.2));
  });
  for (const [k, col] of [['dog_corgi', '#d9893f'], ['dog_dark', '#3a3236']] as [string, string][]) {
    const c = hex(col);
    mk(k, 18, 14, (img, f) => {
      img.ellipse(8, 7, 6, 3.5, c);
      img.ellipse(14, 5, 3.5, 3, c);
      img.rect(15, 5, 3, 2, shade(c, 0.25));
      img.px(17, 5, hex('#2a1a2e'));
      img.px(14, 4, hex('#2a1a2e'));
      img.poly([[12, 3], [13, 0], [14, 3]], c);
      img.line(2, 6, 0, 3 + f, c);
      img.rect(8, 6, 4, 2, shade(c, 0.35));
      for (const [x, o] of [[4, f], [6, 1 - f], [10, f], [12, 1 - f]] as [number, number][]) img.rect(x, 10, 2, 2 + o, shade(c, -0.2));
    });
  }
  mk('pigeon', 8, 7, (img, f) => {
    const g = hex('#8d90a6');
    img.ellipse(4, 4 + f, 3, 2, g);
    img.ellipse(6, 2 + f * 2, 1.6, 1.6, shade(g, -0.15));
    img.px(7, 2 + f * 2, hex('#e0a63b'));
    img.px(3, 4 + f, hex('#6fa08a'));
  });
  mk('pigeon_fly', 10, 7, (img, f) => {
    const g = hex('#8d90a6');
    img.ellipse(5, 4, 3, 1.6, g);
    if (f) {
      img.line(5, 4, 1, 0, g);
      img.line(5, 4, 9, 0, g);
    } else {
      img.line(5, 4, 1, 6, g);
      img.line(5, 4, 9, 6, g);
    }
  });
  return out;
}
