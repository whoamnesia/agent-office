/**
 * Layered chibi characters (tile-scale ~20×32 px inside a 24×36 frame).
 * Layers: back hair → legs/shoes → torso/outfit → arms → head/face → front hair → accessories → props.
 * Output is composited per preset so layer order is always right; the layers themselves are generic.
 */
import { hex, Img, mix, shade, type RGBA } from './raster.js';

export const CHAR_W = 24;
export const CHAR_H = 36;
export const FEET_X = 12;
export const FEET_Y = 34;

export type Facing = 'front' | 'back';
type HairStyle = 'bob' | 'long' | 'ponytail' | 'bun' | 'short' | 'curly' | 'buzz' | 'swept' | 'twintails' | 'none';
type TopStyle = 'hoodie' | 'sweater' | 'shirt_tie' | 'blazer' | 'tshirt' | 'cardigan' | 'vest' | 'turtleneck' | 'overalls' | 'uniform' | 'apron' | 'coat' | 'puffer';
type Accessory = 'glasses' | 'headphones' | 'cap' | 'beanie' | 'scarf' | 'lanyard' | 'none';
type Prop = 'book' | 'mug' | 'phone' | 'doc' | 'flashlight' | 'tray' | 'none';

export interface Preset {
  id: string;
  skin: string;
  hair: HairStyle;
  hairColor: string;
  top: TopStyle;
  topColor: string;
  accent: string;
  pants: string;
  shoes: string;
  acc: Accessory[];
  carry?: Prop;
}

const SKINS = ['#f7d7c4', '#eebf9f', '#d79a73', '#a8704c', '#7a4e36'];
const EYE = hex('#3a2638');
const BLUSH = hex('#ff8f9e');

