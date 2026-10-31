/** Office furniture and props. Every object is anchored at its footprint back corner. */
import { B, box, faceX, faceY, obj, PAL, rng, type Obj } from './common.js';
import { hex, Img, iso, mix, noise2, shade, type RGBA } from './raster.js';

export type Named = [string, Obj];

const wood = (px: number, py: number) => (noise2(px, py >> 1, 4) - 0.5) * 0.08;

/** Monitor geometry on desk_a (screen faces +y, towards the camera side). */
export const MONITOR = { x0: 0.62, x1: 1.38, y: 0.32, z0: 17, z1: 27 };
export const DESK_H = 13;

function deskBase(img: Img, ox: number, oy: number, top = '#d8a46b') {
  const leg = box('#6d5a52');
  for (const [x, y] of [[0.08, 0.1], [1.84, 0.1], [0.08, 0.78], [1.84, 0.78]] as [number, number][]) B(img, ox, oy, x, y, 0.08, 0.1, 0, DESK_H - 2, leg, { rim: false });
  B(img, ox, oy, 0.15, 0.12, 1.7, 0.08, 3, 8, box('#9a6b46'), { rim: false });
  B(img, ox, oy, 0, 0, 2, 0.95, DESK_H - 2, 2, box(top, '#b98252', '#94603b'), { texture: (px, py, f) => (f === 'top' ? wood(px, py) : 0) });
}

function monitor(img: Img, ox: number, oy: number) {
  const M = MONITOR;
  B(img, ox, oy, 0.92, M.y + 0.02, 0.16, 0.12, DESK_H, 4, box('#3d3f52'), { rim: false });
  B(img, ox, oy, 0.85, M.y - 0.05, 0.3, 0.2, DESK_H, 1, box('#4a4c60'), { rim: false });
  B(img, ox, oy, M.x0 - 0.04, M.y - 0.06, M.x1 - M.x0 + 0.08, 0.06, M.z0 - 1, M.z1 - M.z0 + 2, box('#2f3144', '#3a3d52', '#26283a'));
  faceY(img, ox, oy, M.x0, M.x1, M.y, M.z0, M.z1, PAL.screenOff);
}

function keyboard(img: Img, ox: number, oy: number, y: number) {
  B(img, ox, oy, 0.66, y, 0.6, 0.18, DESK_H, 1, box('#e9e4dc', '#c9c2b8', '#b0a99e'), { rim: false });
  for (let i = 0; i < 5; i++) {
    const [x, yy] = iso(ox, oy, 0.72 + i * 0.1, y + 0.08, DESK_H + 1);
    img.px(x, yy, hex('#a59d92'));
  }
  B(img, ox, oy, 1.36, y + 0.02, 0.1, 0.14, DESK_H, 1, box('#e9e4dc'), { rim: false });
}

export function desks(): Named[] {
  const out: Named[] = [];
  out.push(['desk_a', obj(2, 1, 30, (img, ox, oy) => {
    deskBase(img, ox, oy);
    monitor(img, ox, oy);
    keyboard(img, ox, oy, 0.62);
  })]);
  // desk_b: worker sits behind (smaller y) and faces the camera; a laptop keeps the face visible.
  out.push(['desk_b', obj(2, 1, 24, (img, ox, oy) => {
    deskBase(img, ox, oy, '#cf9a62');
    B(img, ox, oy, 0.62, 0.1, 0.74, 0.42, DESK_H, 1, box('#c3c6d6', '#a6a9bb', '#8d90a3'), { rim: false });
    // lid seen from the back, with a sticker
    faceY(img, ox, oy, 0.62, 1.36, 0.56, DESK_H + 1, DESK_H + 10, (_x, _y, u, v) => (u > 0.42 && u < 0.58 && v > 0.35 && v < 0.65 ? hex('#ffd34d') : mix(hex('#b9bccd'), hex('#9a9db0'), v)));
    B(img, ox, oy, 0.62, 0.56, 0.74, 0.03, DESK_H + 1, 9, box('#a9acbe', '#9a9db0', '#8a8d9f'), { rim: false });
    faceY(img, ox, oy, 0.62, 1.36, 0.59, DESK_H + 1, DESK_H + 10, (_x, _y, u, v) => (u > 0.42 && u < 0.58 && v > 0.35 && v < 0.65 ? hex('#ffd34d') : mix(hex('#c3c6d6'), hex('#a3a6b8'), v)));
  })]);
  out.push(['desk_director', obj(2.4, 1.1, 32, (img, ox, oy) => {
    B(img, ox, oy, 0.05, 0.05, 2.3, 1, 0, DESK_H, box('#8a5539', '#6f4430', '#5a3726'), { texture: (px, py) => wood(px, py) });
    B(img, ox, oy, 0, 0, 2.4, 1.1, DESK_H, 2, box('#9c6342', '#7a4b33', '#633c29'));
    B(img, ox, oy, 0.5, 0.3, 0.06, 0.06, DESK_H + 2, 12, box('#3a3a48'), { rim: false });
    B(img, ox, oy, 0.4, 0.22, 0.26, 0.22, DESK_H + 13, 4, box('#ffd98a', '#f0b765', '#d89a4c'));
    monitorAt(img, ox, oy, 1.0, 0.3);
    B(img, ox, oy, 1.9, 0.5, 0.25, 0.2, DESK_H + 2, 3, box('#fbf6ee'), { rim: false });
  })]);
  return out;
}

function monitorAt(img: Img, ox: number, oy: number, x: number, y: number) {
  B(img, ox, oy, x + 0.3, y + 0.02, 0.14, 0.12, DESK_H + 2, 4, box('#3d3f52'), { rim: false });
  B(img, ox, oy, x, y - 0.06, 0.8, 0.06, DESK_H + 5, 12, box('#2f3144', '#3a3d52', '#26283a'));
  faceY(img, ox, oy, x + 0.04, x + 0.76, y, DESK_H + 6, DESK_H + 16, PAL.screenOff);
}

