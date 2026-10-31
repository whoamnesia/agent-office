import { Container, Graphics, Sprite, Texture, type Renderer } from 'pixi.js';
import { FLOOR_D, FLOOR_W, type Agent, type Building, type DayState, type FloorPlan, type Npc, type World } from '@agent-office/office-core';
import type { Atlas } from '../assets.js';
import { depth, isoX, isoY } from '../iso.js';
import { CharacterView } from './character.js';

export const STATUS_COLOR: Record<string, number> = {
  thinking: 0xb69cff,
  reading: 0x6fc3ff,
  writing: 0xffb35c,
  running: 0x7ef0a0,
  searching: 0xffe08a,
  waiting_user: 0xff8f6b,
  error: 0xff5a5a,
  done: 0x57d68d,
  idle: 0x9a8fa8,
};

const SCREEN_FOR: Record<string, string> = {
  thinking: 'screen_think',
  reading: 'screen_code',
  writing: 'screen_code',
  running: 'screen_term',
  searching: 'screen_search',
  waiting_user: 'screen_wait',
  error: 'screen_error',
  done: 'screen_done',
  idle: 'screen_idle',
};
const SCREEN_LIGHT: Record<string, number> = { screen_code: 0x9fb8ff, screen_term: 0x7ef0a0, screen_error: 0xff5a5a, screen_search: 0xffe08a, screen_wait: 0xffd76a, screen_idle: 0x9a7fd0, screen_think: 0xa9c0ff, screen_done: 0x6fe39a };

export interface Ctx {
  atlas: Atlas;
  world: World;
  renderer: Renderer;
  lightWorld: Container;
  shell: { tex: Texture; x: number; y: number };
  overlayWorld: Container;
}

export function lightSprite(atlas: Atlas, color: number, radius: number, alpha = 1): Sprite {
  const s = new Sprite(atlas.get('light_radial'));
  s.anchor.set(0.5);
  s.scale.set(radius / 64);
  s.tint = color;
  s.alpha = alpha;
  s.blendMode = 'add';
  return s;
}

/** Bakes everything static on a storey (floor, back walls, wall decor, rugs) into one shared texture. */
export function bakeShell(renderer: Renderer, atlas: Atlas, plan: FloorPlan): { tex: Texture; x: number; y: number } {
  const c = new Container();
  for (let y = 0; y < plan.d; y++)
    for (let x = 0; x < plan.w; x++) {
      const s = new Sprite(atlas.get(plan.tiles[y]![x]!));
      s.position.set(isoX(x, y), isoY(x, y));
      c.addChild(s);
    }
  for (const it of plan.items.filter((i) => i.layer === 'floor')) {
    const s = new Sprite(atlas.get(it.sprite));
    s.position.set(isoX(it.x, it.y), isoY(it.x, it.y));
    c.addChild(s);
  }
  for (const wl of [...plan.walls].sort((a, b) => a.x + a.y - (b.x + b.y))) {
    const s = new Sprite(atlas.get(wl.sprite));
    s.position.set(isoX(wl.x, wl.y), isoY(wl.x, wl.y));
    c.addChild(s);
  }
  for (const it of plan.items.filter((i) => i.layer === 'wall')) {
    const s = new Sprite(atlas.get(it.sprite));
    s.position.set(isoX(it.x, it.y), isoY(it.x, it.y));
    c.addChild(s);
  }
  const b = c.getLocalBounds();
  const tex = renderer.generateTexture({ target: c, resolution: 1, textureSourceOptions: { scaleMode: 'nearest' } });
  c.destroy({ children: true });
  return { tex, x: b.x, y: b.y };
}

/** One storey shown as an open dollhouse cut. */
export class InteriorView {
  readonly root = new Container();
  readonly lights = new Container();
  private chars = new Map<string, CharacterView>();
  private npcs = new Map<string, CharacterView>();
  private screens = new Map<string, { s: Sprite; light: Sprite; desk: { x: number; y: number } }>();
  private boards = new Graphics();
  private ceiling: Sprite[] = [];
  private itemLights: { s: Sprite; night?: boolean; flicker?: boolean; base: number }[] = [];
  private lastBoardKey = '';
  readonly icons = new Map<string, Sprite>();