export const PRESETS: Preset[] = [];
// Agent families: agent_type picks the family (outfit), agent_id picks the variant (hair/skin).
const FAMILIES: { key: string; top: TopStyle; topColor: string; accent: string; pants: string; acc?: Accessory[] }[] = [
  { key: 'explore', top: 'hoodie', topColor: '#3fa7a0', accent: '#e8f4ef', pants: '#3b4466' },
  { key: 'general', top: 'sweater', topColor: '#e3a63b', accent: '#fff1c9', pants: '#4b3f5c' },
  { key: 'plan', top: 'shirt_tie', topColor: '#e9edf5', accent: '#2f4b8f', pants: '#2d3352' },
  { key: 'review', top: 'cardigan', topColor: '#9c3b4f', accent: '#f4e3d7', pants: '#3a3240', acc: ['glasses'] },
  { key: 'qa', top: 'vest', topColor: '#5f9e4f', accent: '#f1f5e6', pants: '#38425a' },
  { key: 'docs', top: 'sweater', topColor: '#efe1c4', accent: '#a7744f', pants: '#6d4c3d' },
  { key: 'security', top: 'turtleneck', topColor: '#2c2b3a', accent: '#57d6c3', pants: '#24232f', acc: ['headphones'] },
  { key: 'frontend', top: 'tshirt', topColor: '#ef7c6a', accent: '#ffe6d6', pants: '#3c5a86' },
];
const HAIRS: [HairStyle, string][] = [
  ['bob', '#3b2a2a'],
  ['short', '#6b4430'],
  ['ponytail', '#c98a3e'],
  ['curly', '#2b2024'],
  ['swept', '#8f5a3c'],
  ['bun', '#d9b26a'],
  ['long', '#4a2d24'],
  ['buzz', '#2e2a2a'],
  ['twintails', '#a14c3c'],
];
FAMILIES.forEach((f, fi) => {
  for (let v = 0; v < 3; v++) {
    const [hair, hairColor] = HAIRS[(fi * 3 + v * 4) % HAIRS.length]!;
    PRESETS.push({
      id: `${f.key}_${v}`,
      skin: SKINS[(fi + v * 2) % SKINS.length]!,
      hair,
      hairColor,
      top: f.top,
      topColor: f.topColor,
      accent: f.accent,
      pants: f.pants,
      shoes: '#2a2230',
      acc: v === 2 && !f.acc ? ['glasses'] : (f.acc ?? []),
      carry: 'doc',
    });
  }
});
PRESETS.push(
  { id: 'director', skin: SKINS[0]!, hair: 'bob', hairColor: '#ff8fbf', top: 'blazer', topColor: '#6b3e8a', accent: '#f8e7ef', pants: '#2c2140', shoes: '#1f1828', acc: ['lanyard'], carry: 'doc' },
  { id: 'npc_cleaner', skin: SKINS[3]!, hair: 'short', hairColor: '#2b2024', top: 'overalls', topColor: '#3d6fb0', accent: '#f2d64b', pants: '#3d6fb0', shoes: '#2a2230', acc: ['cap'] },
  { id: 'npc_guard', skin: SKINS[2]!, hair: 'buzz', hairColor: '#2e2a2a', top: 'uniform', topColor: '#27304a', accent: '#d8b45a', pants: '#1e2438', shoes: '#141420', acc: ['cap'], carry: 'flashlight' },
  { id: 'npc_barista', skin: SKINS[1]!, hair: 'bun', hairColor: '#5a3426', top: 'apron', topColor: '#7a4b34', accent: '#f6efe6', pants: '#2d2a33', shoes: '#2a2230', acc: [], carry: 'tray' },
  { id: 'npc_courier', skin: SKINS[4]!, hair: 'short', hairColor: '#1e1a1a', top: 'puffer', topColor: '#b9d433', accent: '#2d3a1a', pants: '#2b2f3a', shoes: '#2a2230', acc: ['cap'], carry: 'doc' },
  { id: 'npc_visitor_a', skin: SKINS[0]!, hair: 'long', hairColor: '#c98a3e', top: 'coat', topColor: '#c7905a', accent: '#f3e3cf', pants: '#2f2a35', shoes: '#3a2a28', acc: ['scarf'], carry: 'mug' },
  { id: 'npc_visitor_b', skin: SKINS[2]!, hair: 'swept', hairColor: '#2b2024', top: 'coat', topColor: '#b8434a', accent: '#f2d9d3', pants: '#29283a', shoes: '#211b22', acc: [], carry: 'phone' },
  { id: 'npc_visitor_c', skin: SKINS[1]!, hair: 'curly', hairColor: '#6b4430', top: 'puffer', topColor: '#4b5a8f', accent: '#dfe6f7', pants: '#33313d', shoes: '#2a2230', acc: ['beanie'], carry: 'mug' },
  { id: 'npc_visitor_d', skin: SKINS[3]!, hair: 'ponytail', hairColor: '#2e2a2a', top: 'hoodie', topColor: '#d9b26a', accent: '#5a3d2a', pants: '#3a4a5a', shoes: '#2a2230', acc: [], carry: 'phone' },
  { id: 'npc_chef', skin: SKINS[2]!, hair: 'short', hairColor: '#2b2024', top: 'apron', topColor: '#eeeeea', accent: '#c94f45', pants: '#2f2f3a', shoes: '#2a2230', acc: ['cap'], carry: 'tray' },
  { id: 'npc_musician', skin: SKINS[4]!, hair: 'curly', hairColor: '#1e1a1a', top: 'cardigan', topColor: '#6a7f4a', accent: '#efe6c9', pants: '#3b3346', shoes: '#2a2230', acc: ['beanie', 'scarf'], carry: 'none' },
);

export const FAMILY_KEYS = FAMILIES.map((f) => f.key);

// ------------------------------------------------------------------ poses

type V = [number, number];
interface Pose {
  bob: number;
  sit: boolean;
  legs: [number, number];
  armL: V;
  armR: V;
  headDy: number;
  eyes: 'open' | 'closed' | 'happy' | 'wide';
  mouth: 'none' | 'smile' | 'open' | 'flat' | 'o';
  prop: Prop | 'carry';
  jump?: number;
}

const base: Pose = { bob: 0, sit: false, legs: [0, 0], armL: [-1, 7], armR: [1, 7], headDy: 0, eyes: 'open', mouth: 'smile', prop: 'none' };
const P = (o: Partial<Pose>): Pose => ({ ...base, ...o });