/**
 * Screen overlays for desk_a: same canvas size and anchor as the desk so they stack exactly.
 * Drawn by the renderer on top of the desk; they are also added to the light map (emissive).
 */
export function screens(): Named[] {
  const out: Named[] = [];
  const M = MONITOR;
  const mk = (name: string, f: (u: number, v: number, px: number, py: number) => RGBA | undefined) =>
    out.push([name, obj(2, 1, 30, (img, ox, oy) => faceY(img, ox, oy, M.x0, M.x1, M.y, M.z0, M.z1, (px, py, u, v) => f(u, v, px, py)))]);
  const bg = hex('#1f2a44');
  for (let fr = 0; fr < 3; fr++) {
    mk(`screen_code_${fr}`, (u, v) => {
      const row = Math.floor(v * 7 + fr * 0.0) + fr;
      const indent = (row * 7) % 3;
      const len = 0.35 + ((row * 13) % 5) * 0.1;
      const lineV = (v * 7) % 1;
      if (lineV > 0.55) return bg;
      if (u > 0.08 + indent * 0.08 && u < 0.08 + indent * 0.08 + len) {
        const tok = Math.floor(u * 9 + row) % 4;
        return [hex('#ffcf7a'), hex('#8fe3c7'), hex('#e8ecff'), hex('#ff9fb8')][tok];
      }
      return bg;
    });
  }
  for (let fr = 0; fr < 2; fr++) {
    mk(`screen_error_${fr}`, (u, v) => {
      const base = fr ? hex('#a8323e') : hex('#c43d4a');
      if (Math.abs(u - 0.5) < 0.12 && Math.abs(v - 0.45) < 0.3 && Math.abs(Math.abs(u - 0.5) * 2.4 - Math.abs(v - 0.45)) < 0.12) return hex('#fff2f0');
      return v > 0.85 ? shade(base, -0.2) : base;
    });
    mk(`screen_term_${fr}`, (u, v) => {
      const lineV = (v * 6) % 1;
      const row = Math.floor(v * 6);
      if (row === 5) return u < 0.3 + fr * 0.35 ? hex('#7ef0a0') : hex('#1a3326');
      if (lineV < 0.5 && u > 0.08 && u < 0.2 + ((row * 31 + fr) % 6) * 0.12) return hex('#9ef5b6');
      return hex('#102017');
    });
    mk(`screen_search_${fr}`, (u, v) => {
      const d = Math.hypot(u - (0.45 + fr * 0.08), v - 0.42);
      if (d < 0.17 && d > 0.1) return hex('#ffe08a');
      if (u > 0.55 + fr * 0.08 && u < 0.75 && Math.abs(u - v - 0.15) < 0.06) return hex('#ffe08a');
      return (u * 5 + v * 3) % 1 < 0.08 ? hex('#3e5a8a') : hex('#2b406b');
    });
    mk(`screen_wait_${fr}`, (u, v) => {
      const inQ = Math.abs(u - 0.5) < 0.08 && ((v > 0.2 && v < 0.6) || (v > 0.7 && v < 0.82));
      return inQ ? hex('#2a1a2e') : fr ? hex('#f5c451') : hex('#ffd76a');
    });
    mk(`screen_idle_${fr}`, (u, v) => {
      const cx = 0.3 + fr * 0.4;
      if (Math.hypot((u - cx) * 1.6, v - 0.55) < 0.22) return hex('#ffd34d');
      return mix(hex('#2d2648'), hex('#4b3a6e'), v);
    });
    mk(`screen_think_${fr}`, (u, v) => {
      for (let i = 0; i < 3; i++) if (Math.hypot((u - (0.3 + i * 0.2)) * 1.6, v - 0.5) < 0.07) return i === fr || i === fr + 1 ? hex('#cfe0ff') : hex('#5c6d99');
      return hex('#26304d');
    });
  }
  mk('screen_done_0', (u, v) => {
    const tick = (Math.abs(v - (0.55 + (u - 0.35))) < 0.08 && u > 0.28 && u < 0.45) || (Math.abs(v - (0.72 - (u - 0.45) * 1.2)) < 0.08 && u > 0.43 && u < 0.72);
    return tick ? hex('#f3fff2') : hex('#3f9a63');
  });
  return out;
}

export function chairs(): Named[] {
  const out: Named[] = [];
  const seat = box('#4e4e66', '#41415a', '#36364c');
  const fabric = (c: string) => box(c, shade(hex(c), -0.15), shade(hex(c), -0.32));
  for (const [suffix, color] of [['', '#59597a'], ['_teal', '#3f7f80'], ['_coral', '#c4675a'], ['_mustard', '#c99a3d']] as [string, string][]) {
    // chair_back: backrest towards +y (camera side) — the worker faces away (NE).
    out.push(['chair_back' + suffix, obj(1, 1, 30, (img, ox, oy) => {
      B(img, ox, oy, 0.47, 0.47, 0.06, 0.06, 2, 6, seat, { rim: false });
      B(img, ox, oy, 0.25, 0.25, 0.5, 0.5, 0, 2, box('#3a3a48'), { rim: false });
      B(img, ox, oy, 0.22, 0.2, 0.56, 0.56, 8, 3, fabric(color));
      B(img, ox, oy, 0.22, 0.72, 0.56, 0.1, 10, 16, fabric(color));
    })]);
    // chair_front: backrest at -y (behind the worker) — the worker faces the camera (SW).
    out.push(['chair_front' + suffix, obj(1, 1, 30, (img, ox, oy) => {
      B(img, ox, oy, 0.22, 0.12, 0.56, 0.1, 10, 16, fabric(color));
      B(img, ox, oy, 0.47, 0.47, 0.06, 0.06, 2, 6, seat, { rim: false });
      B(img, ox, oy, 0.25, 0.25, 0.5, 0.5, 0, 2, box('#3a3a48'), { rim: false });
      B(img, ox, oy, 0.22, 0.22, 0.56, 0.56, 8, 3, fabric(color));
    })]);
  }
  return out;
}

