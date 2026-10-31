/**
 * Office storey plan (20×16 tiles, local coordinates). Shared by every floor of every building.
 * Back walls run along y=0 (x-walls) and x=0 (y-walls); the front edges are open (dollhouse cut).
 */
import type { DepartmentName } from '@agent-office/protocol';
import { Grid, type Pt } from './grid.js';

export const FLOOR_W = 20;
export const FLOOR_D = 16;

export type Facing = 'se' | 'sw' | 'ne' | 'nw';

export interface Item {
  id: string;
  sprite: string;
  x: number;
  y: number;
  w: number;
  d: number;
  /** blocks walking on the covered cells */
  block?: boolean;
  /** extra draw-order bias (chairs in front/behind seated workers, wall decor) */
  bias?: number;
  /** wall-mounted / floor-flat objects get special ordering */
  layer?: 'floor' | 'wall' | 'normal';
  /** light emitted by the item (renderer) */
  light?: { color: number; radius: number; z: number; dx?: number; dy?: number; flicker?: boolean; night?: boolean };
  tag?: string;
}

export interface Desk {
  id: string;
  dept: DepartmentName | 'director' | 'devops_terminal';
  /** desk sprite position (footprint origin) */
  x: number;
  y: number;
  sprite: 'desk_a' | 'desk_b' | 'desk_director' | 'terminal';
  /** where the worker sits/stands */
  seat: Pt;
  facing: Facing;
  /** desk_a has a visible screen overlay */
  screen: boolean;
  chair?: string;
  decor: string[];
}

export interface Spot {
  pos: Pt;
  facing: Facing;
}

export interface FloorPlan {
  w: number;
  d: number;
  tiles: string[][];
  walls: { sprite: string; x: number; y: number; axis: 'x' | 'y' }[];
  glass: { sprite: string; x: number; y: number; axis: 'x' | 'y' }[];
  items: Item[];
  desks: Desk[];
  spots: {
    elevator: Spot;
    outbox: Spot;
    server: Spot[];
    analytics: Spot[];
    meeting: Spot[];
    coffee: Spot;
    cooler: Spot;
    fridge: Spot;
    printer: Spot;
    sofa: Spot[];
    foosball: Spot[];
    aquarium: Spot;
    window: Spot[];
    lounge: Spot[];
  };
  kanban: { x: number; y: number; w: number };
  dashboard: { x: number; y: number; w: number };
  grid: Grid;
}

const DECOR = ['deco_mug', 'deco_plush', 'deco_papers', 'deco_frame', 'deco_succulent', 'deco_duck', 'deco_sticky', 'deco_mug_red', 'deco_plush_bear'];