/** Animation name → frames. Durations live in the renderer. */
export const ANIMS: Record<string, Pose[]> = {
  idle: [P({}), P({ bob: 1 })],
  walk: [P({ legs: [-2, 1], armL: [1, 7], armR: [-1, 6] }), P({ bob: -1, legs: [0, 0] }), P({ legs: [1, -2], armL: [-1, 6], armR: [1, 7] }), P({ bob: -1, legs: [0, 0] })],
  carry: [P({ legs: [-2, 1], armL: [3, 4], armR: [-3, 4], prop: 'carry' }), P({ bob: -1, armL: [3, 4], armR: [-3, 4], prop: 'carry' }), P({ legs: [1, -2], armL: [3, 4], armR: [-3, 4], prop: 'carry' }), P({ bob: -1, armL: [3, 4], armR: [-3, 4], prop: 'carry' })],
  sit: [P({ sit: true, bob: 3, armL: [1, 6], armR: [-1, 6], mouth: 'flat' })],
  type: [P({ sit: true, bob: 3, armL: [3, 5], armR: [-3, 6], mouth: 'flat' }), P({ sit: true, bob: 3, armL: [3, 6], armR: [-3, 5], mouth: 'flat' })],
  read: [P({ sit: true, bob: 3, armL: [3, 4], armR: [-3, 4], prop: 'book', mouth: 'flat' }), P({ sit: true, bob: 3, armL: [3, 4], armR: [-3, 5], prop: 'book', mouth: 'flat', headDy: 1 })],
  think: [P({ sit: true, bob: 3, armL: [2, 5], armR: [-4, -2], mouth: 'flat' }), P({ sit: true, bob: 3, armL: [2, 5], armR: [-4, -2], mouth: 'o', headDy: -1 })],
  hand: [P({ sit: false, armR: [2, -10], armL: [-1, 7], mouth: 'open', eyes: 'wide' }), P({ armR: [4, -9], armL: [-1, 7], mouth: 'open', eyes: 'wide', bob: -1 })],
  error: [P({ sit: true, bob: 3, armL: [3, -6], armR: [-3, -6], mouth: 'o', eyes: 'wide' }), P({ sit: true, bob: 3, armL: [2, -7], armR: [-2, -7], mouth: 'o', eyes: 'wide', headDy: 1 })],
  joy: [P({ armL: [-4, -8], armR: [4, -8], eyes: 'happy', mouth: 'open' }), P({ bob: -3, legs: [-1, -1], armL: [-5, -9], armR: [5, -9], eyes: 'happy', mouth: 'open' })],
  sleep: [P({ sit: true, bob: 5, headDy: 3, armL: [4, 3], armR: [-4, 3], eyes: 'closed', mouth: 'none' }), P({ sit: true, bob: 5, headDy: 4, armL: [4, 3], armR: [-4, 3], eyes: 'closed', mouth: 'none' })],
  coffee: [P({ armR: [-2, 3], prop: 'mug', mouth: 'smile' }), P({ armR: [-2, 0], prop: 'mug', eyes: 'closed', mouth: 'none', bob: 1 })],
  phone: [P({ armR: [-1, -6], prop: 'phone', mouth: 'open' }), P({ armR: [-1, -6], prop: 'phone', mouth: 'smile', bob: 1 })],
  stretch: [P({ armL: [-3, -10], armR: [3, -10], eyes: 'closed', mouth: 'o', bob: -1 })],
  dance: [P({ armL: [-5, -4], armR: [3, 6], legs: [-1, 0], eyes: 'happy', mouth: 'open' }), P({ bob: -1, armL: [-3, 6], armR: [5, -4], legs: [0, -1], eyes: 'happy', mouth: 'open' })],
};

// ------------------------------------------------------------------ drawing helpers

function thick(img: Img, x0: number, y0: number, x1: number, y1: number, w: number, c: RGBA) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x0 + ((x1 - x0) * s) / steps);
    const y = Math.round(y0 + ((y1 - y0) * s) / steps);
    img.rect(x - Math.floor(w / 2), y, w, 1, c);
    if (w > 1) img.rect(x - Math.floor(w / 2), y + 1, w, 1, c);
  }
}

interface Ctx {
  pr: Preset;
  facing: Facing;
  pose: Pose;
  skin: RGBA;
  hair: RGBA;
  top: RGBA;
  accent: RGBA;
  pants: RGBA;
  shoes: RGBA;
  /** vertical offset of the upper body */
  oy: number;
}