/** Interior back walls with floor-to-ceiling windows (glass is translucent: the city shows through). */
export const WALL_H = 58;
export function walls(): Named[] {
  const out: Named[] = [];
  const frame = hex('#5b4e5a');
  const glass = (u: number, v: number): RGBA => {
    const streak = Math.abs(((u * 1.0 + v * 0.6) % 0.5) - 0.25) < 0.04;
    return streak ? hex('#e8f6ff', 80) : mix(hex('#bfe3f2', 48), hex('#93c1db', 70), v);
  };
  const windowFace = (u: number, v: number): RGBA | undefined => {
    if (v < 0.05 || v > 0.9) return undefined;
    if (u < 0.05 || u > 0.95) return frame;
    if (Math.abs(v - 0.5) < 0.02) return frame;
    return glass(u, v);
  };
  // along x (wall plane y=0, visible face +y)
  out.push(['wall_x_window', obj(1, 0.15, WALL_H, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, 1, 0.12, 0, 6, box('#cdb99c', '#b59e80', '#9c8569'), { rim: false });
    faceY(img, ox, oy, 0, 1, 0.12, 6, WALL_H - 4, (_x, _y, u, v) => windowFace(u, v));
    B(img, ox, oy, 0, 0, 1, 0.12, WALL_H - 4, 4, box('#8a634a'), { rim: true });
  })]);
  out.push(['wall_x_solid', obj(1, 0.15, WALL_H, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, 1, 0.12, 0, WALL_H, box(PAL.wall, PAL.wall, PAL.wallShade), { texture: (px, py) => (noise2(px, py, 61) - 0.5) * 0.03 });
    B(img, ox, oy, 0, 0.12, 1, 0.02, 0, 4, box('#9a7a62'), { rim: false });
  })]);
  out.push(['wall_y_window', obj(0.15, 1, WALL_H, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, 0.12, 1, 0, 6, box('#cdb99c', '#b59e80', '#c2ad90'), { rim: false });
    faceX(img, ox, oy, 0.12, 0, 1, 6, WALL_H - 4, (_x, _y, u, v) => windowFace(u, v));
    B(img, ox, oy, 0, 0, 0.12, 1, WALL_H - 4, 4, box('#8a634a'), { rim: true });
  })]);
  out.push(['wall_y_solid', obj(0.15, 1, WALL_H, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, 0.12, 1, 0, WALL_H, box(PAL.wall, PAL.wallShade, shade(PAL.wall, -0.06)), { texture: (px, py) => (noise2(px, py, 62) - 0.5) * 0.03 });
    B(img, ox, oy, 0.12, 0, 0.02, 1, 0, 4, box('#9a7a62'), { rim: false });
  })]);
  // glass partitions for meeting room / director office / server room
  const pglass = (u: number, v: number): RGBA | undefined => (u < 0.04 || u > 0.96 || v < 0.03 || v > 0.97 ? hex('#7d6f7f') : Math.abs(v - 0.55) < 0.02 ? hex('#efe7ff', 120) : hex('#c9e6f2', 60));
  out.push(['glass_x', obj(1, 0.1, 40, (img, ox, oy) => faceY(img, ox, oy, 0, 1, 0.05, 0, 38, (_x, _y, u, v) => pglass(u, v)))]);
  out.push(['glass_y', obj(0.1, 1, 40, (img, ox, oy) => faceX(img, ox, oy, 0.05, 0, 1, 0, 38, (_x, _y, u, v) => pglass(u, v)))]);
  out.push(['glass_door_x', obj(1, 0.1, 40, (img, ox, oy) => faceY(img, ox, oy, 0, 1, 0.05, 0, 38, (_x, _y, u, v) => (v < 0.03 || u < 0.04 || u > 0.96 ? hex('#7d6f7f') : Math.abs(u - 0.85) < 0.03 && Math.abs(v - 0.5) < 0.08 ? hex('#d9c27a') : hex('#d6eef7', 45))))]);
  out.push(['glass_door_y', obj(0.1, 1, 40, (img, ox, oy) => faceX(img, ox, oy, 0.05, 0, 1, 0, 38, (_x, _y, u, v) => (v < 0.03 || u < 0.04 || u > 0.96 ? hex('#7d6f7f') : Math.abs(u - 0.85) < 0.03 && Math.abs(v - 0.5) < 0.08 ? hex('#d9c27a') : hex('#d6eef7', 45))))]);
  // elevator in the left wall (y-axis wall)
  out.push(['elevator', obj(0.2, 2, WALL_H, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, 0.14, 2, 0, WALL_H, box(PAL.wall, PAL.wallShade, shade(PAL.wall, -0.04)));
    faceX(img, ox, oy, 0.15, 0.25, 1.75, 0, 44, (_x, _y, u, v) => (u < 0.04 || u > 0.96 || v < 0.03 ? hex('#8d8a9a') : Math.abs(u - 0.5) < 0.012 ? hex('#6b6878') : mix(hex('#d5d3df'), hex('#a9a6b8'), v + (u % 0.5) * 0.3)));
    faceX(img, ox, oy, 0.15, 0.85, 1.15, 47, 52, hex('#2a1a2e'));
    faceX(img, ox, oy, 0.16, 0.9, 1.1, 48, 51, hex('#ffb35c'));
  })]);
  return out;
}