  constructor(
    private readonly ctx: Ctx,
    readonly floorId: string,
  ) {
    const { atlas, world } = ctx;
    const plan = world.plan;
    this.root.sortableChildren = true;
    const shell = new Sprite(ctx.shell.tex);
    shell.position.set(ctx.shell.x, ctx.shell.y);
    shell.zIndex = -1e6;
    this.boards.zIndex = -1e6 + 1;
    this.root.addChild(shell, this.boards);
    for (const it of plan.items) {
      if (it.layer === 'floor' || it.layer === 'wall') continue;
      const s = new Sprite(atlas.get(it.sprite));
      s.position.set(isoX(it.x, it.y), isoY(it.x, it.y));
      s.zIndex = depth(it.x + it.w / 2, it.y + it.d / 2, it.bias ?? 0);
      this.root.addChild(s);
    }
    for (const it of plan.items)
      if (it.light) {
        const l = lightSprite(atlas, it.light.color, it.light.radius, 0.7);
        l.position.set(isoX(it.x + (it.light.dx ?? 0), it.y + (it.light.dy ?? 0)), isoY(it.x + (it.light.dx ?? 0), it.y + (it.light.dy ?? 0), it.light.z));
        this.lights.addChild(l);
        this.itemLights.push({ s: l, night: it.light.night, flicker: it.light.flicker, base: 0.7 });
      }
    for (const g of plan.glass) {
      const s = new Sprite(atlas.get(g.sprite));
      s.position.set(isoX(g.x, g.y), isoY(g.x, g.y));
      s.zIndex = g.axis === 'x' ? depth(g.x + 0.5, g.y) : depth(g.x, g.y + 0.5);
      this.root.addChild(s);
    }
    for (const d of plan.desks) {
      const desk = new Sprite(atlas.get(d.sprite));
      desk.position.set(isoX(d.x, d.y), isoY(d.x, d.y));
      const dw = d.sprite === 'desk_director' ? 2.4 : d.sprite === 'terminal' ? 1 : 2;
      const dd = d.sprite === 'terminal' ? 0.7 : 1;
      desk.zIndex = depth(d.x + dw / 2, d.y + dd / 2);
      this.root.addChild(desk);
      if (d.chair) {
        const ch = new Sprite(atlas.get(d.chair));
        ch.position.set(isoX(d.seat[0] - 0.5, d.seat[1] - 0.5), isoY(d.seat[0] - 0.5, d.seat[1] - 0.5));
        ch.zIndex = depth(d.seat[0], d.seat[1], d.facing === 'ne' ? 0.06 : -0.06);
        this.root.addChild(ch);
      }
      if (d.screen) {
        const s = new Sprite(atlas.get('screen_idle_0'));
        s.position.set(desk.x, desk.y);
        s.zIndex = desk.zIndex + 0.001;
        s.visible = false;
        this.root.addChild(s);
        const light = lightSprite(atlas, 0x9fb8ff, 34, 0);
        light.position.set(isoX(d.x + 1, d.y + 0.9), isoY(d.x + 1, d.y + 0.9, 22));
        this.lights.addChild(light);
        this.screens.set(d.id, { s, light, desk: { x: d.x, y: d.y } });
      }
      for (const deco of d.decor) {
        const s = new Sprite(atlas.get(deco));
        const [px, py] = d.sprite === 'desk_b' ? [d.x + 1.65, d.y + 0.35] : [d.x + 0.35, d.y + 0.45];
        s.position.set(isoX(px, py), isoY(px, py, 13));
        s.zIndex = desk.zIndex + 0.002;
        this.root.addChild(s);
      }
    }
    // warm ceiling lights spread over the storey; they make the office cosy at night
    for (const [x, y] of [[3, 3], [8, 2], [14, 2], [8, 7], [13, 7], [3, 9], [8, 12], [16, 12], [3, 13], [18, 6]] as [number, number][]) {
      const l = lightSprite(atlas, 0xffd2a0, 120, 0);
      l.position.set(isoX(x, y), isoY(x, y, 30));
      this.lights.addChild(l);
      this.ceiling.push(l);
    }
  }

  setOrigin(x: number, y: number) {
    this.root.position.set(x, y);
    this.lights.position.set(x, y);
  }

  /** 0 = tower seen closed from afar (interior light must not leak onto the roof), 1 = open dollhouse */
  openness = 1;