function legs(img: Img, c: Ctx) {
  const { pose } = c;
  const hipY = 25 + (pose.sit ? 2 : 0) + (pose.jump ?? 0);
  const pants = c.pr.top === 'coat' ? shade(c.pants, -0.05) : c.pants;
  if (pose.sit) {
    // seated: short foreshortened thighs and feet peeking out
    img.rect(8, hipY, 4, 3, pants);
    img.rect(13, hipY, 4, 3, shade(pants, -0.12));
    img.rect(8, hipY + 3, 4, 2, c.shoes);
    img.rect(13, hipY + 3, 4, 2, shade(c.shoes, 0.1));
    return;
  }
  const bobY = Math.min(0, pose.bob);
  const [l, r] = pose.legs;
  const legL = 33 - hipY + l + bobY;
  const legR = 33 - hipY + r + bobY;
  img.rect(9, hipY + bobY, 3, Math.max(2, legL), pants);
  img.rect(13, hipY + bobY, 3, Math.max(2, legR), shade(pants, -0.12));
  img.rect(8, hipY + bobY + Math.max(2, legL) - 1, 4, 2, c.shoes);
  img.rect(13, hipY + bobY + Math.max(2, legR) - 1, 4, 2, shade(c.shoes, 0.12));
  img.px(8, hipY + bobY + Math.max(2, legL) - 1, shade(c.shoes, 0.35));
}

function torso(img: Img, c: Ctx) {
  const y = 17 + c.oy;
  const t = c.top;
  const dark = shade(t, -0.22);
  const light = shade(t, 0.2);
  const long = c.pr.top === 'coat';
  const h = long ? 12 : 9;
  img.rrect(7, y, 11, h, 2, t);
  // soft side shading for volume
  img.rect(16, y + 1, 2, h - 2, dark);
  img.rect(7, y + 1, 1, h - 3, light);
  const front = c.facing === 'front';
  const A = c.accent;
  switch (c.pr.top) {
    case 'hoodie':
      if (front) {
        img.rect(11, y, 3, 1, shade(t, -0.3));
        img.px(11, y + 1, A);
        img.px(13, y + 1, A);
        img.px(11, y + 2, A);
        img.px(13, y + 2, A);
        img.rect(9, y + 5, 7, 2, dark);
      } else img.rrect(9, y - 1, 7, 3, 1, dark);
      break;
    case 'sweater':
      img.rect(7, y + h - 2, 11, 1, dark);
      if (front) {
        img.rect(10, y, 5, 1, shade(t, -0.3));
        for (let i = 0; i < 3; i++) img.px(9 + i * 3, y + 4, light);
      }
      break;
    case 'shirt_tie':
      if (front) {
        img.px(11, y, A);
        img.px(13, y, A);
        img.rect(12, y + 1, 1, 5, c.accent);
        img.px(12, y + 6, shade(c.accent, -0.2));
        img.rect(12, y, 1, 1, shade(c.accent, 0.2));
      }
      break;
    case 'blazer':
      if (front) {
        img.rect(11, y, 3, 6, A);
        img.line(10, y, 12, y + 5, dark);
        img.line(14, y, 12, y + 5, dark);
        img.px(12, y + 6, shade(t, 0.3));
        img.px(12, y + 7, shade(t, 0.3));
      }
      break;
    case 'tshirt':
      if (front) {
        img.rect(10, y, 5, 1, shade(t, -0.25));
        img.rect(10, y + 3, 3, 2, A, 0.85);
      }
      break;
    case 'cardigan':
      if (front) {
        img.rect(11, y, 3, h, A);
        img.px(10, y + 3, shade(t, 0.35));
        img.px(10, y + 6, shade(t, 0.35));
      }
      break;
    case 'vest':
      if (front) {
        img.rect(11, y, 3, h, A);
        img.line(10, y, 12, y + 4, dark);
        img.line(14, y, 12, y + 4, dark);
        img.px(9, y + 4, shade(t, 0.35));
      } else img.rect(8, y + 1, 9, 1, dark);
      break;
    case 'turtleneck':
      img.rrect(9, y - 2, 7, 3, 1, shade(t, 0.1));
      if (front) img.px(15, y + 4, A);
      break;
    case 'overalls':
      img.rect(7, y, 11, h, shade(hex('#f0eadf'), -0.05));
      img.rect(9, y + 2, 7, h - 2, t);
      img.rect(9, y, 1, 3, t);
      img.rect(15, y, 1, 3, t);
      if (front) img.px(12, y + 4, A);
      break;
    case 'uniform':
      if (front) {
        for (let i = 0; i < 3; i++) img.px(12, y + 2 + i * 2, A);
        img.rect(14, y + 2, 2, 2, A);
        img.rect(10, y, 5, 1, shade(t, 0.25));
      }
      break;
    case 'apron':
      img.rect(7, y, 11, h, c.accent);
      img.rect(16, y + 1, 2, h - 2, shade(c.accent, -0.2));
      if (front) {
        img.rect(9, y + 2, 7, h - 2 + 2, t);
        img.rect(10, y, 1, 2, t);
        img.rect(14, y, 1, 2, t);
      } else img.rect(9, y + 4, 7, 1, t);
      break;
    case 'coat':
      if (front) {
        img.line(12, y, 12, y + h - 1, dark);
        img.px(11, y + 4, shade(t, 0.35));
        img.px(11, y + 7, shade(t, 0.35));
      }
      break;
    case 'puffer':
      for (let i = 2; i < h; i += 3) img.rect(7, y + i, 11, 1, dark);
      img.rect(9, y - 1, 7, 2, shade(t, 0.15));
      break;
  }
  if (c.pr.acc.includes('scarf')) {
    img.rrect(8, y - 1, 9, 3, 1, c.accent);
    if (front) img.rect(14, y + 1, 2, 4, shade(c.accent, -0.15));
  }
  if (c.pr.acc.includes('lanyard') && front) {
    img.line(10, y, 12, y + 4, hex('#ff8fbf'));
    img.line(14, y, 12, y + 4, hex('#ff8fbf'));
    img.rect(11, y + 5, 3, 3, hex('#f8f4ea'));
    img.px(12, y + 6, hex('#6b3e8a'));
  }
}