export function furniture(): Named[] {
  const out: Named[] = [];
  const r = rng(99);
  // plants
  const pot = (img: Img, ox: number, oy: number, x: number, y: number, s: number, c = PAL.pot) => {
    B(img, ox, oy, x, y, s, s, 0, Math.round(s * 18), box(c));
    B(img, ox, oy, x + 0.04, y + 0.04, s - 0.08, s - 0.08, Math.round(s * 18) - 1, 1, box('#5a3d2e'), { rim: false });
  };
  const leaves = (img: Img, cx: number, cy: number, rx: number, ry: number, seed: number, cols = [PAL.leafDark, PAL.leaf, PAL.leafLight]) => {
    const rr = rng(seed);
    for (let i = 0; i < 26; i++) {
      const a = rr() * Math.PI * 2;
      const d = Math.sqrt(rr());
      const x = cx + Math.cos(a) * rx * d;
      const y = cy + Math.sin(a) * ry * d;
      const shadeIdx = y < cy - ry * 0.2 ? 2 : y > cy + ry * 0.3 ? 0 : 1;
      img.ellipse(x, y, 2.6 + rr() * 1.4, 1.8 + rr(), cols[shadeIdx]!);
    }
  };
  out.push(['plant_small', obj(0.5, 0.5, 26, (img, ox, oy) => {
    pot(img, ox, oy, 0.1, 0.1, 0.3);
    const [x, y] = iso(ox, oy, 0.25, 0.25, 12);
    leaves(img, x, y - 4, 7, 6, 3);
    img.outline(0.5, 200);
  })]);
  out.push(['plant_big', obj(1, 1, 52, (img, ox, oy) => {
    pot(img, ox, oy, 0.25, 0.25, 0.5, hex('#e8dccb'));
    const [x, y] = iso(ox, oy, 0.5, 0.5, 9);
    for (let i = 0; i < 4; i++) img.line(x, y, x - 6 + i * 4, y - 16 - (i % 2) * 6, PAL.leafDark);
    leaves(img, x, y - 22, 13, 11, 8);
    leaves(img, x + 3, y - 30, 8, 6, 9, [PAL.leaf, PAL.leafLight, hex('#b4dd86')]);
    img.outline(0.5, 200);
  })]);
  out.push(['plant_ficus', obj(0.8, 0.8, 64, (img, ox, oy) => {
    pot(img, ox, oy, 0.2, 0.2, 0.4, hex('#7d8aa6'));
    const [x, y] = iso(ox, oy, 0.4, 0.4, 8);
    img.line(x, y, x, y - 34, hex('#7a5a40'));
    img.line(x + 1, y, x + 1, y - 30, hex('#5e4430'));
    leaves(img, x, y - 38, 10, 12, 21);
    leaves(img, x - 2, y - 26, 8, 6, 22);
    img.outline(0.5, 200);
  })]);
  out.push(['plant_cactus', obj(0.4, 0.4, 20, (img, ox, oy) => {
    pot(img, ox, oy, 0.08, 0.08, 0.24, hex('#e7b04a'));
    const [x, y] = iso(ox, oy, 0.2, 0.2, 5);
    img.rrect(x - 2, y - 11, 5, 9, 2, hex('#5f9e57'));
    img.rrect(x + 2, y - 8, 3, 4, 1, hex('#6aac60'));
    img.px(x, y - 12, hex('#ff7aa2'));
    img.outline(0.5, 200);
  })]);
  // storage
  out.push(['bookshelf', obj(1.6, 0.45, 48, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, 1.6, 0.45, 0, 46, box('#9b6a46', '#a8744a', '#7d5236'), { texture: (px, py) => wood(px, py) });
    const cols = ['#c0523f', '#3f7f80', '#e3a63b', '#7e5a8c', '#efe1c4', '#5f9e57', '#2f4b8f'];
    for (let shelf = 0; shelf < 3; shelf++) {
      const z = 6 + shelf * 14;
      let x = 0.08;
      while (x < 1.5) {
        const w = 0.07 + r() * 0.06;
        const hgt = 7 + Math.floor(r() * 5);
        if (r() > 0.12) faceY(img, ox, oy, x, Math.min(1.52, x + w), 0.45, z, z + hgt, hex(cols[Math.floor(r() * cols.length)]!));
        x += w + 0.01;
      }
      faceY(img, ox, oy, 0, 1.6, 0.45, z - 2, z, hex('#7d5236'));
    }
  })]);
  out.push(['cabinet', obj(0.8, 0.6, 26, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, 0.8, 0.6, 0, 24, box('#d9d3cb', '#c4bdb3', '#a59d93'));
    for (let i = 0; i < 3; i++) {
      faceY(img, ox, oy, 0.06, 0.74, 0.6, 3 + i * 7, 4 + i * 7, hex('#a59d93'));
      faceY(img, ox, oy, 0.35, 0.45, 0.6, 6 + i * 7, 7 + i * 7, hex('#7d7a88'));
    }
  })]);
  // lounge
  const sofa = (c: string) => obj(2, 1, 26, (img, ox, oy) => {
    const f = box(c, shade(hex(c), -0.15), shade(hex(c), -0.32));
    B(img, ox, oy, 0, 0, 2, 0.95, 0, 10, f);
    B(img, ox, oy, 0, 0, 2, 0.28, 10, 12, f);
    B(img, ox, oy, 0, 0, 0.25, 0.95, 10, 6, f);
    B(img, ox, oy, 1.75, 0, 0.25, 0.95, 10, 6, f);
    B(img, ox, oy, 0.3, 0.3, 0.68, 0.6, 10, 3, box(shade(hex(c), 0.12)));
    B(img, ox, oy, 1.02, 0.3, 0.68, 0.6, 10, 3, box(shade(hex(c), 0.12)));
    // plaid blanket
    faceY(img, ox, oy, 1.3, 1.7, 0.95, 2, 12, (_x, _y, u, v) => ((Math.floor(u * 4) + Math.floor(v * 4)) % 2 ? hex('#e8d5a8') : hex('#c96a4a')));
  });
  out.push(['sofa_teal', sofa('#4f8f8c')], ['sofa_mustard', sofa('#d9a441')]);
  out.push(['armchair', obj(1, 1, 24, (img, ox, oy) => {
    const f = box('#c96a4a');
    B(img, ox, oy, 0.1, 0.1, 0.8, 0.8, 0, 9, f);
    B(img, ox, oy, 0.1, 0.1, 0.8, 0.22, 9, 12, f);
    B(img, ox, oy, 0.1, 0.1, 0.18, 0.8, 9, 5, f);
    B(img, ox, oy, 0.72, 0.1, 0.18, 0.8, 9, 5, f);
  })]);
  out.push(['coffee_table', obj(1.2, 0.8, 14, (img, ox, oy) => {
    B(img, ox, oy, 0.1, 0.1, 1, 0.6, 0, 8, box('#7a4b33'));
    B(img, ox, oy, 0.05, 0.05, 1.1, 0.7, 8, 2, box('#a8703f'));
    B(img, ox, oy, 0.3, 0.25, 0.14, 0.14, 10, 4, box('#f3e9dc'), { rim: false });
    B(img, ox, oy, 0.7, 0.3, 0.3, 0.22, 10, 2, box('#c0523f'), { rim: false });
  })]);
  out.push(['rug', obj(3, 2, 2, (img, ox, oy) => {
    img.poly([iso(ox, oy, 0, 0), iso(ox, oy, 3, 0), iso(ox, oy, 3, 2), iso(ox, oy, 0, 2)], (px, py) => {
      const rx = px + 0.5 - ox;
      const ry = py + 0.5 - oy;
      const u = (rx / 16 + ry / 8) / 2 / 3;
      const v = (ry / 8 - rx / 16) / 2 / 2;
      const border = u < 0.06 || u > 0.94 || v < 0.08 || v > 0.92;
      const stripe = Math.floor(v * 10) % 3 === 0;
      return border ? hex('#7e5a8c') : stripe ? hex('#e3a63b') : hex('#d6c5a3');
    });
  })]);
  out.push(['foosball', obj(2, 1, 22, (img, ox, oy) => {
    for (const [x, y] of [[0.15, 0.15], [1.75, 0.15], [0.15, 0.75], [1.75, 0.75]] as [number, number][]) B(img, ox, oy, x, y, 0.1, 0.1, 0, 10, box('#3a3a48'), { rim: false });
    B(img, ox, oy, 0.1, 0.1, 1.8, 0.8, 10, 6, box('#7a4b33'));
    B(img, ox, oy, 0.2, 0.2, 1.6, 0.6, 15, 1, box('#4f9a55'), { rim: false });
    for (let i = 0; i < 4; i++) B(img, ox, oy, 0.4 + i * 0.38, -0.05, 0.03, 0.9, 17, 1, box('#c9c9d4'), { rim: false });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) B(img, ox, oy, 0.38 + i * 0.38, 0.3 + j * 0.25, 0.07, 0.07, 15, 4, box(i % 2 ? '#e05a4f' : '#3f7fd0'), { rim: false });
  })]);
  out.push(['aquarium_0', aquarium(0)], ['aquarium_1', aquarium(1)]);
  // kitchen
  out.push(['counter', obj(3, 0.8, 34, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, 3, 0.8, 0, 18, box('#e6ddd0', '#d3c8b8', '#b8ac9b'));
    for (let i = 0; i < 3; i++) faceY(img, ox, oy, 0.05 + i, 0.95 + i, 0.8, 2, 16, (_x, _y, u, v) => (u < 0.04 || u > 0.96 || v < 0.04 ? hex('#b8ac9b') : Math.abs(u - 0.5) < 0.05 && v < 0.2 ? hex('#8d8a9a') : hex('#efe7db')));
    B(img, ox, oy, 0, 0, 3, 0.8, 18, 2, box('#4c4a5a'));
    // coffee machine
    B(img, ox, oy, 0.3, 0.1, 0.6, 0.5, 20, 16, box('#3a3b4c', '#2f3040', '#25263a'));
    faceY(img, ox, oy, 0.4, 0.8, 0.6, 26, 32, hex('#c9c9d4'));
    faceY(img, ox, oy, 0.5, 0.7, 0.6, 21, 25, hex('#1d1c28'));
    B(img, ox, oy, 0.55, 0.45, 0.12, 0.12, 20, 3, box('#f3e9dc'), { rim: false });
    // kettle, toaster, fruit bowl
    B(img, ox, oy, 1.3, 0.25, 0.3, 0.3, 20, 8, box('#d65a4a'));
    B(img, ox, oy, 2.1, 0.2, 0.5, 0.4, 20, 4, box('#e8d5a8'));
    const [bx, by] = iso(ox, oy, 2.35, 0.4, 24);
    img.ellipse(bx - 2, by - 1, 2, 2, hex('#f0a33a'));
    img.ellipse(bx + 2, by - 1, 2, 2, hex('#d8423b'));
    img.ellipse(bx, by - 2, 2, 2, hex('#a7c84a'));
  })]);
  out.push(['fridge', obj(0.9, 0.8, 44, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, 0.9, 0.8, 0, 42, box('#e9edf2', '#d5dae2', '#b8bfca'));
    faceY(img, ox, oy, 0.05, 0.85, 0.8, 26, 27, hex('#b8bfca'));
    faceY(img, ox, oy, 0.7, 0.75, 0.8, 30, 38, hex('#8d93a3'));
    faceY(img, ox, oy, 0.15, 0.3, 0.8, 33, 37, hex('#ffd34d'));
    faceY(img, ox, oy, 0.35, 0.5, 0.8, 30, 35, hex('#8fe3c7'));
  })]);
  out.push(['cooler', obj(0.6, 0.6, 40, (img, ox, oy) => {
    B(img, ox, oy, 0.05, 0.05, 0.5, 0.5, 0, 24, box('#eef0f4', '#d9dce4', '#bfc3cf'));
    faceY(img, ox, oy, 0.15, 0.25, 0.55, 18, 21, hex('#3f7fd0'));
    faceY(img, ox, oy, 0.32, 0.42, 0.55, 18, 21, hex('#d8423b'));
    const [x, y] = iso(ox, oy, 0.3, 0.3, 24);
    img.rrect(x - 5, y - 13, 10, 13, 3, hex('#7fc6ea', 210));
    img.rect(x - 3, y - 11, 2, 9, hex('#e6f7ff', 160));
    img.rect(x - 2, y - 15, 4, 2, hex('#3f7fd0'));
  })]);
  out.push(['printer', obj(1, 0.8, 26, (img, ox, oy) => {
    B(img, ox, oy, 0.05, 0.05, 0.9, 0.7, 0, 12, box('#b8b2aa'));
    B(img, ox, oy, 0.1, 0.1, 0.8, 0.6, 12, 9, box('#e9e6e1', '#d3cfc8', '#b8b2aa'));
    B(img, ox, oy, 0.2, 0.15, 0.6, 0.3, 21, 1, box('#fbf7ec'), { rim: false });
    faceY(img, ox, oy, 0.15, 0.3, 0.7, 15, 17, hex('#7ef0a0'));
  })]);
  out.push(['vending', obj(1, 0.8, 50, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, 1, 0.8, 0, 48, box('#c94f45', '#b5463d', '#963a33'));
    faceY(img, ox, oy, 0.08, 0.7, 0.8, 14, 44, (_x, _y, u, v) => {
      const row = Math.floor(v * 5);
      const col = Math.floor(u * 4);
      if ((v * 5) % 1 > 0.75) return hex('#d6d0d8');
      return [hex('#ffd34d'), hex('#5fb0e8'), hex('#8fe3c7'), hex('#ff9fb8'), hex('#f0a33a')][(row + col) % 5];
    });
    faceY(img, ox, oy, 0.08, 0.7, 0.8, 4, 10, hex('#2a2235'));
  })]);
  // tech
  out.push(['server_0', server(0)], ['server_1', server(1)]);
  out.push(['terminal', obj(1, 0.7, 34, (img, ox, oy) => {
    B(img, ox, oy, 0.1, 0.1, 0.8, 0.5, 0, 14, box('#5b5d72'));
    B(img, ox, oy, 0.2, 0.2, 0.6, 0.12, 14, 14, box('#2f3144'));
    faceY(img, ox, oy, 0.24, 0.76, 0.32, 16, 26, hex('#102017'));
  })]);
  // boards and walls decor (wall-mounted along x walls, face +y)
  out.push(['board_analytics', obj(2.4, 0.1, 44, (img, ox, oy) => {
    faceY(img, ox, oy, 0, 2.4, 0.08, 14, 44, (_x, _y, u, v) => (u < 0.02 || u > 0.98 || v < 0.04 || v > 0.96 ? hex('#7a4b33') : hex('#c99c66')));
    const pins: [number, number][] = [[0.15, 0.25], [0.45, 0.2], [0.8, 0.3], [0.3, 0.65], [0.65, 0.7], [0.9, 0.75], [0.5, 0.45]];
    const P = (u: number, v: number) => iso(ox, oy, u * 2.4, 0.08, 44 - v * 30);
    const red = hex('#d8323e');
    for (const [a, b] of [[0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 4], [0, 3], [1, 2]] as [number, number][]) {
      const [x0, y0] = P(...pins[a]!);
      const [x1, y1] = P(...pins[b]!);
      img.line(x0, y0, x1, y1, red);
    }
    pins.forEach(([u, v], i) => {
      const [x, y] = P(u, v);
      img.rect(x - 3, y - 2, 6, 5, i % 3 ? hex('#fbf7ec') : hex('#bfe3f2'));
      img.rect(x - 2, y, 4, 1, hex('#9aa3c4'));
      img.px(x, y - 3, red);
    });
  })]);
  out.push(['whiteboard', obj(2, 0.1, 44, (img, ox, oy) => {
    faceY(img, ox, oy, 0, 2, 0.08, 16, 42, (_x, _y, u, v) => {
      if (u < 0.02 || u > 0.98 || v < 0.04 || v > 0.96) return hex('#a9a6b8');
      if (Math.abs(v - 0.3) < 0.03 && u > 0.1 && u < 0.6) return hex('#3f7fd0');
      if (Math.abs(v - 0.5) < 0.03 && u > 0.1 && u < 0.45) return hex('#3f7fd0');
      if (Math.abs(u - 0.75) < 0.12 && Math.abs(v - 0.55) < 0.25 && Math.abs(Math.hypot((u - 0.75) * 2, v - 0.55) - 0.2) < 0.03) return hex('#d8323e');
      return hex('#f7f7f4');
    });
  })]);
  out.push(['kanban', obj(3, 0.1, 50, (img, ox, oy) => {
    faceY(img, ox, oy, 0, 3, 0.08, 14, 48, (_x, _y, u, v) => {
      if (u < 0.015 || u > 0.985 || v < 0.03 || v > 0.97) return hex('#5b4e5a');
      if (v < 0.16) return Math.floor(u * 3) === 0 ? hex('#e8a9a0') : Math.floor(u * 3) === 1 ? hex('#f3d48a') : hex('#a9d6a0');
      if ((u * 3) % 1 < 0.012) return hex('#cfc6be');
      return hex('#f3efe8');
    });
  })]);
  out.push(['tv_dashboard', obj(2, 0.1, 44, (img, ox, oy) => {
    faceY(img, ox, oy, 0, 2, 0.08, 18, 42, (_x, _y, u, v) => (u < 0.015 || u > 0.985 || v < 0.03 || v > 0.97 ? hex('#26283a') : hex('#18192a')));
  })]);
  for (let k = 0; k < 4; k++) out.push([`poster_${k}`, poster(k)]);
  out.push(['calendar', obj(0.6, 0.1, 40, (img, ox, oy) => {
    faceY(img, ox, oy, 0, 0.6, 0.08, 24, 38, (_x, _y, u, v) => {
      if (v < 0.25) return hex('#e35d4f');
      if (v > 0.3 && (u * 7) % 1 < 0.6 && (v * 10) % 1 < 0.55) return Math.floor(u * 7) === 4 && Math.floor(v * 10) === 6 ? hex('#e35d4f') : hex('#7d7a88');
      return hex('#fbf7ec');
    });
  })]);
  out.push(['clock', obj(0.4, 0.1, 46, (img, ox, oy) => {
    const [x, y] = iso(ox, oy, 0.2, 0.08, 40);
    img.ellipse(x, y, 4.5, 4.5, hex('#5b4e5a'));
    img.ellipse(x, y, 3.5, 3.5, hex('#fbf7ec'));
    img.line(x, y, x, y - 3, hex('#2a1a2e'));
    img.line(x, y, x + 2, y, hex('#2a1a2e'));
  })]);
  out.push(['lamp_floor', obj(0.6, 0.6, 56, (img, ox, oy) => {
    B(img, ox, oy, 0.15, 0.15, 0.3, 0.3, 0, 2, box('#3a3a48'), { rim: false });
    const [x, y] = iso(ox, oy, 0.3, 0.3, 2);
    img.rect(x, y - 40, 1, 40, hex('#3a3a48'));
    img.poly([[x - 6, y - 40], [x + 7, y - 40], [x + 4, y - 50], [x - 3, y - 50]], hex('#f4d39b'));
    img.rect(x - 6, y - 41, 13, 1, hex('#e3b46e'));
  })]);
  out.push(['lamp_desk', obj(0.4, 0.4, 20, (img, ox, oy) => {
    const [x, y] = iso(ox, oy, 0.2, 0.2, 0);
    img.rect(x - 2, y - 1, 5, 2, hex('#3a3a48'));
    img.line(x, y - 1, x + 3, y - 10, hex('#3a3a48'));
    img.poly([[x + 1, y - 11], [x + 8, y - 12], [x + 7, y - 7], [x + 3, y - 7]], hex('#e3a63b'));
  })]);
  out.push(['outbox', obj(1, 0.8, 22, (img, ox, oy) => {
    B(img, ox, oy, 0.1, 0.1, 0.8, 0.6, 0, 12, box('#a8703f'));
    B(img, ox, oy, 0.2, 0.2, 0.6, 0.4, 12, 3, box('#5b8fd0'));
    B(img, ox, oy, 0.25, 0.25, 0.5, 0.3, 13, 3, box('#fbf7ec'), { rim: false });
    faceY(img, ox, oy, 0.3, 0.7, 0.6, 4, 8, hex('#fbf7ec'));
  })]);
  out.push(['coat_rack', obj(0.5, 0.5, 52, (img, ox, oy) => {
    const [x, y] = iso(ox, oy, 0.25, 0.25, 0);
    img.rect(x - 3, y - 1, 7, 2, hex('#5a3d2e'));
    img.rect(x, y - 44, 1, 44, hex('#7a4b33'));
    img.rrect(x - 5, y - 40, 5, 14, 2, hex('#c96a4a'));
    img.rrect(x + 1, y - 42, 5, 12, 2, hex('#4f6f9a'));
    img.rect(x - 4, y - 45, 9, 2, hex('#7a4b33'));
  })]);
  out.push(['meeting_table', obj(2.4, 1.4, 16, (img, ox, oy) => {
    B(img, ox, oy, 0.9, 0.5, 0.6, 0.4, 0, 12, box('#5b4e5a'));
    B(img, ox, oy, 0, 0, 2.4, 1.4, 12, 2, box('#e9e1d4', '#cfc4b3', '#b3a693'));
    B(img, ox, oy, 0.4, 0.4, 0.3, 0.25, 14, 1, box('#fbf7ec'), { rim: false });
    B(img, ox, oy, 1.6, 0.8, 0.12, 0.12, 14, 4, box('#d8423b'), { rim: false });
  })]);
  out.push(['stool', obj(0.6, 0.6, 14, (img, ox, oy) => {
    B(img, ox, oy, 0.25, 0.25, 0.1, 0.1, 0, 8, box('#3a3a48'), { rim: false });
    B(img, ox, oy, 0.1, 0.1, 0.4, 0.4, 8, 3, box('#c96a4a'));
  })]);
  out.push(['cat_bed', obj(0.8, 0.8, 8, (img, ox, oy) => {
    const [x, y] = iso(ox, oy, 0.4, 0.4, 0);
    img.ellipse(x, y, 9, 5, hex('#c96a4a'));
    img.ellipse(x, y - 1, 7, 3.5, hex('#f0dcc0'));
  })]);
  // desk decorations (sit on desk tops: anchor = desk top point)
  const deco = (name: string, draw: (img: Img, x: number, y: number) => void) => {
    const img = new Img(16, 16);
    draw(img, 8, 13);
    img.outline(0.5, 200);
    out.push([name, { img, ax: 8, ay: 13 }]);
  };
  deco('deco_mug', (img, x, y) => {
    img.rect(x - 2, y - 4, 4, 4, hex('#f3e9dc'));
    img.px(x + 2, y - 3, hex('#f3e9dc'));
    img.rect(x - 2, y - 4, 4, 1, hex('#6b3e2a'));
  });
  deco('deco_mug_red', (img, x, y) => {
    img.rect(x - 2, y - 4, 4, 4, hex('#d8423b'));
    img.px(x + 2, y - 3, hex('#d8423b'));
    img.rect(x - 2, y - 4, 4, 1, hex('#6b3e2a'));
  });
  deco('deco_plush', (img, x, y) => {
    img.ellipse(x, y - 3, 4, 3.5, hex('#ffd34d'));
    img.px(x - 3, y - 7, hex('#ffd34d'));
    img.px(x + 3, y - 7, hex('#ffd34d'));
    img.px(x - 1, y - 4, PAL.ink);
    img.px(x + 1, y - 4, PAL.ink);
  });
  deco('deco_plush_bear', (img, x, y) => {
    img.ellipse(x, y - 3, 4, 3.5, hex('#b47a52'));
    img.ellipse(x - 3, y - 7, 1.5, 1.5, hex('#b47a52'));
    img.ellipse(x + 3, y - 7, 1.5, 1.5, hex('#b47a52'));
    img.px(x - 1, y - 4, PAL.ink);
    img.px(x + 1, y - 4, PAL.ink);
    img.px(x, y - 3, hex('#f0dcc0'));
  });
  deco('deco_papers', (img, x, y) => {
    img.rect(x - 4, y - 3, 7, 3, hex('#fbf7ec'));
    img.rect(x - 3, y - 4, 7, 1, hex('#e9e4dc'));
  });
  deco('deco_frame', (img, x, y) => {
    img.rect(x - 2, y - 6, 5, 6, hex('#7a4b33'));
    img.rect(x - 1, y - 5, 3, 4, hex('#9fd0e0'));
  });
  deco('deco_succulent', (img, x, y) => {
    img.rect(x - 2, y - 3, 5, 3, hex('#e8dccb'));
    img.ellipse(x + 0.5, y - 4, 3, 2, hex('#7bb36a'));
  });
  deco('deco_duck', (img, x, y) => {
    img.ellipse(x, y - 2, 3, 2, hex('#ffd34d'));
    img.ellipse(x + 1, y - 5, 2, 2, hex('#ffd34d'));
    img.px(x + 3, y - 5, hex('#f08a3a'));
  });
  deco('deco_sticky', (img, x, y) => {
    img.rect(x - 3, y - 4, 3, 3, hex('#ffe46b'));
    img.rect(x + 1, y - 3, 3, 3, hex('#ff9fb8'));
  });
  return out;
}

