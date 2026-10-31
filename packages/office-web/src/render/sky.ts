import { Container, FillGradient, Graphics, Sprite, TilingSprite } from 'pixi.js';
import type { DayState } from '@agent-office/office-core';
import type { Atlas } from '../assets.js';
import type { Camera } from '../camera.js';

const rgb = (c: [number, number, number]) => (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255);

/** Unlit sky behind everything: gradient, stars, sun, moon, clouds, aircraft. */
export class SkyView {
  readonly root = new Container();
  private grad = new Graphics();
  private stars = new Graphics();
  private sun = new Graphics();
  private moon = new Graphics();
  private clouds: { s: Sprite; speed: number; y: number; x: number }[] = [];
  private plane: Sprite;
  private planeLight = new Graphics();
  private ufo: Sprite;
  private starPts: [number, number, number][] = [];
  private lastKey = '';
  rainbow = 0;
  private rainbowG = new Graphics();
  private planeT = 0;
  private ufoT = -1;

  constructor(private readonly atlas: Atlas) {
    this.root.addChild(this.grad, this.stars, this.sun, this.moon, this.rainbowG);
    for (let i = 0; i < 160; i++) this.starPts.push([Math.random(), Math.random() * 0.6, Math.random()]);
    for (let i = 0; i < 5; i++) {
      const s = new Sprite(atlas.sky.get(`cloud_${i % 3}`));
      s.anchor.set(0.5);
      s.scale.set(1.5 + Math.random());
      const c = { s, speed: 4 + Math.random() * 6, y: 0.08 + Math.random() * 0.22, x: Math.random() };
      this.clouds.push(c);
      this.root.addChild(s);
    }
    this.plane = new Sprite(atlas.get('plane'));
    this.plane.anchor.set(0.5);
    this.plane.scale.set(2);
    this.ufo = new Sprite(atlas.get('ufo'));
    this.ufo.anchor.set(0.5);
    this.ufo.scale.set(2);
    this.ufo.visible = false;
    this.root.addChild(this.plane, this.planeLight, this.ufo);
  }

