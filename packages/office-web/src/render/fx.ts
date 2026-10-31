import { Container, Sprite } from 'pixi.js';
import type { Atlas } from '../assets.js';

interface Particle {
  s: Sprite;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  spin: number;
  frames?: string[];
}

/** Unlit world-space particles: confetti, smoke, sparks, hearts, delivered items. */
export class Fx {
  readonly root = new Container();
  private ps: Particle[] = [];
  reduced = false;

  constructor(private readonly atlas: Atlas) {}

  private add(name: string, x: number, y: number, p: Partial<Particle>) {
    if (this.ps.length > 600) return;
    const s = new Sprite(this.atlas.get(name));
    s.anchor.set(0.5);
    s.position.set(x, y);
    this.root.addChild(s);
    this.ps.push({ s, vx: 0, vy: 0, g: 0, life: 0, max: 1, spin: 0, ...p });
  }

  burst(kind: string, x: number, y: number) {
    const r = Math.random;
    const n = this.reduced ? 0.3 : 1;
    switch (kind) {
      case 'confetti':
        for (let i = 0; i < 26 * n; i++) this.add(`confetti_${i % 6}`, x, y - 30, { vx: (r() - 0.5) * 70, vy: -60 - r() * 60, g: 140, max: 1.6 + r() * 0.6, spin: (r() - 0.5) * 12 });
        break;
      case 'smoke':
        for (let i = 0; i < 5 * n; i++) this.add('smoke_0', x + (r() - 0.5) * 8, y - 26, { vx: (r() - 0.5) * 6, vy: -14 - r() * 8, max: 1.8 + r(), frames: ['smoke_0', 'smoke_1', 'smoke_2', 'smoke_3'] });
        break;
      case 'spark':
      case 'ding':
        for (let i = 0; i < 6 * n; i++) this.add('spark', x + (r() - 0.5) * 16, y - 40 - r() * 10, { vy: -8, max: 0.7 + r() * 0.3 });
        break;
      case 'heart':
        this.add('icon_heart', x, y - 46, { vy: -16, max: 1.6 });
        break;
      case 'package':
        this.add('item_package', x, y - 30, { vy: -10, max: 1.4 });
        break;
      case 'donuts':
        this.add('item_donuts', x, y - 20, { vy: -6, max: 2.4 });
        break;
      case 'doc':
        this.add('item_doc', x, y - 36, { vy: 18, max: 0.9 });
        break;
      case 'bell':
        this.add('icon_alert', x, y - 54, { vy: -10, max: 1.2 });
        break;
      case 'clap':
        for (let i = 0; i < 3; i++) this.add('icon_heart', x + (i - 1) * 14, y - 30, { vy: -20, max: 1.4 });
        break;
      case 'splash':
        this.add('splash_0', x, y, { max: 0.45, frames: ['splash_0', 'splash_1', 'splash_2'] });
        break;
      case 'note':
        this.add('icon_note', x + (r() - 0.5) * 6, y - 40, { vx: (r() - 0.5) * 8, vy: -14, max: 1.6 });
        break;
    }
  }

  update(dt: number) {
    for (const p of this.ps) {
      p.life += dt;
      p.vy += p.g * dt;
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.s.rotation += p.spin * dt;
      const k = p.life / p.max;
      p.s.alpha = k > 0.7 ? Math.max(0, 1 - (k - 0.7) / 0.3) : 1;
      if (p.frames) p.s.texture = this.atlas.get(p.frames[Math.min(p.frames.length - 1, Math.floor(k * p.frames.length))]!);
    }
    for (const p of this.ps) if (p.life >= p.max) p.s.destroy();
    this.ps = this.ps.filter((p) => p.life < p.max);
  }
}

export type WeatherKind = 'clear' | 'rain' | 'snow' | 'fog';

/** Screen-space precipitation plus world-space splashes. */
export class Weather {
  readonly screen = new Container();
  kind: WeatherKind = 'clear';
  private drops: { s: Sprite; v: number }[] = [];
  /** 0..1 eased intensity */
  level = 0;

  constructor(private readonly atlas: Atlas) {}

  update(dt: number, w: number, h: number, kind: WeatherKind, reduced: boolean) {
    this.kind = kind;
    const want = kind === 'rain' || kind === 'snow' ? 1 : 0;
    this.level += (want - this.level) * Math.min(1, dt * 1.5);
    const n = Math.round(this.level * (reduced ? 60 : kind === 'snow' ? 220 : 320));
    const tex = this.atlas.get(kind === 'snow' ? 'snowflake' : 'raindrop');
    while (this.drops.length < n) {
      const s = new Sprite(tex);
      s.position.set(Math.random() * w, Math.random() * h);
      s.scale.set(kind === 'snow' ? 1.5 + Math.random() * 1.5 : 2, kind === 'snow' ? 1.5 + Math.random() * 1.5 : 2.6);
      this.screen.addChild(s);
      this.drops.push({ s, v: 0.6 + Math.random() * 0.6 });
    }
    while (this.drops.length > n) this.drops.pop()!.s.destroy();
    for (const d of this.drops) {
      if (d.s.texture !== tex) d.s.texture = tex;
      if (kind === 'snow') {
        d.s.y += dt * 40 * d.v;
        d.s.x += Math.sin(d.s.y / 30 + d.v * 9) * dt * 16;
      } else {
        d.s.y += dt * 620 * d.v;
        d.s.x -= dt * 110 * d.v;
      }
      if (d.s.y > h) {
        d.s.y = -10;
        d.s.x = Math.random() * (w + 100);
      }
      if (d.s.x < -20) d.s.x = w + 10;
      d.s.alpha = this.level * (kind === 'snow' ? 0.95 : 0.75);
    }
  }
}