function arm(img: Img, c: Ctx, side: 'L' | 'R', front: boolean) {
  const sx = side === 'L' ? 8 : 16;
  const sy = 18 + c.oy;
  const [dx, dy] = side === 'L' ? c.pose.armL : c.pose.armR;
  const hx = sx + dx;
  const hy = sy + dy;
  const sleeveShort = c.pr.top === 'tshirt';
  const sleeve = side === 'R' ? shade(c.top, -0.12) : c.top;
  const mx = sx + dx * (sleeveShort ? 0.35 : 0.8);
  const my = sy + dy * (sleeveShort ? 0.35 : 0.8);
  if (!front && c.facing === 'back') {
    // seen from behind arms are mostly sleeves
  }
  thick(img, sx, sy, mx, my, 2, sleeve);
  if (sleeveShort) thick(img, mx, my, hx, hy, 2, c.skin);
  img.rect(Math.round(hx) - 1, Math.round(hy), 2, 2, c.facing === 'back' ? shade(c.skin, -0.08) : c.skin);
}

function head(img: Img, c: Ctx) {
  const cy = 10.5 + c.oy + c.pose.headDy;
  const sk = c.skin;
  img.ellipse(12.5, cy, 6.3, 5.9, sk);
  // jaw/cheek soft shadow on the right, highlight top-left
  img.ellipse(15.5, cy + 2, 2.6, 2.6, shade(sk, -0.12), 0.55);
  img.px(9, Math.round(cy) - 3, shade(sk, 0.3));
  // ears
  img.px(6, Math.round(cy) + 1, shade(sk, -0.1));
  img.px(18, Math.round(cy) + 1, shade(sk, -0.18));
  if (c.facing === 'back') return;
  const ey = Math.round(cy) + 0;
  const eyes = c.pose.eyes;
  for (const ex of [9, 14]) {
    if (eyes === 'closed') img.rect(ex, ey + 1, 2, 1, EYE);
    else if (eyes === 'happy') {
      img.px(ex, ey + 1, EYE);
      img.px(ex + 1, ey, EYE);
    } else {
      img.rect(ex, ey, 2, eyes === 'wide' ? 3 : 2, EYE);
      img.px(ex, ey, hex('#fdf6f2'));
    }
  }
  img.rect(8, ey + 3, 2, 1, BLUSH, 0.55);
  img.rect(15, ey + 3, 2, 1, BLUSH, 0.55);
  const my = ey + 4;
  const mouth = c.pose.mouth;
  const lip = hex('#a0444f');
  if (mouth === 'smile') {
    img.px(11, my, lip, 0.8);
    img.px(12, my + 1, lip);
    img.px(13, my, lip, 0.8);
  } else if (mouth === 'open') {
    img.rect(11, my, 3, 2, lip);
    img.px(12, my + 1, hex('#ff9aa8'));
  } else if (mouth === 'o') img.rect(12, my, 2, 2, lip);
  else if (mouth === 'flat') img.rect(12, my + 1, 2, 1, lip, 0.8);
}

