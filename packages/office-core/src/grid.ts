/** Walkability grid with optional blocked edges (glass partitions) and 4-way A*. */

export type Pt = [number, number];

export class Grid {
  readonly blocked: Uint8Array;
  /** Blocked edges, keyed "x,y|x2,y2" with the smaller cell first. */
  private walls = new Set<string>();

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.blocked = new Uint8Array(w * h);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  isBlocked(x: number, y: number): boolean {
    return !this.inside(x, y) || this.blocked[y * this.w + x] === 1;
  }

  block(x: number, y: number, w = 1, d = 1): void {
    for (let j = Math.floor(y); j < Math.ceil(y + d); j++)
      for (let i = Math.floor(x); i < Math.ceil(x + w); i++) if (this.inside(i, j)) this.blocked[j * this.w + i] = 1;
  }

  unblock(x: number, y: number): void {
    if (this.inside(x, y)) this.blocked[y * this.w + x] = 0;
  }

  private ek(ax: number, ay: number, bx: number, by: number): string {
    return ay < by || (ay === by && ax < bx) ? `${ax},${ay}|${bx},${by}` : `${bx},${by}|${ax},${ay}`;
  }

  /** Blocks movement across the boundary between two neighbouring cells. */
  wall(ax: number, ay: number, bx: number, by: number): void {
    this.walls.add(this.ek(ax, ay, bx, by));
  }

  canStep(ax: number, ay: number, bx: number, by: number): boolean {
    return !this.isBlocked(bx, by) && !this.walls.has(this.ek(ax, ay, bx, by));
  }

  /** A* with Manhattan heuristic; returns cell centres excluding the start, or undefined. */
  path(from: Pt, to: Pt, extraBlocked?: (x: number, y: number) => boolean, maxNodes = 6000): Pt[] | undefined {
    const sx = Math.floor(from[0]);
    const sy = Math.floor(from[1]);
    let tx = Math.floor(to[0]);
    let ty = Math.floor(to[1]);
    if (!this.inside(sx, sy)) return undefined;
    if (this.isBlocked(tx, ty)) {
      const n = this.nearestFree(tx, ty);
      if (!n) return undefined;
      [tx, ty] = n;
    }
    if (sx === tx && sy === ty) return [];
    const W = this.w;
    const idx = (x: number, y: number) => y * W + x;
    const g = new Map<number, number>();
    const came = new Map<number, number>();
    const open = new MinHeap();
    const h = (x: number, y: number) => Math.abs(x - tx) + Math.abs(y - ty);
    g.set(idx(sx, sy), 0);
    open.push(idx(sx, sy), h(sx, sy));
    let visited = 0;
    while (open.size) {
      const cur = open.pop()!;
      const cx = cur % W;
      const cy = (cur - cx) / W;
      if (cx === tx && cy === ty) break;
      if (++visited > maxNodes) return undefined;
      const cg = g.get(cur)!;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!this.canStep(cx, cy, nx, ny)) continue;
        if (extraBlocked && !(nx === tx && ny === ty) && extraBlocked(nx, ny)) continue;
        const ni = idx(nx, ny);
        const ng = cg + 1;
        if (ng < (g.get(ni) ?? Infinity)) {
          g.set(ni, ng);
          came.set(ni, cur);
          open.push(ni, ng + h(nx, ny) + (dx !== 0 ? 0.001 : 0));
        }
      }
    }
    const end = idx(tx, ty);
    if (!came.has(end)) return undefined;
    const out: Pt[] = [];
    let c: number | undefined = end;
    while (c !== undefined && c !== idx(sx, sy)) {
      const x = c % W;
      out.push([x + 0.5, (c - x) / W + 0.5]);
      c = came.get(c);
    }
    return out.reverse();
  }

  nearestFree(x: number, y: number): Pt | undefined {
    for (let r = 1; r < 8; r++)
      for (let j = -r; j <= r; j++)
        for (let i = -r; i <= r; i++) if (Math.max(Math.abs(i), Math.abs(j)) === r && !this.isBlocked(x + i, y + j)) return [x + i, y + j];
    return undefined;
  }
}

const DIRS: Pt[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

class MinHeap {
  private k: number[] = [];
  private p: number[] = [];
  get size() {
    return this.k.length;
  }
  push(key: number, pri: number) {
    this.k.push(key);
    this.p.push(pri);
    let i = this.k.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (this.p[par]! <= this.p[i]!) break;
      this.swap(i, par);
      i = par;
    }
  }
  pop(): number | undefined {
    if (!this.k.length) return undefined;
    const top = this.k[0];
    const lk = this.k.pop()!;
    const lp = this.p.pop()!;
    if (this.k.length) {
      this.k[0] = lk;
      this.p[0] = lp;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.k.length && this.p[l]! < this.p[m]!) m = l;
        if (r < this.k.length && this.p[r]! < this.p[m]!) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number) {
    [this.k[a], this.k[b]] = [this.k[b]!, this.k[a]!];
    [this.p[a], this.p[b]] = [this.p[b]!, this.p[a]!];
  }
}
