/** Floor and ground tiles: 32×16 diamonds anchored at their back corner (16, 0). */
import { hex, Img, mix, noise2, shade, type RGBA } from './raster.js';

export interface Tile {
  name: string;
  img: Img;
}

type Fill = (u: number, v: number, px: number, py: number) => RGBA | undefined;

/** u,v are tile-local coordinates in 0..1 along world x and y. */
function tile(fill: Fill, h = 16, thickness = 0, side?: RGBA): Img {
  const img = new Img(32, h + thickness);
  img.poly([[16, 0], [32, 8], [16, 16], [0, 8]], (px, py) => {
    const rx = px + 0.5 - 16;
    const ry = py + 0.5;
    const u = (rx / 16 + ry / 8) / 2;
    const v = (ry / 8 - rx / 16) / 2;
    return fill(Math.max(0, Math.min(0.999, u)), Math.max(0, Math.min(0.999, v)), px, py);
  });
  if (thickness && side) {
    img.poly([[0, 8], [16, 16], [16, 16 + thickness], [0, 8 + thickness]], shade(side, -0.1));
    img.poly([[16, 16], [32, 8], [32, 8 + thickness], [16, 16 + thickness]], shade(side, -0.3));
  }
  return img;
}

const n = (px: number, py: number, s: number, amp: number) => (noise2(px, py, s) - 0.5) * amp;