  update(dt: number, day: DayState, w: number, h: number, time: number, reduced: boolean): void {
    const key = `${w}x${h}:${day.skyTop.map((v) => v.toFixed(3))}:${day.skyBottom.map((v) => v.toFixed(3))}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      const g = new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, textureSpace: 'local', colorStops: [{ offset: 0, color: rgb(day.skyTop) }, { offset: 1, color: rgb(day.skyBottom) }] });
      this.grad.clear().rect(0, 0, w, h * 0.75).fill(g).rect(0, h * 0.75, w, h * 0.25 + 2).fill(rgb(day.skyBottom));
    }
    // stars twinkle in at night
    this.stars.clear();
    if (day.night > 0.25) {
      for (const [x, y, p] of this.starPts) {
        const a = (day.night - 0.25) * 1.3 * (0.5 + 0.5 * Math.sin(time * (1 + p * 2) + p * 30));
        this.stars.rect(Math.floor(x * w), Math.floor(y * h), p > 0.9 ? 2 : 1, p > 0.9 ? 2 : 1).fill({ color: 0xffffff, alpha: Math.min(1, a) });
      }
    }
    // sun and moon travel along an arc
    const arc = (angle: number, elev: number): [number, number] => [w * (0.08 + 0.84 * (angle / Math.PI)), h * (0.62 - 0.5 * elev)];
    this.sun.clear();
    if (day.sunElevation > 0.01) {
      const [x, y] = arc(day.sunAngle, day.sunElevation);
      const warm = day.sunElevation < 0.35;
      this.sun.circle(x, y, 60).fill({ color: warm ? 0xffb070 : 0xfff2c0, alpha: 0.18 });
      this.sun.circle(x, y, 34).fill({ color: warm ? 0xffc890 : 0xfff6d8, alpha: 0.35 });
      this.sun.circle(x, y, 18).fill(warm ? 0xffd9a0 : 0xfffbea);
    }
    this.moon.clear();
    if (day.moonElevation > 0.02) {
      const ma = ((day.t * 24 + 24 - 19.5) % 24) / 11;
      const [x, y] = arc(ma * Math.PI, day.moonElevation);
      this.moon.circle(x, y, 40).fill({ color: 0xcfd8ff, alpha: 0.08 * day.night });
      this.moon.circle(x, y, 13).fill({ color: 0xf2f0e6, alpha: 0.95 });
      this.moon.circle(x + 5, y - 3, 11).fill({ color: rgb(day.skyTop), alpha: 0.92 });
      this.moon.circle(x - 4, y + 3, 2).fill({ color: 0xd8d4c4, alpha: 0.8 });
    }
    const cloudTint = rgb([0.55 + day.skyBottom[0] * 0.45, 0.55 + day.skyBottom[1] * 0.45, 0.6 + day.skyBottom[2] * 0.4]);
    for (const c of this.clouds) {
      if (!reduced) c.x = (c.x + (dt * c.speed) / Math.max(800, w)) % 1.3;
      c.s.position.set(Math.round((c.x - 0.15) * w), Math.round(c.y * h));
      c.s.tint = cloudTint;
      c.s.alpha = 0.75 - day.night * 0.45;
    }
    // a plane every ~70 s, blinking at night
    this.planeT = (this.planeT + dt) % 70;
    const pt = this.planeT / 22;
    this.plane.visible = pt < 1;
    this.planeLight.clear();
    if (pt < 1) {
      this.plane.position.set(Math.round(-60 + pt * (w + 120)), Math.round(h * (0.16 - pt * 0.06)));
      this.plane.alpha = 0.85;
      this.plane.tint = day.night > 0.5 ? 0x5a5a7a : 0xffffff;
      if (Math.floor(time * 2) % 2 === 0) this.planeLight.circle(this.plane.x + 18, this.plane.y + 2, 2).fill(0xff5a5a);
    }
    // easter egg: a UFO over the park on rare nights
    if (day.night > 0.8 && this.ufoT < 0 && Math.random() < dt / 600) this.ufoT = 0;
    if (this.ufoT >= 0) {
      this.ufoT += dt;
      const u = this.ufoT / 14;
      this.ufo.visible = u < 1;
      this.ufo.position.set(w * (0.2 + u * 0.6), h * (0.22 + Math.sin(u * 12) * 0.03));
      if (u >= 1) this.ufoT = -1;
    }
    this.rainbowG.clear();
    if (this.rainbow > 0.01) {
      const cols = [0xff6b6b, 0xffb35c, 0xffe46b, 0x7ef0a0, 0x6fc3ff, 0xb69cff];
      cols.forEach((c, i) => this.rainbowG.arc(w * 0.7, h * 0.62, h * 0.42 - i * 7, Math.PI, 0).stroke({ color: c, width: 7, alpha: 0.32 * this.rainbow }));
    }
  }
}

/** Parallax skyline (lit by the composite): far silhouettes + mid towers, with night windows. */
export class Skyline {
  readonly root = new Container();
  readonly lights = new Container();
  private layers: { day: TilingSprite; night: TilingSprite; glow: TilingSprite; factor: number; yOff: number }[] = [];

  constructor(atlas: Atlas) {
    const mk = (name: string, factor: number, yOff: number) => {
      const day = new TilingSprite({ texture: atlas.sky.get(name)!, width: 4096, height: 300 });
      const night = new TilingSprite({ texture: atlas.sky.get(name + '_night')!, width: 4096, height: 300 });
      const glow = new TilingSprite({ texture: atlas.sky.get(name + '_night')!, width: 4096, height: 300 });
      glow.blendMode = 'add';
      this.root.addChild(day, night);
      this.lights.addChild(glow);
      this.layers.push({ day, night, glow, factor, yOff });
    };
    mk('sky_far', 0.15, 0);
    mk('sky_mid', 0.3, 40);
  }

  update(cam: Camera, horizonWorldY: number, w: number, night: number): void {
    const scale = Math.max(1, Math.min(2, cam.zoom * 0.9));
    for (const l of this.layers) {
      const [, sy] = cam.worldToScreen(0, horizonWorldY);
      const y = Math.round(sy * (0.35 + l.factor) + (1 - (0.35 + l.factor)) * 0.55 * cam.h - 300 * scale + l.yOff * scale);
      for (const t of [l.day, l.night, l.glow]) {
        t.scale.set(scale);
        t.width = Math.ceil(w / scale) + 4;
        t.position.set(0, y);
        t.tilePosition.x = Math.round(-cam.x * l.factor);
      }
      l.night.alpha = night;
      l.glow.alpha = night * 0.9;
    }
  }
}