function aquarium(frame: number): Obj {
  return obj(1.6, 0.6, 40, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, 1.6, 0.6, 0, 14, box('#5b4e5a'));
    faceY(img, ox, oy, 0.05, 1.55, 0.58, 15, 36, (_x, _y, u, v) => {
      const fish = (fu: number, fv: number, c: string) => Math.hypot((u - fu) * 3, v - fv) < 0.07;
      const s = frame ? 0.05 : 0;
      if (fish(0.3 + s, 0.4, '')) return hex('#ff8f4a');
      if (fish(0.7 - s, 0.6, '')) return hex('#ffd34d');
      if (fish(0.5 + s * 2, 0.3, '')) return hex('#ff6f91');
      if (v > 0.82) return (u * 20) % 2 < 1 ? hex('#d6bf95') : hex('#c4a97c');
      if (v > 0.5 && Math.abs(u - 0.15) < 0.03 + v * 0.02) return hex('#5f9e57');
      if (Math.abs(u - (0.85 - frame * 0.02)) < 0.01 && ((v * 10 + frame * 3) % 3) < 0.6) return hex('#e6f7ff');
      return mix(hex('#6fc3d9', 210), hex('#3f8fb0', 230), v);
    });
    B(img, ox, oy, 0, 0, 1.6, 0.6, 36, 3, box('#5b4e5a'));
  });
}