function hairBack(img: Img, c: Ctx) {
  const cy = 10.5 + c.oy + c.pose.headDy;
  const h = c.hair;
  const d = shade(h, -0.25);
  const st = c.pr.hair;
  if (c.facing === 'front') {
    if (st === 'long') {
      img.rrect(5, Math.round(cy) - 2, 15, 15, 3, d);
    } else if (st === 'ponytail') img.rrect(17, Math.round(cy) - 1, 4, 9, 2, d);
    else if (st === 'twintails') {
      img.rrect(3, Math.round(cy), 4, 9, 2, d);
      img.rrect(18, Math.round(cy), 4, 9, 2, d);
    }
  }
}

function hairFront(img: Img, c: Ctx) {
  const cy = 10.5 + c.oy + c.pose.headDy;
  const y = Math.round(cy);
  const h = c.hair;
  const d = shade(h, -0.28);
  const l = shade(h, 0.32);
  const st = c.pr.hair;
  const back = c.facing === 'back';
  // Front-facing hair may cover the forehead and the sides of the head, never the face.
  if (!back) img.clip = (px, py) => py <= y - 2 || px <= 7 || px >= 18;
  const cap = (rx: number, ry: number, top: number) => img.ellipse(12.5, cy - top, rx, ry, h);
  switch (st) {
    case 'none':
      return;
    case 'buzz':
      img.ellipse(12.5, cy - 1.8, 6.4, 4.6, h, 0.9);
      if (!back) for (let x = 8; x <= 17; x++) img.erase(x, y + 1);
      if (!back) img.rect(7, y - 1, 11, 1, d, 0.5);
      break;
    case 'short':
      cap(6.8, 4.6, 2);
      for (const x of [8, 11, 14, 17]) img.px(x, y - 7, h);
      if (!back) {
        img.rect(7, y - 2, 4, 1, h);
        img.rect(13, y - 2, 4, 1, h);
        img.px(16, y - 1, h);
      }
      break;
    case 'bob':
    case 'long':
      cap(7.2, 5.4, 1.4);
      img.rect(5, y - 1, 3, back ? 8 : 6, h);
      img.rect(17, y - 1, 3, back ? 8 : 6, d);
      if (!back) {
        // fringe with a parting
        img.rect(7, y - 3, 11, 2, h);
        img.clip = undefined;
        img.px(8, y - 1, h);
        img.px(16, y - 1, d);
        img.px(12, y - 3, d);
      } else {
        img.rect(6, y - 1, 13, 6, h);
        if (st === 'long') img.rrect(6, y + 2, 13, 11, 3, h);
      }
      break;
    case 'swept':
      cap(7, 5, 1.6);
      if (!back) {
        img.poly([[6, y - 4], [18, y - 6], [18, y - 2], [9, y - 1]], h);
        img.rect(6, y - 2, 2, 4, h);
      } else img.rect(6, y - 1, 13, 5, h);
      break;
    case 'ponytail':
      cap(7, 5, 1.6);
      if (!back) img.rect(7, y - 3, 11, 2, h);
      else {
        img.rect(6, y - 1, 13, 4, h);
        img.rrect(10, y + 2, 5, 8, 2, h);
      }
      img.px(17, y - 3, l);
      break;
    case 'bun':
      cap(7, 5, 1.6);
      img.ellipse(12.5, cy - 7.5, 3, 2.6, h);
      img.px(11, y - 9, l);
      if (!back) img.rect(7, y - 3, 11, 2, h);
      else img.rect(6, y - 1, 13, 4, h);
      break;
    case 'curly':
      for (const [bx, by] of [[7, -3], [10, -6], [14, -6], [17, -3], [6, 1], [19, 1], [12, -7]] as V[]) img.ellipse(bx + 0.5, cy + by, 3, 3, h);
      if (!back) img.rect(8, y - 3, 9, 2, h);
      else img.ellipse(12.5, cy, 7, 5.5, h);
      img.px(9, y - 7, l);
      img.px(14, y - 8, l);
      break;
    case 'twintails':
      cap(7, 5, 1.6);
      if (!back) img.rect(7, y - 3, 11, 2, h);
      else {
        img.rect(6, y - 1, 13, 4, h);
        img.rrect(3, y, 4, 9, 2, h);
        img.rrect(18, y, 4, 9, 2, h);
      }
      img.px(4, y + 1, l);
      break;
  }
  img.clip = undefined;
  // shine streak
  if (st !== 'buzz') {
    img.px(9, y - 5, l);
    img.px(10, y - 5, l, 0.7);
    img.px(10, y - 6, l, 0.5);
  }
}