export function makeTiles(): Tile[] {
  const out: Tile[] = [];
  const add = (name: string, img: Img) => out.push({ name, img });

  // Office wood floor: 4 planks per tile with staggered seams.
  for (let k = 0; k < 2; k++) {
    const base = hex(k ? '#c08b5c' : '#b98457');
    add(`floor_wood_${k}`, tile((u, v, px, py) => {
      const plank = Math.floor(v * 4);
      const seam = (u + plank * 0.37 + k * 0.5) % 1;
      let c = shade(base, ((plank * 37) % 5) * 0.025 - 0.04 + n(px, py, 3 + k, 0.06));
      if (v * 4 - plank < 0.12) c = shade(c, -0.22);
      if (seam < 0.04) c = shade(c, -0.18);
      if (noise2(Math.floor(u * 12), plank, 7) > 0.8 && (u * 40) % 3 < 1) c = shade(c, -0.06);
      return c;
    }));
  }
  // Department carpets: soft fibre noise and a faint border.
  const carpets: Record<string, string> = {
    frontend: '#c9958b',
    backend: '#8191b3',
    qa: '#93b08a',
    devops: '#737a8e',
    docs: '#d6c5a3',
    research: '#9b84a9',
    security: '#6d6880',
    general: '#c7b291',
    director: '#b46f86',
    lounge: '#a9876f',
  };
  for (const [k, col] of Object.entries(carpets)) {
    const base = hex(col);
    add(`floor_carpet_${k}`, tile((u, v, px, py) => {
      let c = shade(base, n(px, py, 11, 0.09));
      if ((px + py * 2) % 7 === 0) c = shade(c, 0.05);
      return c;
    }));
  }
  add('floor_kitchen', tile((u, v, px, py) => {
    const check = (Math.floor(u * 2) + Math.floor(v * 2)) % 2;
    const c = check ? hex('#ece3d3') : hex('#d4c6b0');
    const grout = u * 2 % 1 < 0.06 || v * 2 % 1 < 0.06;
    return grout ? hex('#b5a58f') : shade(c, n(px, py, 5, 0.04));
  }));
  add('floor_server', tile((u, v, px, py) => {
    const grout = u * 2 % 1 < 0.05 || v * 2 % 1 < 0.05;
    let c = grout ? hex('#3f4152') : shade(hex('#5d6074'), n(px, py, 9, 0.05));
    if (!grout && (u * 8) % 1 < 0.3 && (v * 2) % 1 > 0.3 && (v * 2) % 1 < 0.7 && Math.floor(u * 2) % 2 === 0) c = hex('#4a4c5e');
    return c;
  }));
  add('floor_marble', tile((u, v, px, py) => {
    const vein = Math.abs(Math.sin(u * 9 + v * 4 + noise2(Math.floor(u * 8), Math.floor(v * 8), 2) * 2)) < 0.05;
    const c = shade(hex('#ece6dd'), n(px, py, 13, 0.04));
    return vein ? shade(c, -0.12) : c;
  }));

  // ---- outdoor ground
  const grassCols = ['#7aa35a', '#86a95c', '#93aa58'];
  grassCols.forEach((g, k) =>
    add(`grass_${k}`, tile((u, v, px, py) => {
      let c = shade(hex(g), n(px, py, 21 + k, 0.12));
      const r = noise2(px, py, 40 + k);
      if (r > 0.93) c = shade(c, 0.22);
      else if (r < 0.05) c = shade(c, -0.2);
      // autumn: a few fallen leaves
      if (noise2(px >> 1, py >> 1, 77 + k) > 0.975) c = noise2(px, py, 5) > 0.5 ? hex('#e3a03d') : hex('#c9643a');
      return c;
    })),
  );
  add('paving_0', tile((u, v, px, py) => {
    const bu = Math.floor(u * 4);
    const bv = Math.floor(v * 2 + (bu % 2) * 0.5);
    const edge = (u * 4) % 1 < 0.1 || (v * 2 + (bu % 2) * 0.5) % 1 < 0.08;
    const tone = noise2(bu, bv, 3) * 0.08 - 0.04;
    return edge ? hex('#9c8f84') : shade(hex('#c9bcae'), tone + n(px, py, 8, 0.04));
  }));
  add('paving_1', tile((u, v, px, py) => {
    const edge = (u * 2) % 1 < 0.06 || (v * 2) % 1 < 0.06;
    return edge ? hex('#8f8691') : shade(hex('#b4aeb7'), n(px, py, 18, 0.05) + noise2(Math.floor(u * 2), Math.floor(v * 2), 4) * 0.06);
  }));
  const asph = hex('#4b4a57');
  add('asphalt', tile((u, v, px, py) => shade(asph, n(px, py, 31, 0.1) + (noise2(px, py, 32) > 0.97 ? 0.12 : 0))));
  add('asphalt_dash_x', tile((u, v, px, py) => (Math.abs(v - 0.5) < 0.05 && u % 0.5 < 0.3 ? hex('#e9e2cf') : shade(asph, n(px, py, 31, 0.1)))));
  add('asphalt_line_x', tile((u, v, px, py) => (Math.abs(v - 0.06) < 0.045 ? hex('#e8c75a') : shade(asph, n(px, py, 31, 0.1)))));
  add('crosswalk', tile((u, v, px, py) => ((u * 6) % 1 < 0.5 ? hex('#ece6d6') : shade(asph, n(px, py, 31, 0.1)))));
  add('parking', tile((u, v, px, py) => (u < 0.05 ? hex('#e6e0cf') : shade(hex('#55545f'), n(px, py, 33, 0.1)))));
  add('rail', tile((u, v, px, py) => {
    const sleeper = (u * 4) % 1 < 0.35;
    if (Math.abs(v - 0.3) < 0.04 || Math.abs(v - 0.7) < 0.04) return hex('#b9bccb');
    return sleeper && v > 0.18 && v < 0.82 ? hex('#6b5446') : shade(hex('#8a8279'), n(px, py, 34, 0.14));
  }));
  add('granite', tile((u, v, px, py) => shade(hex('#a4979b'), n(px, py, 35, 0.12) + ((u * 2) % 1 < 0.04 ? -0.15 : 0)), 16, 6, hex('#8d8086')));
  add('curb', tile((u, v, px, py) => shade(hex('#bdb4b1'), n(px, py, 36, 0.06)), 16, 3, hex('#9a9090')));
  add('sand', tile((u, v, px, py) => shade(hex('#d6bf95'), n(px, py, 37, 0.1))));
  // Water: four frames of drifting highlights.
  for (let f = 0; f < 4; f++) {
    add(`water_${f}`, tile((u, v, px, py) => {
      const deep = mix(hex('#3f6f8c'), hex('#355f7c'), noise2(px >> 2, py >> 1, 50) * 0.5);
      const wave = Math.sin((u * 3 + v * 1.5) * Math.PI * 2 + f * (Math.PI / 2)) + noise2(px, py, 51 + f) * 0.6;
      if (wave > 1.35) return hex('#9fd0e0');
      if (wave > 1.1) return shade(deep, 0.25);
      return shade(deep, n(px, py, 52, 0.05));
    }));
  }
  return out;
}
