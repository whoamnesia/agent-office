import { Container, Graphics, Sprite } from 'pixi.js';
import { FLOOR_D, FLOOR_W, TrafficSim, type CityPlan, type DayState, type Item, type Npc, type NpcSim, type Vehicle } from '@agent-office/office-core';
import type { Atlas } from '../assets.js';
import { depth, isoX, isoY } from '../iso.js';
import { CharacterView } from './character.js';
import { lightSprite } from './building.js';

interface PropView {
  item: Item;
  s: Sprite;
  light?: Sprite;
}

/** Everything outdoors: props, decorative towers, vehicles, pedestrians, pigeons, cast shadows. */
export class CityView {
  readonly lights = new Container();
  readonly shadows = new Graphics();
  private props: PropView[] = [];
  private towers: { s: Sprite; night: Sprite; glow: Sprite; x: number; y: number }[] = [];
  private vehicles = new Map<string, { s: Sprite; head?: Sprite; tail?: Sprite; extra: Sprite[] }>();
  private people = new Map<string, CharacterView>();
  private dogs = new Map<string, CharacterView>();
  private pigeons: Sprite[] = [];
  private lastShadowKey = '';
  private flashlights = new Map<string, Sprite>();

  constructor(
    private readonly atlas: Atlas,
    private readonly city: CityPlan,
    private readonly objects: Container,
  ) {
    for (const t of city.decorTowers) {
      const s = new Sprite(atlas.get(`dtower_${t.kind}`));
      const night = new Sprite(atlas.get(`dtower_${t.kind}_night`));
      const glow = new Sprite(atlas.get(`dtower_${t.kind}_night`));
      glow.blendMode = 'add';
      for (const x of [s, night, glow]) x.position.set(isoX(t.x, t.y), isoY(t.x, t.y));
      const c = new Container();
      c.addChild(s, night);
      c.zIndex = depth(t.x + 4.5, t.y + 4.5);
      objects.addChild(c);
      this.lights.addChild(glow);
      this.towers.push({ s, night, glow, x: t.x, y: t.y });
    }
    for (const item of city.items) {
      const s = new Sprite(atlas.get(item.sprite));
      s.position.set(isoX(item.x, item.y), isoY(item.x, item.y));
      s.zIndex = depth(item.x + item.w / 2, item.y + item.d / 2);
      objects.addChild(s);
      const pv: PropView = { item, s };
      if (item.light) {
        const l = lightSprite(atlas, item.light.color, item.light.radius, 0);
        l.position.set(isoX(item.x + (item.light.dx ?? 0) + 0.3, item.y + (item.light.dy ?? 0) + 0.3), isoY(item.x + (item.light.dx ?? 0) + 0.3, item.y + (item.light.dy ?? 0) + 0.3, item.light.z));
        this.lights.addChild(l);
        pv.light = l;
      }
      this.props.push(pv);
    }
    for (let i = 0; i < 16; i++) {
      const s = new Sprite(atlas.get('pigeon_0'));
      s.anchor.set(0.5, 0.9);
      objects.addChild(s);
      this.pigeons.push(s);
    }
  }

  update(dt: number, now: number, day: DayState, traffic: TrafficSim, npcs: NpcSim, season: { halloween: boolean }, buildings: { lot: [number, number]; height: number }[]) {
    const { atlas } = this;
    const fountainFrame = Math.floor(now / 160) % 3;
    for (const p of this.props) {
      const sp = p.item.sprite;
      if (p.item.tag === 'halloween') {
        p.s.visible = season.halloween;
        if (p.light) p.light.visible = season.halloween;
      }
      if (p.item.tag === 'fountain') p.s.texture = atlas.get(`fountain_${fountainFrame}`);
      if (p.item.tag === 'traffic') {
        // the far-side light shows the car signal; pedestrians see the inverse
        const st = traffic.light === 'green' ? 'green' : traffic.light === 'yellow' ? 'yellow' : 'red';
        p.s.texture = atlas.get(`traffic_${st}`);
      }
      if (p.light) {
        const flick = p.item.light!.flicker ? 0.8 + 0.2 * Math.sin(now / 70 + p.s.x) : 1;
        p.light.alpha = (p.item.light!.night ? Math.max(0, day.night * 1.05 - 0.15) * (sp === 'lamppost' ? 0.75 : 1) : 0.5 + day.night * 0.5) * flick;
      }
      if (sp === 'lamppost') p.s.tint = day.night > 0.3 ? 0xffffff : 0xe8e8e8;
    }
    for (const t of this.towers) {
      t.night.alpha = Math.max(0, day.night * 1.1 - 0.1);
      t.glow.alpha = t.night.alpha * 0.8;
    }
    this.updateVehicles(traffic.vehicles, day);
    this.updatePeople(dt, npcs.npcs, day, now);
    // pigeons
    npcs.pigeons.forEach((p, i) => {
      const s = this.pigeons[i];
      if (!s) return;
      const fly = p.fly > 0;
      s.texture = atlas.get(`${fly ? 'pigeon_fly' : 'pigeon'}_${Math.floor(now / (fly ? 120 : 600) + i) % 2}`);
      s.position.set(Math.round(isoX(p.pos[0], p.pos[1])), Math.round(isoY(p.pos[0], p.pos[1], fly ? 18 : 0)));
      s.scale.x = p.facing === 'sw' ? -1 : 1;
      s.zIndex = depth(p.pos[0], p.pos[1], fly ? 30 : 0);
    });
    this.drawShadows(day, buildings);
  }