function server(frame: number): Obj {
  return obj(1, 0.9, 50, (img, ox, oy) => {
    B(img, ox, oy, 0, 0, 1, 0.9, 0, 48, box('#3a3b4c', '#2f3040', '#25263a'));
    for (let i = 0; i < 6; i++) {
      faceY(img, ox, oy, 0.08, 0.92, 0.9, 4 + i * 7, 9 + i * 7, hex('#1d1e2b'));
      for (let k = 0; k < 4; k++) {
        const on = (i * 3 + k + frame * 2) % 5 < 3;
        const col = k === 3 ? (on ? hex('#ffb35c') : hex('#5a3a22')) : on ? hex('#7ef0a0') : hex('#24452f');
        const [x, y] = iso(ox, oy, 0.15 + k * 0.07, 0.9, 7 + i * 7);
        img.px(x, y, col);
      }
    }
  });
}

function poster(k: number): Obj {
  return obj(0.8, 0.1, 46, (img, ox, oy) =>
    faceY(img, ox, oy, 0, 0.8, 0.08, 22, 44, (_x, _y, u, v) => {
      if (u < 0.05 || u > 0.95 || v < 0.04 || v > 0.96) return hex('#2a2235');
      if (k === 0) return v > 0.6 ? hex('#e35d4f') : Math.hypot(u - 0.5, v - 0.35) < 0.18 ? hex('#ffd34d') : hex('#3f6f8c');
      if (k === 1) return v < 0.5 ? hex('#4f8f8c') : (u + v) % 0.2 < 0.1 ? hex('#efe1c4') : hex('#d9a441');
      if (k === 2) return Math.hypot(u - 0.5, v - 0.5) < 0.25 ? hex('#ff8fbf') : hex('#2d2648');
      return v < 0.33 ? hex('#ef7c6a') : v < 0.66 ? hex('#f3d48a') : hex('#7e5a8c');
    }),
  );
}