function accessories(img: Img, c: Ctx) {
  const cy = 10.5 + c.oy + c.pose.headDy;
  const y = Math.round(cy);
  for (const a of c.pr.acc) {
    if (a === 'glasses' && c.facing === 'front') {
      const fr = hex('#2a2235');
      img.rect(8, y - 1, 4, 1, fr);
      img.rect(13, y - 1, 4, 1, fr);
      img.px(8, y, fr);
      img.px(11, y, fr);
      img.px(13, y, fr);
      img.px(16, y, fr);
      img.px(12, y - 1, fr);
      img.px(9, y, hex('#e8f6ff'), 0.6);
    }
    if (a === 'headphones') {
      const hp = hex('#e7e4ef');
      img.line(6, y - 2, 9, y - 6, hp);
      img.line(9, y - 6, 16, y - 6, hp);
      img.line(16, y - 6, 19, y - 2, hp);
      img.rrect(4, y - 1, 3, 4, 1, c.accent);
      img.rrect(18, y - 1, 3, 4, 1, shade(c.accent, -0.2));
    }
    if (a === 'cap') {
      const cc = c.pr.id === 'npc_guard' ? hex('#1e2438') : c.pr.id === 'npc_chef' ? hex('#f4f4f0') : shade(c.top, -0.05);
      img.ellipse(12.5, cy - 3.2, 6.6, 3.6, cc);
      if (c.facing === 'front') img.rect(8, y - 3, 10, 2, shade(cc, -0.2));
      if (c.pr.id === 'npc_guard') img.px(12, y - 5, hex('#d8b45a'));
    }
    if (a === 'beanie') {
      const bc = hex('#c9564a');
      img.ellipse(12.5, cy - 3, 6.8, 4.5, bc);
      img.rect(6, y - 3, 13, 2, shade(bc, -0.2));
      img.px(12, y - 8, hex('#f2e6d8'));
      img.px(13, y - 8, hex('#f2e6d8'));
    }
  }
}