  private updateVehicles(list: Vehicle[], day: DayState) {
    const seen = new Set<string>();
    for (const v of list) {
      seen.add(v.id);
      let view = this.vehicles.get(v.id);
      if (!view) {
        const s = new Sprite(this.atlas.get(TrafficSim.sprite(v)));
        this.objects.addChild(s);
        view = { s, extra: [] };
        if (v.kind !== 'boat' && v.kind !== 'train') {
          view.head = lightSprite(this.atlas, 0xfff1c6, 46, 0);
          view.tail = lightSprite(this.atlas, 0xff4a4a, 16, 0);
          this.lights.addChild(view.head, view.tail);
        } else if (v.kind === 'boat') {
          view.head = lightSprite(this.atlas, 0xffd59a, 40, 0);
          this.lights.addChild(view.head);
        }
        for (let k = 1; k < (v.wagons ?? 1); k++) {
          const w = new Sprite(this.atlas.get(TrafficSim.sprite(v)));
          this.objects.addChild(w);
          view.extra.push(w);
        }
        this.vehicles.set(v.id, view);
      }
      view.s.texture = this.atlas.get(TrafficSim.sprite(v));
      view.s.position.set(Math.round(isoX(v.pos[0], v.pos[1])), Math.round(isoY(v.pos[0], v.pos[1])));
      const w = v.axis === 'x' ? v.len : 1;
      const d = v.axis === 'x' ? 1 : v.len;
      view.s.zIndex = depth(v.pos[0] + w / 2, v.pos[1] + d / 2);
      view.extra.forEach((e, k) => {
        const off = (k + 1) * (v.len + 0.15) * (v.dir === 'p' ? -1 : 1);
        e.position.set(Math.round(isoX(v.pos[0] + off, v.pos[1])), Math.round(isoY(v.pos[0] + off, v.pos[1])));
        e.zIndex = depth(v.pos[0] + off + w / 2, v.pos[1] + 0.5);
      });
      const lightsOn = day.night > 0.25 && v.state !== 'parked';
      if (view.head) {
        const fx = v.axis === 'x' ? (v.dir === 'p' ? v.pos[0] + w + 0.8 : v.pos[0] - 0.8) : v.pos[0] + 0.5;
        const fy = v.axis === 'y' ? (v.dir === 'p' ? v.pos[1] + d + 0.8 : v.pos[1] - 0.8) : v.pos[1] + 0.5;
        view.head.position.set(isoX(fx, fy), isoY(fx, fy, 4));
        view.head.alpha = lightsOn ? 0.8 : 0;
      }
      if (view.tail) {
        const bx = v.axis === 'x' ? (v.dir === 'p' ? v.pos[0] - 0.1 : v.pos[0] + w + 0.1) : v.pos[0] + 0.5;
        const by = v.axis === 'y' ? (v.dir === 'p' ? v.pos[1] - 0.1 : v.pos[1] + d + 0.1) : v.pos[1] + 0.5;
        view.tail.position.set(isoX(bx, by), isoY(bx, by, 6));
        view.tail.alpha = lightsOn ? 0.7 : v.speed < 0.5 && v.state === 'drive' ? 0.5 : 0;
      }
    }
    for (const [id, view] of this.vehicles)
      if (!seen.has(id)) {
        view.s.destroy();
        view.head?.destroy();
        view.tail?.destroy();
        view.extra.forEach((e) => e.destroy());
        this.vehicles.delete(id);
      }
  }

