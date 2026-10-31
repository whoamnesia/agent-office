/**
 * The Moscow City block around the office (78×54 tiles). Rows from back (y=0) to front:
 * MCC rail · building lots · sidewalk · plaza | park | parking · sidewalk · tram + road · promenade · river.
 */
import { Grid, type Pt } from './grid.js';
import type { Facing, Item, Spot } from './office-layout.js';
import { FLOOR_D, FLOOR_W } from './office-layout.js';

export const CITY_W = 78;
export const CITY_H = 54;

export const ROWS = {
  rail: 0,
  lotsY: 4,
  sidewalkN: 20,
  plaza: [22, 29] as [number, number],
  sidewalkN2: 30,
  tram: 32,
  laneW: 34,
  laneE: 36,
  promenade: [38, 44] as [number, number],
  granite: 45,
  river: 46,
  boatE: 48,
  boatW: 51,
};

export const LOTS: Pt[] = [
  [3, 4],
  [29, 4],
  [55, 4],
];
export const CROSSWALK_X: [number, number] = [23, 24];

export interface ParkingSpot {
  id: string;
  /** car footprint origin (1 wide along x, 2 deep along y) */
  x: number;
  y: number;
  /** the aisle cell in front of the spot */
  aisle: Pt;
}

export interface CityPlan {
  w: number;
  h: number;
  tileAt: (x: number, y: number) => string;
  items: Item[];
  grid: Grid;
  pois: {
    entrance: Pt[];
    metro: Spot;
    busStop: Spot[];
    tramStop: Spot[];
    cafe: { counter: Spot; queue: Spot[]; tables: Spot[] };
    foodTruck: { counter: Spot; queue: Spot[] };
    flowers: Spot;
    musician: Spot;
    benches: Spot[];
    fountain: Spot[];
    plaza: Pt[];
    park: Pt[];
    promenade: Pt[];
    pigeons: Pt[];
    dogLoop: Pt[];
    guardLoop: Pt[];
  };
  parking: ParkingSpot[];
  /** world x where cars wait at the crosswalk, per lane direction */
  stopLine: { w: number; e: number };
  /** driveway from lane E into the parking aisle */
  driveway: Pt[];
  decorTowers: { x: number; y: number; kind: number }[];
}