export function buildFloorPlan(): FloorPlan {
  const W = FLOOR_W;
  const D = FLOOR_D;
  const tiles: string[][] = Array.from({ length: D }, (_, y) => Array.from({ length: W }, (_, x) => ((x * 7 + y * 3) % 5 === 0 ? 'floor_wood_1' : 'floor_wood_0')));
  const area = (x0: number, y0: number, x1: number, y1: number, t: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[y]![x] = t;
  };
  area(0, 0, 4, 3, 'floor_carpet_director');
  area(5, 0, 10, 3, 'floor_carpet_general');
  area(11, 0, 15, 3, 'floor_kitchen');
  area(16, 0, 19, 3, 'floor_server');
  area(0, 11, 4, 15, 'floor_carpet_research');
  area(15, 11, 19, 15, 'floor_carpet_lounge');
  area(6, 5, 7, 12, 'floor_carpet_frontend');
  area(8, 5, 9, 12, 'floor_carpet_backend');
  area(10, 5, 11, 8, 'floor_carpet_qa');
  area(10, 9, 11, 12, 'floor_carpet_security');
  area(12, 5, 13, 8, 'floor_carpet_docs');
  area(12, 9, 13, 12, 'floor_carpet_general');

  const grid = new Grid(W, D);
  const items: Item[] = [];
  const walls: FloorPlan['walls'] = [];
  const glass: FloorPlan['glass'] = [];
  let n = 0;
  const add = (sprite: string, x: number, y: number, w: number, d: number, extra: Partial<Item> = {}) => {
    const it: Item = { id: `${sprite}#${n++}`, sprite, x, y, w, d, ...extra };
    items.push(it);
    if (it.block) grid.block(x, y, w, d);
    return it;
  };

  // back walls: solid behind the director and meeting rooms (boards hang there), windows elsewhere
  for (let x = 0; x < W; x++) walls.push({ sprite: x <= 10 ? 'wall_x_solid' : 'wall_x_window', x, y: 0, axis: 'x' });
  for (let y = 0; y < D; y++) if (y !== 5 && y !== 6) walls.push({ sprite: 'wall_y_window', x: 0, y, axis: 'y' });
  add('elevator', 0, 5, 0.2, 2, { layer: 'wall', light: { color: 0xffb35c, radius: 40, z: 50, dy: 1 } });

  // glass partitions (cell-boundary walls for navigation)
  const gx = (y: number, x0: number, x1: number, door: number) => {
    for (let x = x0; x <= x1; x++) {
      glass.push({ sprite: x === door ? 'glass_door_x' : 'glass_x', x, y, axis: 'x' });
      if (x !== door) grid.wall(x, y - 1, x, y);
    }
  };
  const gy = (x: number, y0: number, y1: number) => {
    for (let y = y0; y <= y1; y++) {
      glass.push({ sprite: 'glass_y', x, y, axis: 'y' });
      grid.wall(x - 1, y, x, y);
    }
  };
  gx(4, 0, 4, 2); // director
  gy(5, 0, 3);
  gx(4, 5, 10, 7); // meeting
  gy(11, 0, 3);
  gx(4, 16, 19, 17); // server room
  gy(16, 0, 3);
  gx(11, 0, 4, 3); // analytics
  gy(5, 11, 15);

  // director office
  add('tv_dashboard', 0.4, 0, 2, 0.1, { layer: 'wall', light: { color: 0x9fd0ff, radius: 40, z: 30, dx: 1, night: false } });
  add('poster_2', 3.4, 0, 0.8, 0.1, { layer: 'wall' });
  add('plant_big', 0, 0, 1, 1, { block: true });
  add('armchair', 0, 2.6, 1, 1, { block: true });
  const desks: Desk[] = [];
  desks.push({ id: 'director', dept: 'director', x: 1, y: 1.3, sprite: 'desk_director', seat: [2.9, 0.75], facing: 'sw', screen: false, chair: 'chair_front_coral', decor: ['deco_plush'] });
  grid.block(1, 1, 3, 2);

  // meeting room
  add('kanban', 5.4, 0, 3, 0.1, { layer: 'wall' });
  add('clock', 8.8, 0, 0.4, 0.1, { layer: 'wall' });
  add('calendar', 9.5, 0, 0.6, 0.1, { layer: 'wall' });
  add('meeting_table', 6, 1.3, 2.4, 1.4, { block: true });
  for (const [x, y] of [[5.4, 1.6], [5.4, 2.3], [8.7, 1.6], [8.7, 2.3]] as Pt[]) add('stool', x, y, 0.6, 0.6);
  add('plant_small', 10.2, 0.3, 0.5, 0.5);

  // kitchen
  add('counter', 11, 0.1, 3, 0.8, { block: true });
  add('fridge', 14.05, 0.1, 0.9, 0.8, { block: true });
  add('cooler', 15.2, 0.2, 0.6, 0.6, { block: true });
  add('stool', 12.3, 2.4, 0.6, 0.6);
  add('stool', 13.4, 2.4, 0.6, 0.6);
  add('plant_cactus', 15.4, 3.2, 0.4, 0.4);

  // server room
  for (const [k, x] of [[0, 16.6], [1, 17.6], [0, 18.6]] as [number, number][]) add(`server_${k}`, x, 0.1, 1, 0.9, { block: true, tag: 'server', light: { color: 0x7ef0a0, radius: 26, z: 26, dx: 0.5, dy: 1, flicker: true } });
  // terminals keep columns 17–18 free so the racks stay reachable
  add('terminal', 16.05, 2.2, 0.9, 0.7, { block: true, light: { color: 0x7ef0a0, radius: 22, z: 22, dx: 0.5, dy: 0.6 } });
  add('terminal', 19.0, 2.2, 0.9, 0.7, { block: true, light: { color: 0x7ef0a0, radius: 22, z: 22, dx: 0.5, dy: 0.6 } });
  desks.push({ id: 'ops-1', dept: 'devops', x: 16.05, y: 2.2, sprite: 'terminal', seat: [16.55, 3.45], facing: 'ne', screen: false, decor: [] });
  desks.push({ id: 'ops-2', dept: 'devops', x: 19.0, y: 2.2, sprite: 'terminal', seat: [19.5, 3.45], facing: 'ne', screen: false, decor: [] });

  // arrival
  add('coat_rack', 0.25, 4.15, 0.5, 0.5);
  add('plant_ficus', 0.1, 8.1, 0.8, 0.8, { block: true });
  add('outbox', 1, 9.2, 1, 0.8, { block: true });
  add('printer', 3.1, 9.2, 1, 0.8, { block: true });

  // analytics / research room
  add('board_analytics', 0.4, 12, 2.4, 0.1, { block: true, light: { color: 0xffd59a, radius: 30, z: 40, dx: 1.2, night: true } });
  add('cabinet', 4.1, 13.9, 0.8, 0.6, { block: true });
  add('plant_small', 0.2, 15.2, 0.5, 0.5);
  add('lamp_floor', 4.1, 15.1, 0.6, 0.6, { light: { color: 0xffc27a, radius: 70, z: 48, dx: 0.3, dy: 0.3, night: true } });

  // open space desks: back-to-back pairs (desk_b row then desk_a row)
  const deptCols: [number, DepartmentName, DepartmentName][] = [
    [6, 'frontend', 'frontend'],
    [8, 'backend', 'backend'],
    [10, 'qa', 'security'],
    [12, 'docs', 'general'],
  ];
  const chairsBy: Record<string, string> = { frontend: '_coral', backend: '', qa: '_teal', security: '', docs: '_mustard', general: '_teal' };
  let dk = 0;
  for (const [cx, upper, lower] of deptCols) {
    for (const [pair, dept] of [[5, upper], [9, lower]] as [number, DepartmentName][]) {
      // desk_b at row pair+1: worker sits behind it (row pair) facing the camera
      desks.push({ id: `d${dk++}`, dept, x: cx, y: pair + 1, sprite: 'desk_b', seat: [cx + 1, pair + 0.45], facing: 'sw', screen: false, chair: 'chair_front' + chairsBy[dept], decor: [DECOR[(dk * 3) % DECOR.length]!] });
      // desk_a at row pair+2: worker sits in front (row pair+3) with the back to the camera, screen visible
      desks.push({ id: `d${dk++}`, dept, x: cx, y: pair + 2, sprite: 'desk_a', seat: [cx + 1, pair + 3.55], facing: 'ne', screen: true, chair: 'chair_back' + chairsBy[dept], decor: [DECOR[(dk * 5) % DECOR.length]!] });
      grid.block(cx, pair + 1, 2, 2);
    }
  }
  // lamps over the desk rows
  for (const [x, y] of [[5.2, 4.6], [14.6, 4.6], [14.6, 9.4]] as Pt[]) add('plant_small', x, y, 0.5, 0.5);

  // lounge
  add('aquarium_0', 15.2, 11.2, 1.6, 0.6, { block: true, tag: 'aquarium', light: { color: 0x6fc3d9, radius: 40, z: 24, dx: 0.8, dy: 0.6 } });
  add('armchair', 18.2, 11.1, 1, 1, { block: true });
  add('rug', 14.9, 12.8, 3, 2, { layer: 'floor' });
  add('sofa_mustard', 15, 12.9, 2, 1, { block: true });
  add('coffee_table', 15.4, 14.5, 1.2, 0.8, { block: true });
  add('foosball', 11, 14, 2, 1, { block: true });
  add('plant_big', 19, 15, 1, 1, { block: true });
  add('lamp_floor', 19.1, 12.4, 0.6, 0.6, { light: { color: 0xffc27a, radius: 80, z: 48, dx: 0.3, dy: 0.3, night: true } });
  add('cat_bed', 14, 14.4, 0.8, 0.8, { layer: 'floor' });
  add('bookshelf', 6.2, 14.8, 1.6, 0.45, { block: true });
  add('vending', 8.6, 14.6, 1, 0.8, { block: true, light: { color: 0xffe0b0, radius: 34, z: 30, dx: 0.5, dy: 0.8 } });

  const S = (x: number, y: number, facing: Facing): Spot => ({ pos: [x, y], facing });
  return {
    w: W,
    d: D,
    tiles,
    walls,
    glass,
    items,
    desks,
    spots: {
      elevator: S(1, 6, 'se'),
      outbox: S(1.5, 8.7, 'sw'),
      server: [S(16.9, 1.5, 'ne'), S(17.9, 1.5, 'ne'), S(18.9, 1.5, 'ne')],
      analytics: [S(1.2, 13.5, 'ne'), S(2.3, 13.6, 'ne'), S(3.3, 13.4, 'ne')],
      meeting: [S(5.6, 1.4, 'se'), S(5.6, 2.4, 'se'), S(8.9, 1.4, 'nw'), S(8.9, 2.4, 'nw'), S(6.6, 3.4, 'ne'), S(7.6, 3.4, 'ne')],
      coffee: S(11.6, 1.4, 'ne'),
      cooler: S(15.5, 1.3, 'ne'),
      fridge: S(14.5, 1.4, 'ne'),
      printer: S(3.6, 8.7, 'sw'),
      sofa: [S(15.5, 13.4, 'sw'), S(16.5, 13.4, 'sw')],
      foosball: [S(10.5, 14.5, 'se'), S(13.5, 14.5, 'nw')],
      aquarium: S(16, 12.3, 'ne'),
      window: [S(12.6, 1.5, 'ne'), S(0.6, 10.5, 'nw')],
      lounge: [S(18.6, 12.4, 'sw'), S(15.2, 14.6, 'se')],
    },
    kanban: { x: 5.4, y: 0, w: 3 },
    dashboard: { x: 0.4, y: 0, w: 2 },
    grid,
  };
}
