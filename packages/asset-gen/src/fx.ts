/** Status icons, particles and light cookies. */
import { hex, Img, shade, type RGBA } from './raster.js';
import type { Named } from './furniture.js';

const INK = hex('#2a1a2e');

function icon(w: number, h: number, draw: (img: Img) => void, outline = true): Img {
  const img = new Img(w, h);
  draw(img);
  if (outline) img.outline(0.75, 120);
  return img;
}

function bubble(img: Img, w: number, h: number, fill: RGBA) {
  img.rrect(1, 1, w - 2, h - 5, 3, fill);
  img.poly([[4, h - 5], [8, h - 5], [4, h - 1]], fill);
}

export function fx(): Named[] {
  const out: Named[] = [];
  const add = (name: string, img: Img, ax = Math.floor(img.w / 2), ay = img.h - 1) => out.push([name, { img, ax, ay }]);
  for (let f = 0; f < 3; f++)
    add(`icon_think_${f}`, icon(16, 13, (img) => {
      bubble(img, 16, 13, hex('#fbf6ee'));
      for (let i = 0; i < 3; i++) img.rect(4 + i * 3, 4, 2, 2, i <= f ? hex('#6b5a7a') : hex('#cfc6d6'));
    }));
  add('icon_bulb', icon(10, 13, (img) => {
    img.ellipse(5, 5, 4, 4.2, hex('#ffe46b'));
    img.px(3, 3, hex('#fffbe0'));
    img.rect(3, 9, 4, 3, hex('#a9a6b8'));
  }));
  add('icon_alert', icon(8, 14, (img) => {
    img.rrect(1, 0, 6, 9, 2, hex('#ffcf3a'));
    img.rect(3, 1, 2, 5, INK);
    img.rect(3, 7, 2, 1, INK);
    img.rrect(2, 10, 4, 4, 1, hex('#ffcf3a'));
  }));
  add('icon_error', icon(12, 12, (img) => {
    img.ellipse(6, 6, 5.5, 5.5, hex('#e8423b'));
    img.line(3, 3, 8, 8, hex('#fff2f0'));
    img.line(8, 3, 3, 8, hex('#fff2f0'));
    img.line(4, 3, 9, 8, hex('#fff2f0'));
    img.line(9, 3, 4, 8, hex('#fff2f0'));
  }));
  add('icon_done', icon(12, 12, (img) => {
    img.ellipse(6, 6, 5.5, 5.5, hex('#4fb36c'));
    img.line(3, 6, 5, 8, hex('#f3fff2'));
    img.line(5, 8, 9, 3, hex('#f3fff2'));
    img.line(5, 7, 9, 2, hex('#f3fff2'));
  }));
  add('icon_book', icon(12, 10, (img) => {
    img.rect(1, 1, 10, 8, hex('#c0523f'));
    img.rect(2, 1, 4, 7, hex('#f6efe1'));
    img.rect(7, 1, 3, 7, hex('#efe4d2'));
  }));
  add('icon_gear', icon(12, 12, (img) => {
    img.ellipse(6, 6, 5, 5, hex('#8fe3c7'));
    for (const [x, y] of [[6, 0], [6, 11], [0, 6], [11, 6]] as [number, number][]) img.rect(x - 1, y - 1, 2, 2, hex('#8fe3c7'));
    img.ellipse(6, 6, 2, 2, INK);
  }));
  add('icon_search', icon(12, 12, (img) => {
    img.ellipse(5, 5, 4, 4, hex('#ffe08a'));
    img.ellipse(5, 5, 2.4, 2.4, hex('#5a7ab8'));
    img.line(8, 8, 11, 11, hex('#ffe08a'));
    img.line(8, 9, 10, 11, hex('#ffe08a'));
  }));
  add('icon_pen', icon(12, 12, (img) => {
    img.line(2, 10, 9, 3, hex('#ffcf7a'));
    img.line(3, 10, 10, 3, hex('#e3a63b'));
    img.px(2, 11, INK);
  }));
  for (let f = 0; f < 2; f++)
    add(`icon_zzz_${f}`, icon(12, 12, (img) => {
      const c = hex('#cfe0ff');
      img.rect(1 + f, 7 - f, 4, 1, c);
      img.px(3 + f, 8 - f, c);
      img.rect(2 + f, 9 - f, 4, 1, c);
      img.rect(7, 2 + f, 3, 1, c);
      img.px(8, 3 + f, c);
      img.rect(7, 4 + f, 3, 1, c);
    }));
  add('icon_coffee', icon(12, 12, (img) => {
    img.rect(2, 4, 6, 6, hex('#f3e9dc'));
    img.rect(8, 5, 2, 3, hex('#f3e9dc'));
    img.rect(3, 4, 4, 1, hex('#6b3e2a'));
    img.px(4, 1, hex('#ffffff'));
    img.px(5, 2, hex('#ffffff'));
  }));
  add('icon_heart', icon(10, 9, (img) => {
    img.ellipse(3, 3, 2.6, 2.6, hex('#ff6f91'));
    img.ellipse(7, 3, 2.6, 2.6, hex('#ff6f91'));
    img.poly([[0.5, 3.5], [9.5, 3.5], [5, 8.5]], hex('#ff6f91'));
  }));
  add('icon_star', icon(11, 11, (img) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 2.2 : 5;
      pts.push([5.5 + Math.cos(a) * r, 5.5 + Math.sin(a) * r]);
    }
    img.poly(pts, hex('#ffd34d'));
  }));
  add('icon_note', icon(10, 11, (img) => {
    img.rect(6, 1, 1, 7, hex('#fbf6ee'));
    img.ellipse(4.5, 8, 2.2, 1.8, hex('#fbf6ee'));
    img.rect(6, 1, 3, 1, hex('#fbf6ee'));
  }));
  add('item_doc', icon(9, 11, (img) => {
    img.rect(1, 1, 7, 9, hex('#fbf7ec'));
    img.rect(2, 3, 5, 1, hex('#9aa3c4'));
    img.rect(2, 5, 4, 1, hex('#9aa3c4'));
    img.rect(2, 7, 5, 1, hex('#9aa3c4'));
  }));
  add('item_package', icon(12, 11, (img) => {
    img.poly([[1, 4], [6, 1], [11, 4], [6, 7]], hex('#d9a46b'));
    img.poly([[1, 4], [6, 7], [6, 11], [1, 8]], hex('#b8814f'));
    img.poly([[6, 7], [11, 4], [11, 8], [6, 11]], hex('#9c6a3e'));
    img.line(3, 3, 8, 6, hex('#e9d7b0'));
  }));
  add('item_donuts', icon(14, 9, (img) => {
    img.rect(1, 3, 12, 5, hex('#f2a6c2'));
    img.rect(1, 2, 12, 1, hex('#ffd2e1'));
    for (let i = 0; i < 3; i++) {
      img.ellipse(3.5 + i * 3.5, 4, 1.6, 1.2, hex('#c9643a'));
      img.px(3 + i * 3.5, 3, hex('#ffffff'));
    }
  }));
  // particles (no outline)
  const confetti = ['#ff6f91', '#ffd34d', '#5fb0e8', '#7ef0a0', '#c86fe0', '#ff8f4a'];
  confetti.forEach((c, i) => add(`confetti_${i}`, icon(3, 3, (img) => img.rect(0, 0, i % 2 ? 3 : 2, i % 2 ? 2 : 3, hex(c)), false), 1, 1));
  for (let f = 0; f < 4; f++) add(`smoke_${f}`, icon(14, 14, (img) => img.blob(7, 7, 3 + f * 1.4, 3 + f * 1.4, hex('#8d8a9a'), 0.85 - f * 0.18, 0.8), false), 7, 7);
  for (let f = 0; f < 3; f++) add(`steam_${f}`, icon(6, 10, (img) => {
    for (let y = 0; y < 8; y++) img.px(2 + Math.round(Math.sin((y + f * 2) * 0.9)), 8 - y, hex('#ffffff'), 0.65 - y * 0.06);
  }, false), 3, 9);
  add('spark', icon(7, 7, (img) => {
    img.rect(3, 0, 1, 7, hex('#fff6c2'));
    img.rect(0, 3, 7, 1, hex('#fff6c2'));
    img.px(3, 3, hex('#ffffff'));
  }, false), 3, 3);
  add('raindrop', icon(2, 7, (img) => img.rect(0, 0, 1, 7, hex('#cfe6ff', 170)), false), 0, 6);
  add('snowflake', icon(3, 3, (img) => {
    img.px(1, 0, hex('#ffffff'));
    img.rect(0, 1, 3, 1, hex('#ffffff'));
    img.px(1, 2, hex('#ffffff'));
  }, false), 1, 1);
  for (let f = 0; f < 3; f++) add(`splash_${f}`, icon(14, 7, (img) => {
    img.ellipse(7, 3.5, 2 + f * 2.2, 1 + f * 1.1, hex('#cfe6ff', 200 - f * 60));
    img.ellipse(7, 3.5, 1 + f * 2.2, 0.5 + f * 1.1, hex('#00000000'));
  }, false), 7, 3);
  for (const [k, c] of [['leaf_0', '#e3a03d'], ['leaf_1', '#c9643a'], ['leaf_2', '#d9b03d']] as [string, string][]) add(k, icon(4, 3, (img) => {
    img.rect(0, 1, 3, 1, hex(c));
    img.px(1, 0, hex(c));
    img.px(2, 2, shade(hex(c), -0.3));
  }, false), 2, 1);
  add('star_px', icon(3, 3, (img) => {
    img.px(1, 1, hex('#ffffff'));
    img.px(0, 1, hex('#ffffff', 120));
    img.px(2, 1, hex('#ffffff', 120));
    img.px(1, 0, hex('#ffffff', 120));
    img.px(1, 2, hex('#ffffff', 120));
  }, false), 1, 1);
  add('plane', icon(22, 8, (img) => {
    img.rect(2, 3, 18, 2, hex('#e9e6ef'));
    img.poly([[8, 3], [13, 3], [9, 0]], hex('#cfcad8'));
    img.poly([[8, 5], [13, 5], [9, 8]], hex('#cfcad8'));
    img.poly([[2, 3], [5, 3], [1, 0]], hex('#cfcad8'));
    img.rect(19, 3, 2, 1, hex('#bcd7ee'));
  }, false), 11, 4);
  add('ufo', icon(24, 14, (img) => {
    img.ellipse(12, 5, 5, 4, hex('#bfe9ff', 210));
    img.ellipse(12, 9, 11, 3.4, hex('#9aa0b8'));
    img.ellipse(12, 8, 11, 2, hex('#c8cde0'));
    for (let i = 0; i < 4; i++) img.px(5 + i * 5, 10, hex('#7ef0a0'));
  }), 12, 13);
  add('ghost', icon(14, 16, (img) => {
    img.ellipse(7, 6, 6, 6, hex('#eef3ff', 220));
    img.rect(1, 6, 12, 8, hex('#eef3ff', 220));
    for (let i = 0; i < 3; i++) img.ellipse(3 + i * 4, 14, 2, 1.5, hex('#eef3ff', 220));
    img.rect(4, 5, 2, 3, INK);
    img.rect(8, 5, 2, 3, INK);
  }), 7, 15);
  add('disco_ball', icon(14, 14, (img) => {
    img.ellipse(7, 7, 6, 6, hex('#c8cde0'));
    for (let y = 1; y < 14; y += 3) for (let x = 1; x < 14; x += 3) if (Math.hypot(x - 7, y - 7) < 6) img.rect(x, y, 2, 2, (x + y) % 2 ? hex('#ffffff') : hex('#8fa0c0'));
  }), 7, 0);
  // soft contact shadow and light cookies (white, alpha falloff; tinted in the renderer)
  add('shadow', icon(32, 16, (img) => img.blob(16, 8, 15, 7, hex('#2a1640'), 1, 1.2), false), 16, 8);
  add('light_radial', icon(128, 128, (img) => img.blob(64, 64, 63, 63, hex('#ffffff'), 1, 1.8), false), 64, 64);
  add('light_soft', icon(64, 64, (img) => img.blob(32, 32, 31, 31, hex('#ffffff'), 1, 1.1), false), 32, 32);
  add('light_cone', icon(64, 96, (img) => {
    for (let y = 0; y < 96; y++) {
      const t = y / 96;
      const half = 4 + t * 28;
      for (let x = Math.floor(32 - half); x < 32 + half; x++) img.px(x, y, hex('#ffffff'), Math.pow(1 - t, 1.3) * (1 - Math.abs(x - 32) / half) * 0.9);
    }
  }, false), 32, 0);
  return out;
}
