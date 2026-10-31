/** Cars, taxis, buses, trams, boats and the MCC train, with a traffic light and a parking lot that fills in the morning. */
import type { CityPlan, ParkingSpot } from './city-layout.js';
import { CITY_W, CROSSWALK_X, ROWS } from './city-layout.js';
import type { Pt } from './grid.js';
import type { DayState } from './time.js';

export type VehicleKind = 'car' | 'taxi' | 'bus' | 'tram' | 'boat' | 'train';

export interface Vehicle {
  id: string;
  kind: VehicleKind;
  color: string;
  /** footprint origin in tiles */
  pos: Pt;
  axis: 'x' | 'y';
  dir: 'p' | 'n';
  len: number;
  speed: number;
  maxSpeed: number;
  lane: 'W' | 'E' | 'tram' | 'boatE' | 'boatW' | 'train' | 'park';
  state: 'drive' | 'stop' | 'parked' | 'parking' | 'leaving';
  until: number;
  route?: Pt[];
  spot?: ParkingSpot;
  /** cars are a 3-segment train: offsets for the extra wagons */
  wagons?: number;
}

export type LightState = 'green' | 'yellow' | 'red';
const CAR_COLORS = ['white', 'red', 'blue', 'graphite', 'white', 'graphite'];
const r = (() => {
  let s = 0x1234567;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();

export function carDensity(hour: number): number {
  if (hour < 6) return 0.15;
  if (hour < 10) return 1;
  if (hour < 17) return 0.6;
  if (hour < 20) return 1;
  if (hour < 23) return 0.45;
  return 0.25;
}

/** Share of parking spots taken for an hour: empty at night, full in office hours. */
export function parkingFill(hour: number): number {
  if (hour < 7) return 0.12;
  if (hour < 10) return 0.12 + ((hour - 7) / 3) * 0.75;
  if (hour < 17) return 0.87;
  if (hour < 20) return 0.87 - ((hour - 17) / 3) * 0.7;
  return 0.17;
}

export class TrafficSim {
  vehicles: Vehicle[] = [];
  light: LightState = 'green';
  private seq = 0;
  private lastSpawn: Record<string, number> = {};
  private cycleStart = 0;

  constructor(private readonly city: CityPlan) {}

  /** Light cycle: 12 s green for cars, 2 s yellow, 9 s red (pedestrians cross). */
  updateLight(now: number): LightState {
    const t = ((now - this.cycleStart) / 1000) % 23;
    this.light = t < 12 ? 'green' : t < 14 ? 'yellow' : 'red';
    return this.light;
  }

  /** Fills the lot to match the current hour without animation (used on first frame). */
  seedParking(hour: number): void {
    const want = Math.round(this.city.parking.length * parkingFill(hour));
    for (const spot of this.city.parking.slice(0, want)) this.park(spot);
  }

  private park(spot: ParkingSpot): Vehicle {
    const v: Vehicle = { id: `v${this.seq++}`, kind: 'car', color: CAR_COLORS[this.seq % CAR_COLORS.length]!, pos: [spot.x, spot.y], axis: 'y', dir: spot.y < 25 ? 'n' : 'p', len: 2, speed: 0, maxSpeed: 3, lane: 'park', state: 'parked', until: 0, spot };
    this.vehicles.push(v);
    return v;
  }

  tick(dtMs: number, now: number, day: DayState): void {
    const dt = Math.min(dtMs, 250) / 1000;
    const hour = day.t * 24;
    if (!this.cycleStart) this.cycleStart = now;
    this.updateLight(now);
    this.spawn(now, hour);
    for (const v of this.vehicles) this.step(v, dt, now);
    this.vehicles = this.vehicles.filter((v) => v.pos[0] > -30 && v.pos[0] < CITY_W + 30);
    this.manageParking(now, hour);
  }

  private every(key: string, now: number, ms: number): boolean {
    if (now - (this.lastSpawn[key] ?? -1e12) < ms) return false;
    this.lastSpawn[key] = now;
    return true;
  }

  private spawn(now: number, hour: number) {
    const dens = carDensity(hour);
    const mk = (v: Omit<Vehicle, 'id' | 'speed' | 'state' | 'until'>) => this.vehicles.push({ ...v, id: `v${this.seq++}`, speed: v.maxSpeed, state: 'drive', until: 0 });
    if (this.every('W', now, 2600 / dens + r() * 2500)) {
      const taxi = r() < 0.3;
      mk({ kind: taxi ? 'taxi' : 'car', color: taxi ? 'taxi' : CAR_COLORS[Math.floor(r() * CAR_COLORS.length)]!, pos: [CITY_W + 20, ROWS.laneW], axis: 'x', dir: 'n', len: 2, maxSpeed: 4 + r(), lane: 'W' });
    }
    if (this.every('E', now, 2800 / dens + r() * 2500)) {
      const taxi = r() < 0.3;
      mk({ kind: taxi ? 'taxi' : 'car', color: taxi ? 'taxi' : CAR_COLORS[Math.floor(r() * CAR_COLORS.length)]!, pos: [-22, ROWS.laneE], axis: 'x', dir: 'p', len: 2, maxSpeed: 4 + r(), lane: 'E' });
    }
    if (hour >= 6 && hour < 23.5 && this.every('bus', now, 55000)) mk({ kind: 'bus', color: 'bus', pos: [-24, ROWS.laneE], axis: 'x', dir: 'p', len: 4, maxSpeed: 3.2, lane: 'E' });
    // single track: one tram on it at a time
    if (hour >= 5.5 && !this.vehicles.some((x) => x.kind === 'tram') && this.every('tram', now, 30000)) {
      const p = r() < 0.5;
      mk({ kind: 'tram', color: 'tram', pos: [p ? -26 : CITY_W + 22, ROWS.tram], axis: 'x', dir: p ? 'p' : 'n', len: 5, maxSpeed: 3, lane: 'tram' });
    }
    if (this.every('boatE', now, 42000)) mk({ kind: 'boat', color: 'boat', pos: [-26, ROWS.boatE], axis: 'x', dir: 'p', len: 4, maxSpeed: 1.2, lane: 'boatE' });
    if (this.every('boatW', now, 51000)) mk({ kind: 'boat', color: 'boat', pos: [CITY_W + 22, ROWS.boatW], axis: 'x', dir: 'n', len: 4, maxSpeed: 1.1, lane: 'boatW' });
    if (this.every('train', now, 38000)) {
      const p = r() < 0.5;
      mk({ kind: 'train', color: 'train', pos: [p ? -40 : CITY_W + 28, ROWS.rail], axis: 'x', dir: p ? 'p' : 'n', len: 4, maxSpeed: 7, lane: 'train', wagons: 3 });
    }
  }

  private ahead(v: Vehicle): number {
    let gap = Infinity;
    for (const o of this.vehicles) {
      if (o === v || o.lane !== v.lane || o.dir !== v.dir || o.axis !== 'x' || v.axis !== 'x' || (o.state === 'parking' && v.lane !== 'park')) continue;
      const d = v.dir === 'p' ? o.pos[0] - (v.pos[0] + v.len) : v.pos[0] - (o.pos[0] + o.len);
      if (d >= -0.5 && d < gap) gap = d;
    }
    return gap;
  }

  private step(v: Vehicle, dt: number, now: number) {
    if (v.state === 'parked') return;
    if (v.state === 'parking' || v.state === 'leaving') return this.followRoute(v, dt);
    if (v.state === 'stop') {
      if (now < v.until) return;
      v.state = 'drive';
    }
    let target = v.maxSpeed;
    const gap = this.ahead(v);
    if (gap < 1.2) target = 0;
    else if (gap < 3) target = Math.min(target, gap - 1);
    // traffic light at the crosswalk (boats and trains ignore it)
    if (v.lane === 'W' || v.lane === 'E' || v.lane === 'tram') {
      const front = v.dir === 'p' ? v.pos[0] + v.len : v.pos[0];
      const line = v.dir === 'p' ? CROSSWALK_X[0] - 0.3 : CROSSWALK_X[1] + 1.3;
      const toLine = v.dir === 'p' ? line - front : front - line;
      if (this.light !== 'green' && toLine > -0.2 && toLine < 3.5) target = Math.min(target, Math.max(0, toLine - 0.2) * 1.5);
    }
    // stops: bus at the bus stop, tram at the tram stop
    if (v.kind === 'bus' && v.until === 0 && v.pos[0] + v.len > 38.5 && v.pos[0] + v.len < 39.5) {
      v.state = 'stop';
      v.until = now + 6000;
      v.speed = 0;
      return;
    }
    if (v.kind === 'tram' && v.until === 0 && Math.abs(v.pos[0] + v.len / 2 - 31) < 0.4) {
      v.state = 'stop';
      v.until = now + 5000;
      v.speed = 0;
      return;
    }
    v.speed += Math.sign(target - v.speed) * Math.min(Math.abs(target - v.speed), dt * 6);
    v.pos = [v.pos[0] + (v.dir === 'p' ? 1 : -1) * v.speed * dt, v.pos[1]];
  }

  private followRoute(v: Vehicle, dt: number) {
    const route = v.route ?? [];
    let budget = 2.5 * dt;
    while (budget > 0 && route.length) {
      const [tx, ty] = route[0]!;
      const dx = tx - v.pos[0];
      const dy = ty - v.pos[1];
      const d = Math.hypot(dx, dy);
      if (d < 1e-3) {
        route.shift();
        continue;
      }
      v.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      v.dir = v.axis === 'x' ? (dx > 0 ? 'p' : 'n') : dy > 0 ? 'p' : 'n';
      const mv = Math.min(budget, d);
      v.pos = [v.pos[0] + (dx / d) * mv, v.pos[1] + (dy / d) * mv];
      budget -= mv;
      if (mv >= d) route.shift();
    }
    if (!route.length) {
      if (v.state === 'parking') {
        v.state = 'parked';
        v.axis = 'y';
        v.dir = v.spot && v.spot.y < 25 ? 'n' : 'p';
      } else {
        v.lane = 'W';
        v.axis = 'x';
        v.dir = 'n';
        v.state = 'drive';
        v.pos = [v.pos[0], ROWS.laneW];
      }
    }
  }

  private manageParking(now: number, hour: number) {
    const spots = this.city.parking;
    const parked = this.vehicles.filter((v) => v.lane === 'park');
    const want = Math.round(spots.length * parkingFill(hour));
    const dw = this.city.driveway;
    if (parked.length < want && this.every('arrive', now, 7000)) {
      const free = spots.filter((s) => !parked.some((v) => v.spot === s));
      const spot = free[Math.floor(r() * free.length)];
      if (spot) {
        const v: Vehicle = {
          id: `v${this.seq++}`,
          kind: 'car',
          color: CAR_COLORS[this.seq % CAR_COLORS.length]!,
          pos: [dw[0]![0] - 0.5, dw[0]![1] - 0.5],
          axis: 'y',
          dir: 'n',
          len: 2,
          speed: 0,
          maxSpeed: 2.5,
          lane: 'park',
          state: 'parking',
          until: 0,
          spot,
          route: [[dw[1]![0] - 0.5, dw[1]![1]], [dw[2]![0] - 0.5, dw[2]![1] - 1], [spot.x, dw[2]![1] - 1], [spot.x, spot.y]],
        };
        this.vehicles.push(v);
      }
    } else if (parked.length > want + 1 && this.every('leave', now, 6000)) {
      const v = parked.find((x) => x.state === 'parked');
      if (v) {
        v.state = 'leaving';
        v.route = [[v.pos[0], dw[2]![1] - 1], [dw[2]![0] - 0.5, dw[2]![1] - 1], [dw[1]![0] - 0.5, dw[1]![1]], [dw[1]![0] - 0.5, ROWS.laneW]];
      }
    }
  }

  /** Sprite name for the renderer. */
  static sprite(v: Vehicle): string {
    const d = `${v.axis}${v.dir}`;
    if (v.kind === 'car' || v.kind === 'taxi') return `car_${v.kind === 'taxi' ? 'taxi' : v.color}_${d}`;
    return `${v.kind}_x${v.dir}`;
  }
}