  update(dt: number, now: number, day: DayState, npcs: Npc[], selected: string | undefined, hovered: string | undefined): void {
    const { world, atlas } = this.ctx;
    const vis = 0.15 + 0.85 * this.openness;
    const plan = world.plan;
    const floor = world.floors.get(this.floorId);
    const agents = world.floorAgents(this.floorId);
    // characters
    const seen = new Set<string>();
    for (const a of agents) {
      seen.add(a.key);
      let v = this.chars.get(a.key);
      if (!v) {
        v = new CharacterView(atlas, a.preset);
        this.chars.set(a.key, v);
        this.root.addChild(v);
      }
      v.setPreset(a.preset);
      v.set(a.anim, a.facing);
      v.update(dt);
      v.position.set(Math.round(isoX(a.pos[0], a.pos[1])), Math.round(isoY(a.pos[0], a.pos[1])));
      v.zIndex = depth(a.pos[0], a.pos[1], 0.001);
      v.ring(STATUS_COLOR[a.status] ?? 0xffffff, a.key === selected ? 2 : a.key === hovered ? 1 : 0, now);
    }
    for (const [k, v] of this.chars)
      if (!seen.has(k)) {
        v.destroy({ children: true });
        this.chars.delete(k);
      }
    // background NPCs living on this floor
    const npcSeen = new Set<string>();
    for (const n of npcs) {
      if (n.area !== 'office' || n.floorId !== this.floorId) continue;
      npcSeen.add(n.id);
      let v = this.npcs.get(n.id);
      if (!v) {
        v = new CharacterView(atlas, n.preset, n.role === 'cat' ? 'cat' : n.role === 'mascot' ? 'mascot' : undefined);
        v.dim = true;
        this.npcs.set(n.id, v);
        this.root.addChild(v);
      }
      const critter = n.role === 'cat' || n.role === 'mascot';
      v.set(critter ? (n.path.length ? 'walk' : (n.doing?.kind ?? 'sit')) : n.anim, n.facing);
      v.update(dt);
      v.position.set(Math.round(isoX(n.pos[0], n.pos[1])), Math.round(isoY(n.pos[0], n.pos[1])));
      v.zIndex = depth(n.pos[0], n.pos[1], 0.002);
    }
    for (const [k, v] of this.npcs)
      if (!npcSeen.has(k)) {
        v.destroy({ children: true });
        this.npcs.delete(k);
      }
    // monitors follow their owners' status
    const ownerOf = new Map<string, Agent>();
    if (floor) for (const [deskId, key] of floor.deskOwner) {
      const a = world.agents.get(key);
      if (a) ownerOf.set(deskId, a);
    }
    const frame = Math.floor(now / 330);
    for (const [deskId, sc] of this.screens) {
      const a = ownerOf.get(deskId);
      if (!a || a.phase === 'gone') {
        sc.s.visible = false;
        sc.light.alpha = 0;
        continue;
      }
      const base = SCREEN_FOR[a.status] ?? 'screen_idle';
      const frames = base === 'screen_code' ? 3 : base === 'screen_done' ? 1 : 2;
      const name = `${base}_${(a.status === 'writing' || a.status === 'running' ? frame : Math.floor(frame / 3)) % frames}`;
      sc.s.texture = atlas.get(name);
      sc.s.visible = true;
      sc.light.tint = SCREEN_LIGHT[base] ?? 0x9fb8ff;
      sc.light.alpha = (a.status === 'error' ? 1 : 0.6) * (0.4 + day.night * 0.6) * vis;
    }
    const lit = floor && (day.night > 0.15 || agents.length > 0);
    for (const l of this.ceiling) l.alpha = lit ? (0.1 + day.night * 0.26) * this.openness : 0;
    for (const l of this.itemLights) {
      const on = l.night ? day.night : 0.4 + day.night * 0.6;
      l.s.alpha = l.base * on * vis * (l.flicker ? 0.75 + 0.25 * Math.sin(now / 90 + l.s.x) : 1);
    }
    this.drawBoards(plan, floor?.tasks ?? [], agents, now);
  }

