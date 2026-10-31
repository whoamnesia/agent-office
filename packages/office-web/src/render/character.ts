import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { Facing } from '@agent-office/office-core';
import type { Atlas } from '../assets.js';

/** Frames per second for each animation. */
const FPS: Record<string, number> = {
  idle: 1.6,
  walk: 8,
  carry: 8,
  sit: 0.5,
  type: 7,
  read: 1.2,
  think: 1.1,
  hand: 3,
  error: 4,
  joy: 6,
  sleep: 0.9,
  coffee: 0.8,
  phone: 1.5,
  stretch: 0.5,
  dance: 4,
};

/** A layered-preset character sprite with facing, animation timing and a contact shadow. */
export class CharacterView extends Container {
  readonly body = new Sprite();
  readonly shadow: Sprite;
  private anim = '';
  private frames: Texture[] = [];
  private t = Math.random() * 10;
  private facing: Facing = 'se';
  preset: string;
  dim = false;
  private ringG?: Graphics;

  constructor(
    private readonly atlas: Atlas,
    preset: string,
    /** non-human sprites: the office cat and the mascot */
    private readonly critter?: 'cat' | 'mascot' | 'dog_corgi' | 'dog_dark',
  ) {
    super();
    this.preset = preset;
    this.shadow = new Sprite(atlas.get('shadow'));
    this.shadow.anchor.set(0.5);
    this.shadow.scale.set(0.55, 0.6);
    this.shadow.alpha = 0.55;
    this.addChild(this.shadow, this.body);
    this.body.anchor.set(12 / 24, 34 / 36);
  }

  setPreset(p: string): void {
    if (p === this.preset) return;
    this.preset = p;
    this.anim = '';
  }

  /** Status ring under real agents: level 0 = subtle, 1 = hover, 2 = selected (pulsing). */
  ring(color: number, level: number, now: number): void {
    if (!this.ringG) {
      this.ringG = new Graphics();
      this.addChildAt(this.ringG, 1);
    }
    const pulse = level === 2 ? 0.5 + 0.5 * Math.sin(now / 180) : 0;
    this.ringG
      .clear()
      .ellipse(0, 0, 9 + pulse * 2, 4.5 + pulse)
      .stroke({ color, width: level === 2 ? 2 : 1, alpha: level ? 0.95 : 0.6 });
  }

  set(anim: string, facing: Facing): void {
    if (this.critter) return this.setCritter(anim, facing);
    const back = facing === 'ne' || facing === 'nw';
    const key = `${this.preset}/${back ? 'back' : 'front'}/${anim}`;
    if (key !== this.anim) {
      let frames = this.atlas.frames(key);
      if (!frames.length) frames = this.atlas.frames(`${this.preset}/${back ? 'back' : 'front'}/idle`);
      this.frames = frames;
      this.anim = key;
      this.t = 0;
    }
    this.facing = facing;
    this.body.scale.x = facing === 'sw' || facing === 'ne' ? -1 : 1;
    this.shadow.visible = !anim.startsWith('sit') && !['type', 'read', 'think', 'sleep', 'error'].includes(anim);
    this.fps = FPS[anim] ?? 2;
  }

  private fps = 2;

  private setCritter(anim: string, facing: Facing) {
    const c = this.critter!;
    let key: string;
    if (c === 'mascot') key = 'mascot';
    else if (c === 'cat') key = anim === 'walk' ? 'cat_walk' : anim === 'nap' || anim === 'sleep' ? 'cat_sleep' : 'cat_sit';
    else key = c;
    if (key !== this.anim) {
      this.frames = [0, 1].map((i) => this.atlas.get(`${key}_${i}`));
      this.anim = key;
    }
    this.body.anchor.set(0.5, 0.92);
    this.body.scale.x = facing === 'nw' || facing === 'sw' ? -1 : 1;
    this.shadow.scale.set(0.35, 0.4);
    this.fps = anim === 'walk' ? 6 : key === 'mascot' ? 3 : 0.8;
    this.facing = facing;
  }

  update(dt: number): void {
    if (!this.frames.length) return;
    this.t += dt * this.fps;
    const f = this.frames[Math.floor(this.t) % this.frames.length]!;
    if (this.body.texture !== f) this.body.texture = f;
    this.body.alpha = this.dim ? 0.92 : 1;
    this.body.tint = this.dim ? 0xd9d2e0 : 0xffffff;
  }

  get facingDir(): Facing {
    return this.facing;
  }
}
