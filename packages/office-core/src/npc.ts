/**
 * Background NPCs: utility-AI over points of interest with daily schedules, queues and
 * light collision avoidance. They never touch real data, but react visually to agents.
 */
import type { CityPlan } from './city-layout.js';
import type { Pt } from './grid.js';
import type { Facing, FloorPlan, Spot } from './office-layout.js';
import type { DayState } from './time.js';
import type { Agent, World } from './world.js';

export type NpcRole =
  | 'pedestrian'
  | 'dogwalker'
  | 'musician'
  | 'barista'
  | 'chef'
  | 'florist'
  | 'guard'
  | 'cleaner'
  | 'coworker'
  | 'courier'
  | 'cat'
  | 'mascot';

export interface Npc {
  id: string;
  role: NpcRole;
  preset: string;
  area: 'city' | 'office';
  floorId?: string;
  pos: Pt;
  path: Pt[];
  facing: Facing;
  anim: string;
  icon?: string;
  /** current activity and when it ends */
  doing?: { kind: string; until: number; spot?: Spot };
  plan: string[];
  needs: { coffee: number; social: number; rest: number; play: number };
  waitT: number;
  speed: number;
  leaving?: boolean;
  dog?: { kind: string; pos: Pt; facing: Facing; anim: string };
  /** agent this NPC is currently attending to */
  target?: string;
  bornAt: number;
}

export interface Pigeon {
  home: Pt;
  pos: Pt;
  fly: number;
  facing: Facing;
  t: number;
}