export function buildCityPlan(): CityPlan {
  const W = CITY_W;
  const H = CITY_H;
  const items: Item[] = [];
  const grid = new Grid(W, H);
  let n = 0;
  const add = (sprite: string, x: number, y: number, w: number, d: number, extra: Partial<Item> = {}) => {
    const it: Item = { id: `${sprite}@${n++}`, sprite, x, y, w, d, ...extra };
    items.push(it);
    if (it.block) grid.block(x, y, w, d);
    return it;
  };
  const inLot = (x: number, y: number) => LOTS.some(([lx, ly]) => x >= lx && x < lx + FLOOR_W && y >= ly && y < ly + FLOOR_D);

  const tileAt = (x: number, y: number): string => {
    const cx = Math.max(-1, Math.min(W, x));
    if (y >= ROWS.river) return `water_${(x + y * 3) & 3}`;
    if (y === ROWS.granite) return 'granite';
    if (y >= ROWS.promenade[0]) return (x + y) % 9 === 0 ? 'paving_1' : 'paving_0';
    if (y === ROWS.tram) return x >= CROSSWALK_X[0] && x <= CROSSWALK_X[1] ? 'crosswalk' : 'rail';
    if (y > ROWS.tram && y < ROWS.promenade[0]) {
      if (x >= CROSSWALK_X[0] && x <= CROSSWALK_X[1]) return 'crosswalk';
      if (y === 35) return 'asphalt_dash_x';
      if (y === 33) return 'asphalt_line_x';
      return 'asphalt';
    }
    if (y === ROWS.sidewalkN2 || y === ROWS.sidewalkN2 + 1) return 'paving_0';
    if (y >= ROWS.plaza[0] && y <= ROWS.plaza[1]) {
      if (cx <= 24) return (x * 3 + y) % 11 === 0 ? 'paving_1' : 'paving_0';
      if (cx <= 48) {
        if (y === 25 || x === 36) return 'sand';
        return `grass_${(x * 7 + y * 13) % 3}`;
      }
      if (x >= 60 && x <= 61) return 'asphalt';
      if (y === 22 || y === 23 || y === 27 || y === 28) return 'parking';
      return 'asphalt';
    }
    if (y === ROWS.sidewalkN || y === ROWS.sidewalkN + 1) return x >= 60 && x <= 61 ? 'asphalt' : 'paving_0';
    if (y >= 2 && y < ROWS.sidewalkN) return inLot(x, y) ? 'paving_1' : y < 4 ? 'paving_1' : `grass_${(x + y) % 3}`;
    if (y >= 0 && y < 2) return 'rail';
    return 'paving_1';
  };

  // ---- navigation: water, rails, road (except the crosswalk) and lots are not walkable
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = tileAt(x, y);
      if (t.startsWith('water') || t === 'granite' || t === 'rail' || t.startsWith('asphalt') || inLot(x, y)) grid.block(x, y);
    }
  // the parking aisle and driveway are walkable for people heading to their cars
  for (let y = 22; y <= 29; y++) for (let x = 49; x < W; x++) grid.unblock(x, y);
  for (let y = 20; y <= 31; y++) for (const x of [60, 61]) grid.unblock(x, y);

  // ---- props
  const tree = (x: number, y: number, k: number) => add(['tree_birch', 'tree_maple', 'tree_linden', 'tree_oak', 'tree_pine', 'tree_bare'][k % 6]!, x, y, 1, 1, { block: true });
  // alleys between towers
  for (const ax of [23.5, 49.5]) {
    for (let y = 5; y < 19; y += 3) tree(ax + ((y / 3) % 2 ? 0 : 3), y, Math.floor(ax + y));
    add('bench_y', ax + 1.6, 15, 1, 2, { block: true });
  }
  tree(0.5, 6, 2);
  tree(0.6, 12, 1);
  tree(76.5, 7, 3);
  tree(76.5, 14, 0);
  // HQ plaza
  add('bike_rack', 6, 22.6, 2, 0.6, { block: true });
  add('scooter_green', 9.2, 22.7, 0.8, 0.4);
  add('scooter_purple', 10.4, 23.1, 0.8, 0.4);
  add('scooter_green', 11.5, 22.6, 0.8, 0.4);
  add('bench', 3, 27, 2, 1, { block: true });
  add('bench', 15, 27, 2, 1, { block: true });
  add('planter', 7, 26, 2, 0.8, { block: true });
  add('planter', 18, 24, 2, 0.8, { block: true });
  add('billboard', 1, 22.2, 3, 0.3, { block: true, light: { color: 0xff9fd0, radius: 70, z: 60, dx: 1.5, night: true } });
  tree(21, 27, 1);
  tree(13, 24, 3);
  add('trash', 5.2, 28.4, 0.5, 0.5);
  // park with fountain
  add('fountain_0', 34.5, 23.5, 3, 3, { block: true, tag: 'fountain', light: { color: 0x9fe6ff, radius: 60, z: 6, dx: 1.5, dy: 1.5, night: true } });
  add('bench_y', 31.2, 23, 1, 2, { block: true });
  add('bench_y', 39.8, 23, 1, 2, { block: true });
  add('bench', 29, 27.6, 2, 1, { block: true });
  add('bench', 42, 27.6, 2, 1, { block: true });
  for (const [x, y, k] of [[26, 22, 0], [27.5, 28, 1], [32, 27, 2], [44, 22, 1], [46.5, 26, 3], [41, 28.4, 0], [28, 23, 4], [47, 23, 5]] as [number, number, number][]) tree(x, y, k);
  add('bush', 30, 22, 1, 1, { block: true });
  add('bush_red', 43, 25.6, 1, 1, { block: true });
  add('trash', 38.4, 28.6, 0.5, 0.5);
  // parking: perpendicular spots in two rows
  const parking: ParkingSpot[] = [];
  for (let x = 50; x < 76; x += 2) {
    if (x === 60) continue;
    parking.push({ id: `pa${x}`, x: x + 0.05, y: 22, aisle: [x + 0.5, 25.5] });
    parking.push({ id: `pb${x}`, x: x + 0.05, y: 27.9, aisle: [x + 0.5, 25.5] });
  }
  // sidewalks: lamps and trees
  for (let x = 2; x < W; x += 7) {
    add('lamppost', x, 30.2, 0.6, 0.6, { block: true, light: { color: 0xffcf8a, radius: 66, z: 58, dx: -0.2, dy: -0.2, night: true } });
    add('lamppost', x + 3, 44.2, 0.6, 0.6, { block: true, light: { color: 0xffcf8a, radius: 66, z: 58, dx: -0.2, dy: -0.2, night: true } });
  }
  add('traffic_red', 22.2, 31.2, 0.5, 0.5, { tag: 'traffic' });
  add('traffic_red', 25.4, 38.1, 0.5, 0.5, { tag: 'traffic' });
  add('hydrant', 27, 20.4, 0.4, 0.4);
  // promenade
  add('metro', 3, 39, 3, 2, { block: true, light: { color: 0xff6a5a, radius: 60, z: 46, dx: 1.5, dy: 1, night: true } });
  add('flower_stall', 14, 39, 2, 1.2, { block: true });
  add('cafe', 26, 38, 6, 4, { block: true, light: { color: 0xffc27a, radius: 120, z: 20, dx: 3, dy: 4.2, night: true } });
  add('cafe_table', 33, 39, 1, 1, { block: true });
  add('cafe_table', 34.6, 40.8, 1, 1, { block: true });
  add('cafe_table', 24, 40.4, 1, 1, { block: true });
  add('bus_stop', 36, 38, 3, 1, { block: true });
  add('food_truck', 40, 40.4, 3, 1.4, { block: true, light: { color: 0xffd59a, radius: 70, z: 18, dx: 1.4, dy: 1.6, night: true } });
  add('billboard', 47, 38.2, 3, 0.3, { block: true, light: { color: 0x9fd0ff, radius: 70, z: 60, dx: 1.5, night: true } });
  for (const x of [8, 18, 52, 60, 68]) add('bench', x, 43.2, 2, 1, { block: true });
  for (const [x, k] of [[11, 2], [22, 1], [45, 0], [57, 3], [64, 1], [72, 2]] as [number, number][]) tree(x, 39.2, k);
  add('trash', 20.4, 39, 0.5, 0.5);
  add('planter', 65, 39.2, 2, 0.8, { block: true });
  // seasonal (shown only when the renderer's season says so)
  for (const [x, y, s] of [[22.6, 13.4, 'pumpkin_big'], [23.2, 10.2, 'pumpkin'], [25.4, 42.6, 'jack_o_lantern'], [32.6, 42.4, 'pumpkin'], [43.6, 41.8, 'jack_o_lantern']] as [number, number, string][])
    add(s, x, y, 0.6, 0.6, { tag: 'halloween', ...(s === 'jack_o_lantern' ? { light: { color: 0xffa040, radius: 30, z: 6, night: true, flicker: true } } : {}) });

  const S = (x: number, y: number, facing: Facing): Spot => ({ pos: [x, y], facing });
  return {
    w: W,
    h: H,
    tileAt,
    items,
    grid,
    pois: {
      entrance: LOTS.map(([lx, ly]) => [lx + FLOOR_W + 0.5, ly + FLOOR_D / 2] as Pt),
      metro: S(4.5, 41.4, 'ne'),
      busStop: [S(36.6, 38.6, 'ne'), S(37.6, 38.6, 'ne'), S(38.4, 39.4, 'ne')],
      tramStop: [S(30.5, 31.4, 'sw'), S(31.5, 31.4, 'sw')],
      cafe: { counter: S(28.5, 42.5, 'ne'), queue: [S(29.5, 42.6, 'nw'), S(30.5, 42.6, 'nw'), S(31.5, 42.7, 'nw'), S(32.5, 42.7, 'nw')], tables: [S(33.2, 40.3, 'ne'), S(34.2, 39.6, 'nw'), S(34.6, 42.1, 'ne'), S(24.4, 41.6, 'ne')] },
      foodTruck: { counter: S(41.2, 42.4, 'ne'), queue: [S(42.2, 42.5, 'nw'), S(43.2, 42.5, 'nw'), S(44.2, 42.6, 'nw')] },
      flowers: S(15, 40.7, 'ne'),
      musician: S(20.5, 42.8, 'sw'),
      benches: [S(9, 43.6, 'sw'), S(19, 43.6, 'sw'), S(53, 43.6, 'sw'), S(61, 43.6, 'sw'), S(4, 27.4, 'sw'), S(16, 27.4, 'sw'), S(30, 28, 'sw'), S(43, 28, 'sw'), S(31.6, 24, 'se'), S(40.2, 24, 'nw')],
      fountain: [S(34, 27.2, 'ne'), S(38.2, 25, 'nw'), S(36, 22.8, 'sw'), S(33.6, 24.6, 'se')],
      plaza: [[4, 24.5], [10, 25.5], [14, 28.5], [19, 22.5], [2, 29.5]],
      park: [[27, 25.5], [33, 25.5], [36.5, 29], [41, 25.5], [46, 25.5], [36.5, 22.3]],
      promenade: [[7, 42], [17, 41.5], [24, 43], [38, 43.5], [50, 41], [58, 42.5], [70, 41.5], [76, 43]],
      pigeons: [[10, 25], [36.5, 28.6], [21, 42], [33, 43.4]],
      dogLoop: [[26, 25.5], [36.5, 29.3], [47.5, 25.5], [36.5, 22.4]],
      guardLoop: [[23.5, 13], [23.5, 21], [12, 21], [12, 29], [23.5, 29], [23.5, 21]],
    },
    parking,
    stopLine: { w: CROSSWALK_X[1] + 1.4, e: CROSSWALK_X[0] - 2.4 },
    driveway: [
      [60.5, 36.5],
      [60.5, 31],
      [60.5, 25.5],
    ],
    decorTowers: [
      { x: -12, y: -14, kind: 0 },
      { x: 4, y: -13, kind: 2 },
      { x: 17, y: -16, kind: 1 },
      { x: 33, y: -13, kind: 4 },
      { x: 47, y: -15, kind: 3 },
      { x: 62, y: -13, kind: 0 },
      { x: 78, y: -12, kind: 2 },
    ],
  };
}