function prop(img: Img, c: Ctx) {
  let p = c.pose.prop;
  if (p === 'carry') p = c.pr.carry ?? 'doc';
  if (p === 'none') return;
  const hx = Math.round(16 + c.pose.armR[0]);
  const hy = Math.round(18 + c.oy + c.pose.armR[1]);
  const front = c.facing === 'front';
  switch (p) {
    case 'book': {
      const bx = 9;
      const by = 20 + c.oy;
      img.rect(bx, by, 7, 5, hex('#c0523f'));
      img.rect(bx + 1, by, 5, 4, hex('#f6efe1'));
      img.rect(bx + 3, by, 1, 5, hex('#8a3a2c'));
      if (!front) img.rect(bx, by, 7, 5, hex('#c0523f'));
      break;
    }
    case 'doc':
      img.rect(9, 20 + c.oy, 7, 6, hex('#fbf7ec'));
      img.rect(10, 22 + c.oy, 5, 1, hex('#9aa3c4'));
      img.rect(10, 24 + c.oy, 3, 1, hex('#9aa3c4'));
      img.px(15, 20 + c.oy, hex('#e86a6a'));
      break;
    case 'mug':
      img.rect(hx - 2, hy - 2, 3, 3, hex('#f3e9dc'));
      img.px(hx + 1, hy - 1, hex('#f3e9dc'));
      img.px(hx - 1, hy - 3, hex('#ffffff'), 0.4);
      break;
    case 'phone':
      img.rect(hx - 1, hy - 1, 2, 3, hex('#2b2f45'));
      img.px(hx - 1, hy - 1, hex('#8fe3ff'));
      break;
    case 'flashlight':
      img.rect(hx - 1, hy - 1, 4, 2, hex('#3c3c48'));
      img.px(hx + 3, hy - 1, hex('#fff6c2'));
      img.px(hx + 3, hy, hex('#fff6c2'));
      break;
    case 'tray':
      img.rect(7, 21 + c.oy, 11, 1, hex('#8f6a4a'));
      img.rect(9, 18 + c.oy, 3, 3, hex('#f3e9dc'));
      img.rect(13, 19 + c.oy, 3, 2, hex('#d38b5d'));
      break;
  }
}

/** Renders one frame of a preset. */
export function drawCharacter(pr: Preset, facing: Facing, pose: Pose): Img {
  const img = new Img(CHAR_W, CHAR_H);
  const c: Ctx = {
    pr,
    facing,
    pose,
    skin: hex(pr.skin),
    hair: hex(pr.hairColor),
    top: hex(pr.topColor),
    accent: hex(pr.accent),
    pants: hex(pr.pants),
    shoes: hex(pr.shoes),
    oy: pose.bob,
  };
  if (facing === 'front') {
    hairBack(img, c);
    arm(img, c, 'L', false);
    legs(img, c);
    torso(img, c);
    arm(img, c, 'R', true);
    if (pose.armL[1] < 2) arm(img, c, 'L', true);
    head(img, c);
    hairFront(img, c);
    accessories(img, c);
    if (pose.armR[1] < 0) arm(img, c, 'R', true);
    prop(img, c);
    if (pose.prop === 'book' || pose.prop === 'carry') {
      // hands hold the item in front
      arm(img, c, 'L', true);
      arm(img, c, 'R', true);
    }
  } else {
    if (pose.prop === 'book' || pose.prop === 'carry') prop(img, c);
    legs(img, c);
    torso(img, c);
    head(img, c);
    hairFront(img, c);
    accessories(img, c);
    arm(img, c, 'L', true);
    arm(img, c, 'R', true);
    if (pose.prop !== 'book' && pose.prop !== 'carry') prop(img, c);
  }
  img.outline(0.62, 150);
  return img;
}

/** Office mascot: an original round yellow critter ("Бублик") with ear tufts. */
export function drawMascot(frame: number): Img {
  const img = new Img(16, 16);
  const y = frame === 1 ? 1 : 0;
  const body = hex('#ffd34d');
  img.ellipse(8, 9 + y, 6, 5.5, body);
  img.ellipse(10, 11 + y, 3.5, 2.5, shade(body, -0.15), 0.6);
  img.poly([[3, 6 + y], [4, 2 + y], [6, 5 + y]], body);
  img.poly([[13, 6 + y], [12, 2 + y], [10, 5 + y]], body);
  img.px(4, 3 + y, hex('#ff9f43'));
  img.px(12, 3 + y, hex('#ff9f43'));
  img.rect(6, 8 + y, 1, 2, EYE);
  img.rect(10, 8 + y, 1, 2, EYE);
  img.px(8, 10 + y, hex('#e0773a'));
  img.rect(4, 10 + y, 2, 1, BLUSH, 0.6);
  img.rect(11, 10 + y, 2, 1, BLUSH, 0.6);
  img.ellipse(8, 14.5, 4, 1, hex('#e0a63b'));
  img.outline(0.55);
  return img;
}

export function mixSkin(a: string, b: string, t: number) {
  return mix(hex(a), hex(b), t);
}