const r = (() => {
  let s = 0x9e3779b9;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();
const pick = <T>(xs: T[]): T => xs[Math.floor(r() * xs.length)]!;
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

const PED_PRESETS = ['npc_visitor_a', 'npc_visitor_b', 'npc_visitor_c', 'npc_visitor_d', 'npc_courier', 'general_1', 'docs_2', 'plan_1', 'explore_2', 'frontend_0', 'review_1'];

/** Pedestrians wanted on the block for a given hour. */
export function pedestrianTarget(hour: number): number {
  if (hour < 6) return 3;
  if (hour < 7) return 6;
  if (hour < 10) return 16;
  if (hour < 12) return 11;
  if (hour < 14) return 20;
  if (hour < 17) return 13;
  if (hour < 20) return 17;
  if (hour < 23) return 9;
  return 4;
}

export class NpcSim {
  npcs: Npc[] = [];
  pigeons: Pigeon[] = [];
  /** pedestrian light: true while people may cross */
  pedGreen = false;
  private seq = 0;
  private lastSpawn = 0;
  private reactCooldown = new Map<string, number>();
  private queues = new Map<string, string[]>();

  constructor(
    private readonly world: World,
    private readonly city: CityPlan,
    private readonly floor: FloorPlan,
  ) {
    for (const p of city.pois.pigeons) for (let i = 0; i < 4; i++) {
      const home: Pt = [p[0] + (r() - 0.5) * 2, p[1] + (r() - 0.5) * 1.2];
      this.pigeons.push({ home, pos: [...home] as Pt, fly: 0, facing: r() > 0.5 ? 'se' : 'sw', t: r() * 5 });
    }
  }

  private make(role: NpcRole, preset: string, area: 'city' | 'office', pos: Pt, now: number, floorId?: string): Npc {
    const n: Npc = {
      id: `${role}-${this.seq++}`,
      role,
      preset,
      area,
      floorId,
      pos: [...pos] as Pt,
      path: [],
      facing: 'se',
      anim: 'idle',
      plan: [],
      needs: { coffee: r(), social: r(), rest: r() * 0.5, play: r() * 0.6 },
      waitT: 0,
      speed: 1.5 + r() * 0.7,
      bornAt: now,
    };
    this.npcs.push(n);
    return n;
  }

  /** The building floor where office NPCs live: the open floor of the main tower. */
  hqFloor(): string | undefined {
    const b = [...this.world.buildings.values()].sort((a, b) => a.slot - b.slot)[0];
    return b?.openFloor;
  }

  private grid(n: Npc) {
    return n.area === 'city' ? this.city.grid : this.floor.grid;
  }

  private go(n: Npc, to: Pt): boolean {
    const others = this.npcs.filter((o) => o !== n && o.area === n.area && o.floorId === n.floorId && !o.path.length);
    const occupied = (x: number, y: number) => others.some((o) => Math.floor(o.pos[0]) === x && Math.floor(o.pos[1]) === y);
    const p = this.grid(n).path(n.pos, to, n.waitT > 0.6 ? occupied : undefined) ?? this.grid(n).path(n.pos, to);
    if (!p) return false;
    n.path = [...p.slice(0, -1), [to[0], to[1]]];
    return true;
  }

  tick(dtMs: number, now: number, day: DayState): void {
    const dt = Math.min(dtMs, 250) / 1000;
    const hour = day.t * 24;
    this.schedule(now, hour);
    for (const n of [...this.npcs]) this.stepNpc(n, dt, now, hour);
    this.npcs = this.npcs.filter((n) => !(n.leaving && !n.path.length && n.doing?.kind === 'gone'));
    this.stepPigeons(dt);
    this.reactToAgents(now);
  }

  // ---------------------------------------------------------------- schedules

  private ensureRole(role: NpcRole, wanted: boolean, preset: string, area: 'city' | 'office', pos: Pt, now: number, floorId?: string) {
    const have = this.npcs.find((n) => n.role === role && !n.leaving);
    if (wanted && !have) {
      const n = this.make(role, preset, area, pos, now, floorId);
      return n;
    }
    if (!wanted && have) this.dismiss(have);
    if (have && area === 'office' && have.floorId !== floorId) {
      this.npcs = this.npcs.filter((x) => x !== have);
      if (wanted) return this.make(role, preset, area, pos, now, floorId);
    }
    return have;
  }

  private dismiss(n: Npc) {
    if (n.leaving) return;
    n.leaving = true;
    n.doing = undefined;
    if (n.area === 'office') this.go(n, this.floor.spots.elevator.pos);
    else this.go(n, this.city.pois.metro.pos);
  }

  private schedule(now: number, hour: number) {
    const c = this.city.pois;
    this.ensureRole('musician', hour >= 11 && hour < 23, 'npc_musician', 'city', c.musician.pos, now);
    this.ensureRole('barista', hour >= 7 && hour < 22, 'npc_barista', 'city', [32.4, 42.3], now);
    this.ensureRole('chef', hour >= 10 && hour < 23, 'npc_chef', 'city', [41.4, 41.95], now);
    this.ensureRole('florist', hour >= 8 && hour < 20, 'npc_visitor_a', 'city', [15.6, 40.5], now);
    this.ensureRole('guard', hour >= 20 || hour < 7, 'npc_guard', 'city', c.guardLoop[0]!, now);
    const hq = this.hqFloor();
    this.ensureRole('cleaner', !!hq && (hour >= 21 || hour < 5), 'npc_cleaner', 'office', this.floor.spots.elevator.pos, now, hq);
    this.ensureRole('cat', !!hq, 'cat', 'office', [14.3, 14.6], now, hq);
    this.ensureRole('mascot', !!hq, 'mascot', 'office', [17.5, 14.8], now, hq);
    // office coworkers: a few during the day, one night owl asleep on the sofa
    const coworkers = this.npcs.filter((n) => n.role === 'coworker' && !n.leaving);
    const wantCo = !hq ? 0 : hour >= 8 && hour < 19 ? 4 : hour >= 19 && hour < 22 ? 2 : 1;
    for (const n of coworkers) if (n.floorId !== hq) this.dismiss(n);
    const live = coworkers.filter((n) => n.floorId === hq);
    if (hq && live.length < wantCo && now - this.lastSpawn > 1500) {
      this.lastSpawn = now;
      const n = this.make('coworker', pick(['general_2', 'docs_0', 'plan_2', 'qa_1', 'frontend_2', 'explore_1']), 'office', this.floor.spots.elevator.pos, now, hq);
      n.speed = 1.6;
    } else if (live.length > wantCo) this.dismiss(live[0]!);
    // pedestrians
    const peds = this.npcs.filter((n) => (n.role === 'pedestrian' || n.role === 'dogwalker') && !n.leaving);
    const target = pedestrianTarget(Math.floor(hour));
    if (peds.length < target && now - this.lastSpawn > 700) {
      this.lastSpawn = now;
      this.spawnPedestrian(now, hour);
    } else if (peds.length > target + 2) {
      const idle = peds.find((p) => !p.doing || p.doing.kind === 'stroll');
      if (idle) this.dismiss(idle);
    }
  }

  private spawnPedestrian(now: number, hour: number) {
    const c = this.city.pois;
    const morning = hour >= 7 && hour < 10;
    const evening = hour >= 17 && hour < 20;
    const sources: Pt[] = [c.metro.pos, c.busStop[0]!.pos, [-0.5 + 1, 41], [this.city.w - 1.5, 42], [1, 30.5], [this.city.w - 1, 30.5]];
    const start: Pt = evening && r() < 0.6 ? pick(c.entrance) : pick(sources);
    const dogs = this.npcs.filter((n) => n.role === 'dogwalker').length;
    const role: NpcRole = hour > 7 && hour < 22 && dogs < 2 && r() < 0.25 ? 'dogwalker' : 'pedestrian';
    const n = this.make(role, pick(PED_PRESETS), 'city', start, now);
    if (role === 'dogwalker') {
      n.dog = { kind: r() > 0.5 ? 'dog_corgi' : 'dog_dark', pos: [...start] as Pt, facing: 'se', anim: 'walk' };
      n.plan = ['dogloop', 'dogloop', 'bench', 'exit'];
      n.speed = 1.3;
      return;
    }
    const lunch = hour >= 12 && hour < 14;
    const errands = ['cafe', 'foodtruck', 'flowers', 'bench', 'fountain', 'stroll', 'stroll', 'busstop', 'plaza'];
    const plan: string[] = [];
    if (morning && r() < 0.7) plan.push(r() < 0.5 ? 'cafe' : 'stroll', 'enter');
    else {
      const k = 1 + Math.floor(r() * 3);
      for (let i = 0; i < k; i++) plan.push(lunch && i === 0 ? (r() < 0.5 ? 'cafe' : 'foodtruck') : pick(errands));
      plan.push(evening && r() < 0.4 ? 'busstop' : 'exit');
    }
    n.plan = plan;
  }

  // ---------------------------------------------------------------- per-NPC logic

  private stepNpc(n: Npc, dt: number, now: number, hour: number) {
    // movement with waiting when the next cell is occupied by a standing NPC
    if (n.path.length) {
      const next = n.path[0]!;
      const blocker = this.npcs.find((o) => o !== n && o.area === n.area && o.floorId === n.floorId && !o.path.length && dist(o.pos, next) < 0.45 && dist(n.pos, next) > 0.5);
      const crossingRed = n.area === 'city' && !this.pedGreen && next[1] >= 32 && next[1] < 38 && (n.pos[1] < 32 || n.pos[1] >= 38);
      if ((blocker && n.path.length > 1) || crossingRed) {
        n.waitT += dt;
        n.anim = 'idle';
        if (blocker && n.waitT > 1.2) {
          const goal = n.path[n.path.length - 1]!;
          this.go(n, goal);
          n.waitT = 0;
        }
        this.moveDog(n, dt);
        return;
      }
      n.waitT = 0;
      let budget = n.speed * dt;
      while (budget > 0 && n.path.length) {
        const [tx, ty] = n.path[0]!;
        const dx = tx - n.pos[0];
        const dy = ty - n.pos[1];
        const d = Math.hypot(dx, dy);
        if (d < 1e-3) {
          n.path.shift();
          continue;
        }
        n.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'se' : 'nw') : dy > 0 ? 'sw' : 'ne';
        const mv = Math.min(budget, d);
        n.pos = [n.pos[0] + (dx / d) * mv, n.pos[1] + (dy / d) * mv];
        budget -= mv;
        if (mv >= d) n.path.shift();
      }
      n.anim = n.role === 'guard' ? 'carry' : n.role === 'cat' ? 'walk' : 'walk';
      this.moveDog(n, dt);
      if (!n.path.length && n.doing?.spot) n.facing = n.doing.spot.facing;
      return;
    }
    this.moveDog(n, dt);
    if (n.leaving) {
      n.doing = { kind: 'gone', until: now };
      return;
    }
    if (n.doing && now < n.doing.until) {
      this.animate(n, now);
      return;
    }
    if (n.doing?.kind === 'queue') {
      if (!this.advanceQueue(n, now)) return;
    }
    n.icon = undefined;
    this.decide(n, now, hour);
  }

  private moveDog(n: Npc, dt: number) {
    if (!n.dog) return;
    const d = n.dog;
    const behind: Pt = [n.pos[0] + 0.7, n.pos[1] + 0.5];
    const dx = behind[0] - d.pos[0];
    const dy = behind[1] - d.pos[1];
    const dd = Math.hypot(dx, dy);
    if (dd > 0.25) {
      const mv = Math.min(dd, (n.speed + 0.6) * dt);
      d.pos = [d.pos[0] + (dx / dd) * mv, d.pos[1] + (dy / dd) * mv];
      d.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'se' : 'nw') : dy > 0 ? 'sw' : 'ne';
      d.anim = 'walk';
    } else d.anim = 'sit';
  }

  private animate(n: Npc, now: number) {
    const k = n.doing!.kind;
    const phase = Math.floor(now / 2500) % 4;
    switch (k) {
      case 'coffee':
      case 'cafe-table':
        n.anim = 'coffee';
        break;
      case 'phone':
        n.anim = 'phone';
        break;
      case 'sit':
      case 'sofa':
        n.anim = n.role === 'coworker' && now - n.bornAt > 0 && this.isNight ? 'sleep' : 'sit';
        break;
      case 'play':
        n.anim = 'dance';
        break;
      case 'music':
        n.anim = phase % 2 ? 'dance' : 'idle';
        n.icon = 'icon_note';
        break;
      case 'serve':
        n.anim = phase === 0 ? 'coffee' : 'idle';
        break;
      case 'vacuum':
        n.anim = 'carry';
        break;
      case 'stretch':
        n.anim = 'stretch';
        break;
      case 'clap':
        n.anim = 'joy';
        break;
      case 'peek':
        n.anim = 'idle';
        n.icon = 'icon_think_1';
        break;
      case 'wait-near':
        n.anim = phase % 2 ? 'idle' : 'hand';
        n.facing = phase % 2 ? 'sw' : 'se';
        break;
      case 'bring-coffee':
        n.anim = 'coffee';
        n.icon = 'icon_heart';
        break;
      case 'deliver':
        n.anim = 'idle';
        n.icon = 'item_package';
        break;
      default:
        n.anim = 'idle';
    }
  }

  private isNight = false;

  private decide(n: Npc, now: number, hour: number) {
    this.isNight = hour >= 22 || hour < 6;
    const c = this.city.pois;
    const f = this.floor.spots;
    const wait = (kind: string, ms: number, spot?: Spot) => {
      n.doing = { kind, until: now + ms, ...(spot ? { spot } : {}) };
      if (spot) {
        if (dist(n.pos, spot.pos) > 0.3) this.go(n, spot.pos);
        else n.facing = spot.facing;
      }
    };
    switch (n.role) {
      case 'musician':
      case 'barista':
      case 'chef':
      case 'florist': {
        const spots: Record<string, Spot> = {
          musician: c.musician,
          barista: { pos: [32.4, 42.3], facing: 'sw' },
          chef: { pos: [41.4, 41.95], facing: 'sw' },
          florist: { pos: [15.6, 40.5], facing: 'sw' },
        };
        wait(n.role === 'musician' ? 'music' : 'serve', 4000 + r() * 4000, spots[n.role]);
        return;
      }
      case 'guard': {
        const loop = c.guardLoop;
        const i = (n.plan.length ? Number(n.plan[0]) : 0) % loop.length;
        n.plan = [String(i + 1)];
        n.preset = 'npc_guard';
        n.doing = { kind: 'patrol', until: now + 1500 };
        this.go(n, loop[i]!);
        return;
      }
      case 'cleaner': {
        const g = this.floor.grid;
        let p: Pt = [1, 6];
        for (let k = 0; k < 20; k++) {
          const cand: Pt = [Math.floor(r() * g.w) + 0.5, Math.floor(r() * g.h) + 0.5];
          if (!g.isBlocked(Math.floor(cand[0]), Math.floor(cand[1]))) {
            p = cand;
            break;
          }
        }
        n.doing = { kind: 'vacuum', until: now + 2000 };
        this.go(n, p);
        return;
      }
      case 'cat': {
        const opts: Spot[] = [{ pos: [14.4, 14.8], facing: 'sw' }, f.window[1]!, { pos: [12.4, 2.3], facing: 'se' }, { pos: [16.2, 12.3], facing: 'ne' }];
        // easter egg: the cat naps on the keyboard of an empty desk
        const floor = n.floorId ? this.world.floors.get(n.floorId) : undefined;
        const empty = this.floor.desks.filter((d) => d.screen && !floor?.deskOwner.has(d.id));
        if (empty.length && r() < 0.25) {
          const d = pick(empty);
          opts.push({ pos: [d.x + 1, d.y + 0.55], facing: 'sw' });
        }
        wait(r() < 0.5 ? 'sit' : 'nap', 6000 + r() * 12000, pick(opts));
        return;
      }
      case 'mascot':
        wait('hop', 3000 + r() * 5000, pick([...f.lounge, ...f.sofa, f.aquarium, { pos: [12.5, 13.5], facing: 'sw' } as Spot]));
        return;
      case 'coworker':
        this.decideCoworker(n, now, hour, wait);
        return;
      case 'courier':
        n.leaving = true;
        this.go(n, f.elevator.pos);
        return;
      default:
        this.decidePedestrian(n, now, wait);
    }
  }

  private decideCoworker(n: Npc, now: number, hour: number, wait: (kind: string, ms: number, spot?: Spot) => void) {
    const f = this.floor.spots;
    if (hour >= 22 || hour < 7) {
      wait('sofa', 20000, f.sofa[0]!);
      return;
    }
    for (const k of Object.keys(n.needs) as (keyof Npc['needs'])[]) n.needs[k] = Math.min(1, n.needs[k] + 0.08 + r() * 0.1);
    const options: [number, () => void][] = [
      [n.needs.coffee * 1.2, () => ((n.needs.coffee = 0), wait('coffee', 5000, f.coffee))],
      [n.needs.coffee * 0.6, () => ((n.needs.coffee *= 0.5), wait('coffee', 4000, f.cooler))],
      [n.needs.social * 0.8, () => ((n.needs.social = 0), wait('phone', 6000, pick(f.window)))],
      [n.needs.rest * 0.7, () => ((n.needs.rest = 0), wait('sofa', 8000, pick(f.sofa)))],
      [n.needs.play * 0.9, () => ((n.needs.play = 0), wait('play', 7000, pick(f.foosball)))],
      [0.35, () => wait('look', 5000, f.aquarium)],
      [0.3, () => wait('print', 3500, f.printer)],
      [0.25, () => wait('stretch', 3000, pick(f.lounge))],
      [0.2, () => wait('fridge', 3000, f.fridge)],
    ];
    options.sort((a, b) => b[0] + r() * 0.3 - (a[0] + r() * 0.3));
    options[0]![1]();
  }

  private decidePedestrian(n: Npc, now: number, wait: (kind: string, ms: number, spot?: Spot) => void) {
    const c = this.city.pois;
    const step = n.plan.shift();
    switch (step) {
      case 'cafe':
        this.joinQueue(n, 'cafe', now);
        return;
      case 'foodtruck':
        this.joinQueue(n, 'foodtruck', now);
        return;
      case 'flowers':
        wait('look', 3000 + r() * 3000, c.flowers);
        return;
      case 'bench': {
        const free = c.benches.filter((b) => !this.npcs.some((o) => o !== n && o.doing?.spot === b));
        if (free.length) wait('sit', 8000 + r() * 12000, pick(free));
        return;
      }
      case 'fountain':
        wait(r() < 0.5 ? 'phone' : 'look', 4000 + r() * 6000, pick(c.fountain));
        return;
      case 'busstop':
        wait('wait-bus', 6000 + r() * 8000, pick(c.busStop));
        n.plan = ['exit'];
        return;
      case 'plaza':
        n.doing = { kind: 'stroll', until: now + 1000 };
        this.go(n, pick(c.plaza));
        return;
      case 'stroll':
        n.doing = { kind: 'stroll', until: now + 1000 };
        this.go(n, pick([...c.promenade, ...c.park]));
        return;
      case 'dogloop': {
        const loop = c.dogLoop;
        n.plan.unshift(...loop.map(() => 'dogstep'));
        return;
      }
      case 'dogstep': {
        const loop = c.dogLoop;
        const k = this.seq++ % loop.length;
        n.doing = { kind: 'stroll', until: now + 500 };
        this.go(n, loop[k]!);
        return;
      }
      case 'enter':
        n.leaving = true;
        this.go(n, pick(c.entrance));
        return;
      case 'exit':
      default:
        n.leaving = true;
        this.go(n, pick([c.metro.pos, [1, 30.5], [this.city.w - 1, 30.5], [1, 41], [this.city.w - 1.5, 42], c.busStop[1]!.pos] as Pt[]));
    }
  }

  // ---------------------------------------------------------------- queues

  private queueSpots(name: string): { counter: Spot; queue: Spot[] } {
    return name === 'cafe' ? this.city.pois.cafe : this.city.pois.foodTruck;
  }

  private joinQueue(n: Npc, name: string, now: number) {
    const q = this.queues.get(name) ?? [];
    const spots = this.queueSpots(name);
    if (q.length > spots.queue.length) {
      n.doing = { kind: 'stroll', until: now + 500 };
      return;
    }
    q.push(n.id);
    this.queues.set(name, q);
    n.doing = { kind: 'queue', until: now };
    n.plan.unshift('__queue:' + name);
    this.go(n, this.slot(name, q.length - 1).pos);
  }

  private slot(name: string, i: number): Spot {
    const s = this.queueSpots(name);
    return i === 0 ? s.counter : s.queue[Math.min(i - 1, s.queue.length - 1)]!;
  }

  private served = new Map<string, number>();

  /** Queue state machine: walk to your slot → get served at the counter → leave with a drink. Returns true when finished. */
  private advanceQueue(n: Npc, now: number): boolean {
    const tag = n.plan.find((p) => p.startsWith('__queue:'));
    if (!tag) return true;
    const name = tag.slice(8);
    const q = this.queues.get(name) ?? [];
    const i = q.indexOf(n.id);
    const recheck = () => (n.doing = { kind: 'queue', until: now + 400 });
    if (i < 0) {
      n.plan = n.plan.filter((p) => p !== tag);
      return true;
    }
    const want = this.slot(name, i);
    if (dist(n.pos, want.pos) > 0.25) {
      if (!n.path.length) this.go(n, want.pos);
      recheck();
      return false;
    }
    n.facing = want.facing;
    if (i > 0) {
      recheck();
      return false;
    }
    const until = this.served.get(n.id);
    if (until === undefined) {
      this.served.set(n.id, now + 3500 + r() * 2500);
      n.doing = { kind: 'queue', until: now + 400 };
      return false;
    }
    if (now < until) {
      recheck();
      return false;
    }
    this.served.delete(n.id);
    q.shift();
    this.queues.set(name, q);
    n.plan = n.plan.filter((p) => p !== tag);
    if (name === 'cafe' && r() < 0.5) {
      const t = pick(this.city.pois.cafe.tables);
      n.doing = { kind: 'cafe-table', until: now + 9000 + r() * 8000, spot: t };
      this.go(n, t.pos);
    } else n.doing = { kind: 'coffee', until: now + 2500 };
    q.forEach((id, k) => {
      const o = this.npcs.find((x) => x.id === id);
      if (o) this.go(o, this.slot(name, k).pos);
    });
    return false;
  }

  // ---------------------------------------------------------------- pigeons

  private stepPigeons(dt: number) {
    for (const p of this.pigeons) {
      p.t += dt;
      const scared = this.npcs.some((n) => n.area === 'city' && dist(n.pos, p.pos) < 1.4 && n.path.length > 0);
      if (scared && p.fly <= 0) p.fly = 2.5;
      if (p.fly > 0) {
        p.fly -= dt;
        p.pos = [p.pos[0] + dt * 2.2, p.pos[1] - dt * 0.6];
        if (p.fly <= 0) p.pos = [p.home[0] + (r() - 0.5) * 2, p.home[1] + (r() - 0.5)];
      } else if (r() < dt * 0.4) {
        p.pos = [p.pos[0] + (r() - 0.5) * 0.4, p.pos[1] + (r() - 0.5) * 0.3];
        p.facing = r() > 0.5 ? 'se' : 'sw';
      }
    }
  }

  // ---------------------------------------------------------------- reactions

  private cooldown(key: string, now: number, ms: number): boolean {
    if ((this.reactCooldown.get(key) ?? 0) > now) return false;
    this.reactCooldown.set(key, now + ms);
    return true;
  }

  private freeCoworker(floorId: string): Npc | undefined {
    return this.npcs.find((n) => n.role === 'coworker' && n.floorId === floorId && !n.leaving && !n.target && n.doing?.kind !== 'sofa');
  }

  private attend(n: Npc, a: Agent, kind: string, ms: number, now: number) {
    const seat = a.pos;
    n.target = a.key;
    const side: Pt = [seat[0] + 0.9, seat[1] + (a.facing === 'ne' ? 0.4 : -0.4)];
    const g = this.floor.grid;
    const p: Pt = g.isBlocked(Math.floor(side[0]), Math.floor(side[1])) ? (g.nearestFree(Math.floor(side[0]), Math.floor(side[1])) ?? side) : side;
    n.doing = { kind, until: now + ms + 4000, spot: { pos: [p[0] + 0.5 * (p === side ? 0 : 1), p[1] + 0.5 * (p === side ? 0 : 1)], facing: 'nw' } };
    this.go(n, n.doing.spot!.pos);
    setTimeoutLike(this, n, now + ms + 4000);
  }

  private reactToAgents(now: number) {
    for (const n of this.npcs) if (n.target && n.doing && now >= n.doing.until) n.target = undefined;
    const hq = this.hqFloor();
    if (!hq) return;
    for (const a of this.world.floorAgents(hq)) {
      if (a.phase !== 'active' || a.place !== 'desk' || a.path.length) continue;
      const since = now - a.statusSince;
      if (a.status === 'error' && since < 4000 && this.cooldown('err:' + a.key, now, 20000)) {
        const n = this.freeCoworker(hq);
        if (n) this.attend(n, a, 'bring-coffee', 4000, now);
      } else if (a.status === 'thinking' && since > 12000 && this.cooldown('think:' + a.key, now, 40000)) {
        const n = this.freeCoworker(hq);
        if (n) this.attend(n, a, 'peek', 3500, now);
      } else if (a.status === 'waiting_user' && since > 2500 && this.cooldown('wait:' + a.key, now, 30000)) {
        const n = this.freeCoworker(hq);
        if (n) this.attend(n, a, 'wait-near', 6000, now);
      }
    }
    for (const e of this.world.effects) {
      if (e.floorId !== hq) continue;
      if (e.kind === 'clap' && this.cooldown('clap', now, 5000)) {
        for (const n of this.npcs) if (n.role === 'coworker' && n.floorId === hq && !n.path.length) n.doing = { kind: 'clap', until: now + 2200 };
      }
      if (e.kind === 'package' && this.cooldown('courier', now, 25000)) {
        const c = this.make('courier', 'npc_courier', 'office', this.floor.spots.elevator.pos, now, hq);
        c.doing = { kind: 'deliver', until: now + 2500, spot: { pos: [e.pos[0] + 0.8, e.pos[1]], facing: 'nw' } };
        this.go(c, [e.pos[0] + 0.8, e.pos[1]]);
        c.speed = 2.6;
      }
    }
  }
}

/** Marks the end of an attendance; kept as a function so the sim stays timer-free and deterministic. */
function setTimeoutLike(_sim: NpcSim, n: Npc, until: number) {
  if (n.doing) n.doing.until = until;
}
