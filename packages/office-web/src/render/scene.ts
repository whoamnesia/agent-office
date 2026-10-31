import { Application, Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import {
  buildCityPlan,
  dayState,
  FLOOR_D,
  FLOOR_W,
  NpcSim,
  seasonFor,
  timeOfDay,
  TrafficSim,
  World,
  type Agent,
  type DayMode,
  type DayState,
} from '@agent-office/office-core';
import type { Atlas } from '../assets.js';
import { Camera } from '../camera.js';
import { depth, isoX, isoY } from '../iso.js';
import { bakeShell, BuildingView, lightSprite, STATUS_COLOR, type Ctx } from './building.js';
import { CityView } from './city.js';
import { Fx, Weather, type WeatherKind } from './fx.js';
import { Ground } from './ground.js';
import { Lighting } from './lighting.js';
import { SkyView, Skyline } from './sky.js';

export interface SceneConfig {
  dayMode: DayMode;
  dayCycleMinutes: number;
  timeOfDay: number;
  weather: 'auto' | WeatherKind;
  weatherFollowsHealth: boolean;
  quality: 'auto' | 'high' | 'low';
  fpsCap: 60 | 30 | 15;
  reducedMotion: boolean;
  colorblind: boolean;
  seasonal: boolean;
  showUI: boolean;
  lang: 'ru' | 'en';
}

const STATUS_ICON: Record<string, string> = {
  reading: 'icon_book',
  writing: 'icon_pen',
  running: 'icon_gear',
  searching: 'icon_search',
  waiting_user: 'icon_alert',
  error: 'icon_error',
  done: 'icon_done',
};
const CB_STATUS: Record<string, number> = { thinking: 0xcc79a7, reading: 0x56b4e9, writing: 0xe69f00, running: 0x009e73, searching: 0xf0e442, waiting_user: 0xd55e00, error: 0xff2222, done: 0x0072b2, idle: 0x999999 };

export class Scene {
  readonly camera = new Camera();
  readonly world = new World();
  readonly city = buildCityPlan();
  readonly traffic = new TrafficSim(this.city);
  readonly npcs: NpcSim;
  day: DayState = dayState(0.5);
  cfg: SceneConfig = { dayMode: 'auto', dayCycleMinutes: 15, timeOfDay: 0.45, weather: 'auto', weatherFollowsHealth: true, quality: 'auto', fpsCap: 60, reducedMotion: false, colorblind: false, seasonal: true, showUI: true, lang: 'ru' };
  selected?: string;
  hovered?: string;
  onSelect?: (key: string | undefined) => void;
  onHover?: (key: string | undefined, x: number, y: number) => void;
  fps = 60;
  weatherNow: WeatherKind = 'clear';
  /** virtual clock for replays; real time otherwise */
  clock?: () => number;
  deadline = false;

  private sceneRoot = new Container();
  private worldRoot = new Container();
  private objects = new Container();
  private lightRoot = new Container();
  private lightWorld = new Container();
  private overlayWorld = new Container();
  private overlayScreen = new Container();
  private lighting: Lighting;
  private sky: SkyView;
  private skyline: Skyline;
  private ground: Ground;
  private cityView: CityView;
  private fx: Fx;
  private weather: Weather;
  private buildings = new Map<string, BuildingView>();
  private ctx: Ctx;
  private icons = new Map<string, Sprite>();
  private tags = new Map<string, Container>();
  private bldLabels = new Map<string, Container>();
  private labelStyle = new TextStyle({ fontFamily: 'Pixelify Sans', fontSize: 14, fontWeight: '600', fill: 0xf6ead8 });
  /** relay link state shown on the Cloud Branch label */
  relayState = 'off';
  private tagStyle = new TextStyle({ fontFamily: 'Pixelify Sans', fontSize: 13, fill: 0xf6ead8 });
  private weatherAuto: { kind: WeatherKind; until: number } = { kind: 'clear', until: 0 };
  private rainbowUntil = 0;
  private disco?: { ball: Sprite; lights: Sprite[] };
  private ghost?: Sprite;
  private lastFrame = performance.now();
  private frameTimes: number[] = [];
  private lowQuality = false;
  /** per-phase frame timings in ms (exposed for profiling) */
  prof: Record<string, number> = {};
  private mark(name: string, t0: number) {
    const v = performance.now() - t0;
    this.prof[name] = (this.prof[name] ?? v) * 0.9 + v * 0.1;
    return performance.now();
  }
  private ambientLift = 0;

  constructor(
    readonly app: Application,
    readonly atlas: Atlas,
  ) {
    const r = app.renderer;
    this.npcs = new NpcSim(this.world, this.city, this.world.plan);
    this.lighting = new Lighting(r, app.screen.width, app.screen.height);
    this.sky = new SkyView(atlas);
    this.skyline = new Skyline(atlas);
    this.ground = new Ground(r, atlas, this.city);
    this.fx = new Fx(atlas);
    this.weather = new Weather(atlas);
    this.ctx = { atlas, world: this.world, renderer: r, lightWorld: this.lightWorld, shell: bakeShell(r, atlas, this.world.plan), overlayWorld: this.overlayWorld };
    this.objects.sortableChildren = true;
    this.cityView = new CityView(atlas, this.city, this.objects);
    this.worldRoot.addChild(this.ground.root, this.cityView.shadows, this.objects);
    this.sceneRoot.addChild(this.skyline.root, this.worldRoot);
    this.lightWorld.addChild(this.cityView.lights);
    this.lightRoot.addChild(this.skyline.lights, this.lightWorld);
    this.overlayWorld.addChild(this.fx.root);
    app.stage.addChild(this.sky.root, this.lighting.mesh, this.overlayWorld, this.weather.screen, this.overlayScreen);
    this.cityView.shadows.blendMode = 'normal';
    this.traffic.seedParking(this.day.t * 24);
    this.camera.bounds = { minX: isoX(0, this.city.h) - 100, maxX: isoX(this.city.w, 0) + 100, minY: isoY(0, 0) - 420, maxY: isoY(this.city.w, this.city.h) + 40 };
    this.setupDisco();
    app.ticker.add(() => this.frame());
  }

  setConfig(c: Partial<SceneConfig>) {
    this.cfg = { ...this.cfg, ...c };
    this.fx.reduced = this.cfg.reducedMotion;
    this.overlayScreen.visible = this.cfg.showUI;
  }

  // ------------------------------------------------------------------ camera helpers

  focusHQ(instant = false) {
    const b = [...this.world.buildings.values()].sort((a, b) => a.slot - b.slot)[0];
    const lot = b?.lot ?? this.city.pois.entrance[0]!;
    const view = b ? this.buildings.get(b.id) : undefined;
    const z = view ? view.openZ() : 60;
    this.camera.lookAtTile(lot[0] + FLOOR_W / 2, lot[1] + FLOOR_D / 2, z, 2, instant);
  }

  fitAll() {
    this.camera.follow = undefined;
    const w = isoX(this.city.w, 0) - isoX(0, this.city.h);
    const z = Math.max(0.35, Math.min(1.2, this.camera.w / (w * 0.9)));
    this.camera.set(isoX(this.city.w / 2, this.city.h / 2), isoY(this.city.w / 2, this.city.h / 2) - 60, z);
  }

  focusAgent(key: string, zoom = 3) {
    const a = this.world.agents.get(key);
    if (!a) return;
    const f = this.world.floors.get(a.floorId);
    const b = f && this.world.buildings.get(f.buildingId);
    if (b && b.openFloor !== a.floorId) b.openFloor = a.floorId;
    this.selected = key;
    this.camera.set(this.camera.x, this.camera.y, zoom);
    this.camera.follow = () => this.agentWorldPos(key);
  }

  focusFloor(floorId: string) {
    const f = this.world.floors.get(floorId);
    const b = f && this.world.buildings.get(f.buildingId);
    if (!b) return;
    b.openFloor = floorId;
    const view = this.buildings.get(b.id);
    this.camera.follow = undefined;
    this.camera.lookAtTile(b.lot[0] + FLOOR_W / 2, b.lot[1] + FLOOR_D / 2, view ? view.openZ() : 60, Math.max(2, this.camera.target.zoom));
  }

  /** World-container position of an agent's feet (only for agents on an open floor). */
  agentWorldPos(key: string): [number, number] | undefined {
    const a = this.world.agents.get(key);
    if (!a) return undefined;
    const f = this.world.floors.get(a.floorId);
    const b = f && this.world.buildings.get(f.buildingId);
    const view = b && this.buildings.get(b.id);
    if (!b || !view || b.openFloor !== a.floorId) return b ? [isoX(b.lot[0] + 10, b.lot[1] + 8), isoY(b.lot[0] + 10, b.lot[1] + 8, 80)] : undefined;
    const tx = b.lot[0] + a.pos[0];
    const ty = b.lot[1] + a.pos[1];
    return [isoX(tx, ty), isoY(tx, ty, view.openZ())];
  }

  pickAgent(sx: number, sy: number): string | undefined {
    const [wx, wy] = this.camera.screenToWorld(sx, sy);
    let best: string | undefined;
    let bestD = Infinity;
    for (const a of this.world.agents.values()) {
      const p = this.agentWorldPos(a.key);
      if (!p || a.phase === 'gone') continue;
      const f = this.world.floors.get(a.floorId);
      const b = f && this.world.buildings.get(f.buildingId);
      if (!b || b.openFloor !== a.floorId) continue;
      const dx = wx - p[0];
      const dy = wy - (p[1] - 16);
      if (Math.abs(dx) < 10 && Math.abs(dy) < 20) {
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = a.key;
        }
      }
    }
    return best;
  }

  /** Picks a building under the cursor (for click-to-focus). */
  pickBuilding(sx: number, sy: number): string | undefined {
    const [wx, wy] = this.camera.screenToWorld(sx, sy);
    for (const b of this.world.buildings.values()) {
      const view = this.buildings.get(b.id);
      if (!view) continue;
      const [lx, ly] = b.lot;
      const left = isoX(lx, ly + FLOOR_D);
      const right = isoX(lx + FLOOR_W, ly);
      const top = isoY(lx, ly) - view.height;
      const bottom = isoY(lx + FLOOR_W, ly + FLOOR_D);
      if (wx > left && wx < right && wy > top && wy < bottom) return b.id;
    }
    return undefined;
  }

  // ------------------------------------------------------------------ frame

  private frame() {
    const nowPerf = performance.now();
    // the simulation runs on wall time even when the renderer is slow (each sim step is capped at 250 ms)
    const dt = Math.min(1, (nowPerf - this.lastFrame) / 1000);
    this.lastFrame = nowPerf;
    const cap = this.lowQuality && this.cfg.fpsCap === 60 ? 30 : this.cfg.fpsCap;
    if (this.app.ticker.maxFPS !== cap) this.app.ticker.maxFPS = cap;
    this.frameTimes.push(Math.max(dt, 1 / 240));
    if (this.frameTimes.length > 90) this.frameTimes.shift();
    this.fps = Math.round(this.frameTimes.length / this.frameTimes.reduce((s, x) => s + x, 0));
    // automatic quality drop when the machine struggles
    if (this.cfg.quality === 'auto' && this.frameTimes.length === 90) this.lowQuality = this.fps < 40;
    if (this.cfg.quality === 'low') this.lowQuality = true;
    if (this.cfg.quality === 'high') this.lowQuality = false;

    const now = this.clock ? this.clock() : Date.now();
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.camera.w = w;
    this.camera.h = h;
    this.day = dayState(timeOfDay(this.cfg, Date.now()));
    this.world.night = this.day.night;
    this.world.lang = this.cfg.lang;
    let pt = performance.now();
    // fixed sub-steps keep walking speeds right even at very low frame rates
    const steps = Math.max(1, Math.ceil(dt / 0.1));
    for (let i = 1; i <= steps; i++) {
      const subNow = now - (dt * 1000 * (steps - i)) / steps;
      this.world.tick((dt * 1000) / steps, subNow);
      this.traffic.tick((dt * 1000) / steps, subNow, this.day);
      this.npcs.pedGreen = this.traffic.light === 'red';
      this.npcs.tick((dt * 1000) / steps, subNow, this.day);
    }
    pt = this.mark('sim', pt);
    this.syncBuildings(dt, now);
    pt = this.mark('buildings', pt);
    const season = seasonFor(new Date());
    this.cityView.update(
      dt,
      now,
      this.day,
      this.traffic,
      this.npcs,
      { halloween: this.cfg.seasonal && season.halloween },
      [...this.buildings.values()].map((v) => ({ lot: v.building.lot, height: v.height })),
    );
    pt = this.mark('city', pt);
    this.ground.update(now / 1000, this.atlas);
    this.camera.update(dt, this.cfg.reducedMotion);
    for (const c of [this.worldRoot, this.lightWorld, this.overlayWorld]) {
      c.scale.set(this.camera.zoom);
      c.position.set(Math.round(w / 2 - this.camera.x * this.camera.zoom), Math.round(h / 2 - this.camera.y * this.camera.zoom));
    }
    this.skyline.update(this.camera, isoY(0, 0) - 150, w, this.day.night);
    this.sky.update(dt, this.day, w, h, now / 1000, this.cfg.reducedMotion);
    this.updateWeather(dt, now, w, h);
    this.updateEffects(now);
    this.fx.update(dt);
    this.updateOverlay(now);
    this.updateBuildingLabels();
    pt = this.mark('overlay+fx+sky', pt);
    this.updateDisco(now, season.friday && this.cfg.seasonal);
    this.lighting.resize(w, h);
    const fog = this.weatherNow === 'fog' ? 0.32 : this.weatherNow === 'rain' ? 0.08 : 0;
    const wet = this.weatherNow === 'rain' ? 0.8 : this.weatherNow === 'snow' ? 1.04 : 1;
    const amb = this.day.ambient.map((v, i) => v * wet * (this.weatherNow === 'rain' && i === 2 ? 1.12 : 1) + this.ambientLift) as [number, number, number];
    this.lighting.render(this.sceneRoot, this.lightRoot, {
      ambient: amb,
      lights: this.day.lights,
      night: this.day.night,
      time: now / 1000,
      grain: this.lowQuality ? 0 : 0.022,
      vignette: 0.38,
      fog,
      fogColor: this.day.night > 0.5 ? [0.35, 0.36, 0.5] : [0.86, 0.86, 0.9],
      saturation: this.weatherNow === 'rain' ? 0.9 : 1.06,
      warmth: 0.6 - this.day.night * 0.5,
      bloom: this.lowQuality ? 0.25 : 0.5,
    });
    this.mark('lighting', pt);
  }

  private syncBuildings(dt: number, now: number) {
    const openness = Math.max(0, Math.min(1, (this.camera.zoom - 0.85) / 0.75));
    for (const b of this.world.buildings.values()) {
      let v = this.buildings.get(b.id);
      if (!v) {
        v = new BuildingView(this.ctx, b);
        this.buildings.set(b.id, v);
        this.objects.addChild(v.root);
        this.lightWorld.addChild(v.lights);
      }
      v.update(dt, now, this.day, openness, this.npcs.npcs, this.selected, this.hovered);
    }
    for (const [id, v] of this.buildings)
      if (!this.world.buildings.has(id)) {
        v.destroy();
        this.buildings.delete(id);
      }
  }

  private updateWeather(dt: number, now: number, w: number, h: number) {
    let kind: WeatherKind;
    if (this.cfg.weather !== 'auto') kind = this.cfg.weather;
    else {
      const health = this.world.health(now);
      if (this.cfg.weatherFollowsHealth && health.volume >= 6 && health.errorRate > 0.3) kind = 'rain';
      else {
        if (now > this.weatherAuto.until) {
          const hour = this.day.t * 24;
          const r = Math.random();
          const k: WeatherKind = hour > 4.5 && hour < 8 && r < 0.35 ? 'fog' : r < 0.62 ? 'clear' : r < 0.82 ? 'rain' : r < 0.9 ? 'snow' : 'fog';
          this.weatherAuto = { kind: k, until: now + 4 * 60_000 + Math.random() * 4 * 60_000 };
        }
        kind = this.weatherAuto.kind;
      }
      if (this.cfg.weatherFollowsHealth && health.qaGreen && this.weatherNow === 'rain' && kind !== 'rain') this.rainbowUntil = now + 40_000;
      this.deadline = health.volume >= 8 && health.errorRate > 0.45;
    }
    if (kind === 'clear' && this.world.health(now).qaGreen && this.cfg.weatherFollowsHealth && this.rainbowUntil < now - 120_000) this.rainbowUntil = now + 30_000;
    this.weatherNow = kind;
    this.sky.rainbow += ((this.rainbowUntil > now && this.day.night < 0.4 ? 1 : 0) - this.sky.rainbow) * Math.min(1, dt);
    this.weather.update(dt, w, h, kind, this.cfg.reducedMotion);
    // puddle splashes on the visible ground while it rains
    if (kind === 'rain' && !this.cfg.reducedMotion) {
      const n = Math.round(dt * 40 * this.weather.level);
      for (let i = 0; i < n; i++) {
        const [wx, wy] = this.camera.screenToWorld(Math.random() * w, Math.random() * h);
        this.fx.burst('splash', wx, wy);
      }
    }
  }

  /** Converts floor-local effect positions to world space; only effects on open floors are visible. */
  private updateEffects(now: number) {
    for (const e of this.world.takeEffects()) {
      if (now - e.at > 3000) continue;
      const f = e.floorId ? this.world.floors.get(e.floorId) : undefined;
      const b = f && this.world.buildings.get(f.buildingId);
      const view = b && this.buildings.get(b.id);
      if (!b || !view || b.openFloor !== e.floorId) continue;
      const tx = b.lot[0] + e.pos[0];
      const ty = b.lot[1] + e.pos[1];
      this.fx.burst(e.kind, isoX(tx, ty), isoY(tx, ty, view.openZ()));
      if (e.kind === 'bell' || e.kind === 'ding' || e.kind === 'confetti') this.onSound?.(e.kind);
    }
    // music notes from the street musician
    const m = this.npcs.npcs.find((n) => n.role === 'musician' && n.doing?.kind === 'music');
    if (m && Math.random() < 0.02) this.fx.burst('note', isoX(m.pos[0], m.pos[1]), isoY(m.pos[0], m.pos[1]));
  }

  onSound?: (kind: string) => void;

  private updateOverlay(now: number) {
    const showTags = this.camera.zoom >= 1.8;
    const seen = new Set<string>();
    const statusColor = this.cfg.colorblind ? CB_STATUS : STATUS_COLOR;
    for (const a of this.world.agents.values()) {
      if (a.phase === 'gone') continue;
      const p = this.agentWorldPos(a.key);
      const f = this.world.floors.get(a.floorId);
      const b = f && this.world.buildings.get(f.buildingId);
      if (!p || !b || b.openFloor !== a.floorId) continue;
      seen.add(a.key);
      // status icon above the head (unlit, so it stays readable at night)
      let icon = this.icons.get(a.key);
      if (!icon) {
        icon = new Sprite();
        icon.anchor.set(0.5, 1);
        this.overlayWorld.addChild(icon);
        this.icons.set(a.key, icon);
      }
      // seen from afar the towers are closed: only urgent icons stay above the roofs
      const far = this.camera.zoom < 1.2;
      const name = far && a.status !== 'waiting_user' && a.status !== 'error' ? undefined : this.iconFor(a, now);
      icon.visible = !!name;
      if (name) {
        icon.texture = this.atlas.get(name);
        const bob = a.status === 'waiting_user' && !this.cfg.reducedMotion ? Math.sin(now / 160) * 2 : 0;
        icon.position.set(Math.round(p[0] + 6), Math.round(p[1] - 38 - (a.anim === 'hand' ? 6 : 0) + bob));
      }
      // name tag in screen space
      let tag = this.tags.get(a.key);
      if (!tag) {
        tag = new Container();
        const bg = new Graphics();
        const txt = new Text({ text: a.name, style: this.tagStyle, resolution: 2 });
        txt.anchor.set(0.5, 1);
        tag.addChild(bg, txt);
        this.overlayScreen.addChild(tag);
        this.tags.set(a.key, tag);
      }
      const txt = tag.children[1] as Text;
      if (txt.text !== a.name) txt.text = a.name;
      const bg = tag.children[0] as Graphics;
      const tw = Math.ceil(txt.width) + 14;
      bg.clear()
        .roundRect(-tw / 2, -20, tw, 18, 9)
        .fill({ color: 0x1d1524, alpha: 0.82 })
        .roundRect(-tw / 2, -20, tw, 18, 9)
        .stroke({ color: statusColor[a.status] ?? 0xffffff, width: 1.5, alpha: 0.9 })
        .circle(-tw / 2 + 7, -11, 2.5)
        .fill(statusColor[a.status] ?? 0xffffff);
      txt.position.set(4, -4);
      const [sx, sy] = this.camera.worldToScreen(p[0], p[1] - 40);
      tag.position.set(Math.round(sx), Math.round(sy - (name ? 16 * this.camera.zoom * 0.5 : 0)));
      tag.visible = showTags || a.key === this.selected || a.key === this.hovered;
      tag.alpha = a.director ? 1 : 0.95;
    }
    for (const [k, s] of this.icons)
      if (!seen.has(k)) {
        s.destroy();
        this.icons.delete(k);
      }
    for (const [k, t] of this.tags)
      if (!seen.has(k)) {
        t.destroy({ children: true });
        this.tags.delete(k);
      }
  }

  /** Project names above the towers; the Cloud Branch also shows the relay link. */
  private updateBuildingLabels() {
    const seen = new Set<string>();
    for (const [id, v] of this.buildings) {
      seen.add(id);
      let l = this.bldLabels.get(id);
      if (!l) {
        l = new Container();
        l.addChild(new Graphics(), new Text({ text: '', style: this.labelStyle, resolution: 2 }));
        this.overlayScreen.addChild(l);
        this.bldLabels.set(id, l);
      }
      const b = v.building;
      const live = b.floors.reduce((n, f) => n + this.world.floorAgents(f).length, 0);
      const name = b.cloud ? `${this.cfg.lang === 'ru' ? 'Облачный филиал' : 'Cloud Branch'}${this.relayState !== 'off' ? ' · relay ' + this.relayState : ''}` : b.name;
      const txt = l.children[1] as Text;
      const label = `${name}  ·  ${b.floors.length}F · ${live}`;
      if (txt.text !== label) txt.text = label;
      txt.anchor.set(0.5, 1);
      const g = l.children[0] as Graphics;
      const tw = Math.ceil(txt.width) + 18;
      const accent = b.cloud ? (this.relayState === 'online' ? 0x7fd1c2 : 0xffd36b) : 0xf2a65a;
      g.clear().roundRect(-tw / 2, -24, tw, 22, 6).fill({ color: 0x1d1524, alpha: 0.85 }).rect(-tw / 2, -4, tw, 2).fill(accent);
      txt.position.set(0, -6);
      const [lx, ly] = b.lot;
      const [sx, sy] = this.camera.worldToScreen(isoX(lx + FLOOR_W / 2, ly + FLOOR_D / 2), isoY(lx + FLOOR_W / 2, ly + FLOOR_D / 2, v.height + 40));
      l.position.set(Math.round(sx), Math.round(sy));
      l.visible = this.camera.zoom < 1.6;
      v.lobbyTint(b.cloud ? 0xcfe2ff : 0xffffff);
    }
    for (const [id, l] of this.bldLabels)
      if (!seen.has(id)) {
        l.destroy({ children: true });
        this.bldLabels.delete(id);
      }
  }

  private iconFor(a: Agent, now: number): string | undefined {
    if (a.phase === 'celebrate') return 'icon_star';
    if (a.status === 'thinking') return `icon_think_${Math.floor(now / 400) % 3}`;
    if (a.status === 'idle') return a.anim === 'sleep' ? `icon_zzz_${Math.floor(now / 700) % 2}` : undefined;
    if (a.status === 'waiting_user') return 'icon_alert';
    return STATUS_ICON[a.status];
  }

  // ------------------------------------------------------------------ extras

  private setupDisco() {
    const ball = new Sprite(this.atlas.get('disco_ball'));
    ball.anchor.set(0.5, 0);
    ball.visible = false;
    const lights = [0xff6fb5, 0x6fc3ff, 0xffe46b, 0x7ef0a0].map((c) => lightSprite(this.atlas, c, 50, 0));
    this.disco = { ball, lights };
    this.overlayWorld.addChild(ball);
    for (const l of lights) this.lightWorld.addChild(l);
    this.ghost = new Sprite(this.atlas.get('ghost'));
    this.ghost.anchor.set(0.5, 1);
    this.ghost.visible = false;
    this.overlayWorld.addChild(this.ghost);
  }

  /** Friday evening: a disco ball over the lounge. Night: a shy ghost haunts the server room. */
  private updateDisco(now: number, friday: boolean) {
    const b = [...this.world.buildings.values()].sort((x, y) => x.slot - y.slot)[0];
    const view = b && this.buildings.get(b.id);
    if (!this.disco) return;
    const on = !!(friday && b && view);
    this.disco.ball.visible = on;
    for (const l of this.disco.lights) l.alpha = 0;
    if (on && b && view) {
      const z = view.openZ();
      const [cx, cy] = [b.lot[0] + 16.5, b.lot[1] + 13];
      this.disco.ball.position.set(isoX(cx, cy), isoY(cx, cy, z + 52));
      this.disco.lights.forEach((l, i) => {
        const a = now / 700 + (i * Math.PI) / 2;
        const lx = cx + Math.cos(a) * 1.8;
        const ly = cy + Math.sin(a) * 1.6;
        l.position.set(isoX(lx, ly), isoY(lx, ly, z));
        l.alpha = 0.55;
      });
    }
    if (this.ghost && b && view) {
      const night = this.day.night > 0.85;
      const t = (now / 1000) % 40;
      this.ghost.visible = night && t < 9;
      if (this.ghost.visible) {
        const gx = b.lot[0] + 17 + Math.sin(t) * 1.2;
        const gy = b.lot[1] + 1.8;
        this.ghost.position.set(isoX(gx, gy), isoY(gx, gy, view.openZ() + 8 + Math.sin(t * 3) * 3));
        this.ghost.alpha = Math.min(1, t / 2, (9 - t) / 2) * 0.75;
      }
    }
  }

  /** Photo mode: a PNG of the current frame (UI overlays excluded unless shown in-canvas). */
  async snapshot(): Promise<string> {
    return this.app.renderer.extract.base64({ target: this.app.stage, format: 'png' });
  }

  stats() {
    return { ...this.world.stats(Date.now()), fps: this.fps, npcs: this.npcs.npcs.length, vehicles: this.traffic.vehicles.length, lowQuality: this.lowQuality };
  }

  setAmbientLift(v: number) {
    this.ambientLift = v;
  }
}

export { depth };