  private updatePeople(dt: number, list: Npc[], day: DayState, now: number) {
    const seen = new Set<string>();
    for (const n of list) {
      if (n.area !== 'city') continue;
      seen.add(n.id);
      let v = this.people.get(n.id);
      if (!v) {
        v = new CharacterView(this.atlas, n.preset);
        v.dim = true;
        this.objects.addChild(v);
        this.people.set(n.id, v);
      }
      v.set(n.anim, n.facing);
      v.update(dt);
      v.position.set(Math.round(isoX(n.pos[0], n.pos[1])), Math.round(isoY(n.pos[0], n.pos[1])));
      v.zIndex = depth(n.pos[0], n.pos[1], 0.003);
      if (n.dog) {
        let d = this.dogs.get(n.id);
        if (!d) {
          d = new CharacterView(this.atlas, n.dog.kind, n.dog.kind as 'dog_corgi');
          this.objects.addChild(d);
          this.dogs.set(n.id, d);
        }
        d.set(n.dog.anim, n.dog.facing);
        d.update(dt);
        d.position.set(Math.round(isoX(n.dog.pos[0], n.dog.pos[1])), Math.round(isoY(n.dog.pos[0], n.dog.pos[1])));
        d.zIndex = depth(n.dog.pos[0], n.dog.pos[1], 0.003);
      }
      if (n.role === 'guard') {
        let f = this.flashlights.get(n.id);
        if (!f) {
          f = lightSprite(this.atlas, 0xfff6c2, 34, 0);
          this.lights.addChild(f);
          this.flashlights.set(n.id, f);
        }
        const ahead = n.facing === 'se' ? [1.2, 0] : n.facing === 'nw' ? [-1.2, 0] : n.facing === 'sw' ? [0, 1.2] : [0, -1.2];
        f.position.set(isoX(n.pos[0] + ahead[0]!, n.pos[1] + ahead[1]!), isoY(n.pos[0] + ahead[0]!, n.pos[1] + ahead[1]!));
        f.alpha = day.night * (0.8 + 0.2 * Math.sin(now / 50));
      }
    }
    for (const [id, v] of this.people)
      if (!seen.has(id)) {
        v.destroy({ children: true });
        this.people.delete(id);
        this.dogs.get(id)?.destroy({ children: true });
        this.dogs.delete(id);
        this.flashlights.get(id)?.destroy();
        this.flashlights.delete(id);
      }
  }

  /** Long violet-blue cast shadows that rotate with the sun. */
  private drawShadows(day: DayState, buildings: { lot: [number, number]; height: number }[]) {
    const key = `${day.shadow.dx.toFixed(2)}|${day.shadow.dy.toFixed(2)}|${day.shadow.alpha.toFixed(2)}|${buildings.map((b) => b.height).join(',')}`;
    if (key === this.lastShadowKey) return;
    this.lastShadowKey = key;
    const g = this.shadows.clear();
    const { dx, dy, alpha } = day.shadow;
    const color = 0x2a1a55;
    const castBox = (x: number, y: number, w: number, d: number, h: number, a: number) => {
      const base = [
        [x, y],
        [x + w, y],
        [x + w, y + d],
        [x, y + d],
      ].map(([tx, ty]) => [isoX(tx!, ty!), isoY(tx!, ty!)] as [number, number]);
      const top = base.map(([sx, sy]) => [sx + dx * h, sy + dy * h] as [number, number]);
      const pts = hull([...base, ...top]);
      g.poly(pts.flat()).fill({ color, alpha: a });
    };
    for (const b of buildings) castBox(b.lot[0], b.lot[1], FLOOR_W, FLOOR_D, b.height * 0.5, alpha * 0.85);
    for (const t of this.city.decorTowers) castBox(t.x, t.y, 9, 9, 160, alpha * 0.7);
    for (const p of this.props) {
      const s = p.item.sprite;
      const tall = s.startsWith('tree') ? 34 : s === 'lamppost' ? 40 : s === 'billboard' ? 50 : s === 'cafe' || s === 'metro' ? 16 : 0;
      if (!tall) continue;
      if (s.startsWith('tree')) {
        const [cx, cy] = [isoX(p.item.x + 0.5, p.item.y + 0.5), isoY(p.item.x + 0.5, p.item.y + 0.5)];
        g.ellipse(cx + dx * tall, cy + dy * tall, 13, 6).fill({ color, alpha: alpha * 0.8 });
      } else castBox(p.item.x, p.item.y, p.item.w, p.item.d, tall, alpha * 0.6);
    }
  }
}

/** Convex hull (monotone chain) for shadow polygons. */
function hull(points: [number, number][]): [number, number][] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: [number, number][] = [];
  for (const q of p.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