  /** Kanban cards and the wall dashboard, drawn onto the board faces. */
  private drawBoards(plan: FloorPlan, tasks: { id: string; subject: string; done: boolean; createdAt: number }[], agents: Agent[], now: number) {
    const errors = agents.reduce((s, a) => s + a.errors, 0);
    const calls = agents.reduce((s, a) => s + a.calls, 0);
    const key = `${tasks.map((t) => t.id + (t.done ? 'd' : 'o')).join(',')}|${agents.length}|${calls}|${errors}|${Math.floor(now / 1000)}`;
    if (key === this.lastBoardKey) return;
    this.lastBoardKey = key;
    const g = this.boards.clear();
    const kb = plan.kanban;
    // board face: x from kb.x .. kb.x+3 at y=0.08, z 14..48; columns: queue / doing / done
    const P = (u: number, z: number): [number, number] => [isoX(kb.x + u * kb.w, 0.08), isoY(kb.x + u * kb.w, 0.08, z)];
    const quad = (u0: number, u1: number, z0: number, z1: number, color: number) => {
      const a = P(u0, z1);
      const b = P(u1, z1);
      const c = P(u1, z0);
      const d = P(u0, z0);
      g.poly([a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]]).fill(color);
    };
    const open = tasks.filter((t) => !t.done).sort((a, b) => b.createdAt - a.createdAt);
    const cols = [open.slice(3), open.slice(0, 3), tasks.filter((t) => t.done).slice(-6)];
    const colors = [0xf6d58a, 0x9fd0ff, 0xa9e6a0];
    cols.forEach((list, ci) => {
      list.slice(0, 6).forEach((_, i) => {
        const u0 = ci / 3 + 0.03 + (i % 2) * 0.15;
        const z1 = 40 - Math.floor(i / 2) * 8;
        quad(u0, u0 + 0.12, z1 - 6, z1, colors[ci]!);
        quad(u0 + 0.02, u0 + 0.09, z1 - 3, z1 - 2, 0x6b5a7a);
      });
    });
    // dashboard: active agents / calls / errors as bars
    const db = plan.dashboard;
    const Q = (u: number, z: number): [number, number] => [isoX(db.x + u * db.w, 0.08), isoY(db.x + u * db.w, 0.08, z)];
    const bar = (u0: number, u1: number, z0: number, z1: number, color: number) => {
      const a = Q(u0, z1);
      const b = Q(u1, z1);
      const c = Q(u1, z0);
      const d = Q(u0, z0);
      g.poly([a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]]).fill(color);
    };
    const live = agents.filter((a) => !a.director).length;
    const vals = [Math.min(1, live / 8), Math.min(1, calls / 120), Math.min(1, errors / 10)];
    const cl = [0x7ef0a0, 0x6fc3ff, 0xff6b6b];
    vals.forEach((v, i) => bar(0.1 + i * 0.28, 0.3 + i * 0.28, 21, 21 + Math.max(1, v * 16), cl[i]!));
    bar(0.06, 0.94, 39, 40, 0x3a3f66);
  }

  /** Head position (local) of an agent's character, for icons and tags. */
  headOf(key: string): [number, number] | undefined {
    const v = this.chars.get(key);
    return v ? [v.x, v.y - 34] : undefined;
  }

  destroy() {
    this.root.destroy({ children: true });
    this.lights.destroy({ children: true });
  }
}

/** A project tower: lobby, storeys (closed facades / one open interior / ghosted upper floors) and a roof. */
export class BuildingView {
  readonly root = new Container();
  readonly lights = new Container();
  private lobby: Sprite;
  private roof: Sprite;
  private storeys = new Map<string, { slab: Sprite; facade: Sprite; lit: Sprite; glow: Sprite; glass: Sprite }>();
  interior?: InteriorView;
  private lobbyLight: Sprite;

  constructor(
    private readonly ctx: Ctx,
    readonly building: Building,
  ) {
    const { atlas } = ctx;
    const [lx, ly] = building.lot;
    this.root.position.set(isoX(lx, ly), isoY(lx, ly));
    this.lights.position.copyFrom(this.root.position);
    this.root.zIndex = depth(lx + FLOOR_W / 2, ly + FLOOR_D / 2);
    this.lobby = new Sprite(atlas.get('tower_lobby'));
    this.roof = new Sprite(atlas.get('tower_roof'));
    this.root.addChild(this.lobby, this.roof);
    this.lobbyLight = lightSprite(atlas, 0xffd59a, 220, 0);
    this.lobbyLight.position.set(isoX(FLOOR_W, FLOOR_D / 2), isoY(FLOOR_W, FLOOR_D / 2, 20));
    this.lights.addChild(this.lobbyLight);
  }

  update(dt: number, now: number, day: DayState, openness: number, npcs: Npc[], selected?: string, hovered?: string): void {
    const { atlas, world, renderer: _r } = this.ctx;
    const man = atlas.manifest.floor;
    const b = this.building;
    const floors = b.floors;
    const openIdx = Math.max(0, b.openFloor ? floors.indexOf(b.openFloor) : floors.length - 1);
    const seen = new Set<string>();
    floors.forEach((fid, i) => {
      seen.add(fid);
      let st = this.storeys.get(fid);
      if (!st) {
        const slab = new Sprite(atlas.get('tower_slab'));
        const facade = new Sprite(atlas.get('tower_facade'));
        const lit = new Sprite(atlas.get('tower_facade_lit'));
        const glow = new Sprite(atlas.get('tower_facade_lit'));
        glow.blendMode = 'add';
        const glass = new Sprite(atlas.get('tower_glass_front'));
        st = { slab, facade, lit, glow, glass };
        this.storeys.set(fid, st);
        this.root.addChild(slab, facade, lit, glass);
        this.lights.addChild(glow);
      }
      const z = man.lobbyH + i * man.storeyH;
      st.slab.position.set(0, -z);
      for (const s of [st.facade, st.lit, st.glass, st.glow]) s.position.set(0, -(z + man.slabH));
      const above = i > openIdx;
      const ghost = above ? 0.06 + (1 - openness) * 0.94 : 1;
      st.slab.alpha = above ? ghost : 1;
      st.facade.visible = i !== openIdx;
      st.facade.alpha = ghost;
      const f = world.floors.get(fid);
      const busy = f ? Math.min(1, world.floorAgents(fid).length / 3) : 0;
      st.lit.visible = i !== openIdx;
      st.lit.alpha = ghost * (day.night * 0.85 + busy * 0.15);
      st.glow.alpha = i === openIdx ? 0 : ghost * day.night * 0.55;
      st.glass.visible = i === openIdx;
      st.glass.alpha = 1 - openness * 0.92;
      // draw order: storeys bottom-up, the open interior sits between its slab and the glass
      this.root.setChildIndex(st.slab, Math.min(this.root.children.length - 1, 1 + i * 4));
    });
    for (const [fid, st] of this.storeys)
      if (!seen.has(fid)) {
        for (const s of [st.slab, st.facade, st.lit, st.glass, st.glow]) s.destroy();
        this.storeys.delete(fid);
      }
    // interior for the open floor
    const openId = floors[openIdx];
    if (this.interior && this.interior.floorId !== openId) {
      this.interior.destroy();
      this.interior = undefined;
    }
    if (openId && !this.interior) {
      this.interior = new InteriorView(this.ctx, openId);
      this.root.addChild(this.interior.root);
      this.lights.addChild(this.interior.lights);
    }
    // keep a deterministic order: lobby, then per storey [slab, facade, lit, (interior), glass], roof last
    let idx = 1;
    floors.forEach((fid, i) => {
      const st = this.storeys.get(fid)!;
      this.root.setChildIndex(st.slab, idx++);
      this.root.setChildIndex(st.facade, idx++);
      this.root.setChildIndex(st.lit, idx++);
      if (i === openIdx && this.interior) this.root.setChildIndex(this.interior.root, idx++);
      this.root.setChildIndex(st.glass, idx++);
    });
    this.root.setChildIndex(this.roof, this.root.children.length - 1);
    if (this.interior) {
      const z = man.lobbyH + openIdx * man.storeyH + man.slabH;
      this.interior.setOrigin(0, -z);
      // when the roof above is closed (overview), the interior can't light it
      this.interior.openness = openIdx === floors.length - 1 ? openness : Math.max(openness, 0.5);
      this.interior.update(dt, now, day, npcs, selected, hovered);
    }
    const top = man.lobbyH + floors.length * man.storeyH;
    this.roof.position.set(0, -top);
    this.roof.alpha = openIdx === floors.length - 1 ? 1 - openness * 0.9 : 0.06 + (1 - openness) * 0.94;
    this.lobbyLight.alpha = 0.25 + day.night * 0.6;
  }

  lobbyTint(c: number) {
    this.lobby.tint = c;
    this.roof.tint = c;
  }

  /** Height in px of the whole tower (for shadows). */
  get height(): number {
    const man = this.ctx.atlas.manifest.floor;
    return man.lobbyH + this.building.floors.length * man.storeyH + 10;
  }

  /** World-space z of the open interior floor. */
  openZ(): number {
    const man = this.ctx.atlas.manifest.floor;
    const b = this.building;
    const openIdx = Math.max(0, b.openFloor ? b.floors.indexOf(b.openFloor) : b.floors.length - 1);
    return man.lobbyH + openIdx * man.storeyH + man.slabH;
  }

  destroy() {
    this.interior?.destroy();
    this.root.destroy({ children: true });
    this.lights.destroy({ children: true });
  }
}
