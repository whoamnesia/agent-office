import { isoX, isoY } from './iso.js';

/** Camera over the world container: position = world point at screen centre, zoom = art-pixel scale. */
export class Camera {
  x = 0;
  y = 0;
  zoom = 2;
  private tx = 0;
  private ty = 0;
  private tz = 2;
  follow: (() => [number, number] | undefined) | undefined;
  bounds = { minX: -1400, maxX: 1400, minY: -700, maxY: 1100 };
  minZoom = 0.35;
  maxZoom = 5;
  w = 1;
  h = 1;
  /** true while the user drags or wheels; disables snapping */
  private interacting = 0;

  set(x: number, y: number, zoom?: number, instant = false) {
    this.follow = undefined;
    this.tx = x;
    this.ty = y;
    if (zoom !== undefined) this.tz = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    if (instant) {
      this.x = this.tx;
      this.y = this.ty;
      this.zoom = this.tz;
    }
  }

  lookAtTile(tx: number, ty: number, z = 0, zoom?: number, instant = false) {
    this.set(isoX(tx, ty), isoY(tx, ty, z), zoom, instant);
  }

  /** Zoom keeping the world point under (sx, sy) fixed. */
  zoomAt(factor: number, sx: number, sy: number) {
    const before = this.screenToWorld(sx, sy, this.tz, this.tx, this.ty);
    this.tz = Math.max(this.minZoom, Math.min(this.maxZoom, this.tz * factor));
    const after = this.screenToWorld(sx, sy, this.tz, this.tx, this.ty);
    this.tx += before[0] - after[0];
    this.ty += before[1] - after[1];
    this.interacting = 0.25;
    this.follow = undefined;
  }

  pan(dxScreen: number, dyScreen: number) {
    this.tx -= dxScreen / this.zoom;
    this.ty -= dyScreen / this.zoom;
    this.x = this.tx;
    this.y = this.ty;
    this.interacting = 0.25;
    this.follow = undefined;
  }

  screenToWorld(sx: number, sy: number, zoom = this.zoom, cx = this.x, cy = this.y): [number, number] {
    return [(sx - this.w / 2) / zoom + cx, (sy - this.h / 2) / zoom + cy];
  }

  worldToScreen(wx: number, wy: number): [number, number] {
    return [(wx - this.x) * this.zoom + this.w / 2, (wy - this.y) * this.zoom + this.h / 2];
  }

  /** Smoothly approaches the target; snaps zoom to crisp pixel ratios once the user stops. */
  update(dt: number, reducedMotion: boolean) {
    if (this.follow) {
      const p = this.follow();
      if (p) {
        this.tx = p[0];
        this.ty = p[1];
      }
    }
    this.interacting = Math.max(0, this.interacting - dt);
    if (!this.interacting) {
      const crisp = this.tz >= 1 ? Math.round(this.tz) : this.tz >= 0.75 ? this.tz : this.tz;
      this.tz += (crisp - this.tz) * Math.min(1, dt * 6);
      if (Math.abs(crisp - this.tz) < 0.002) this.tz = crisp;
    }
    this.tx = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.tx));
    this.ty = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.ty));
    const k = reducedMotion ? 1 : Math.min(1, dt * 7);
    this.x += (this.tx - this.x) * k;
    this.y += (this.ty - this.y) * k;
    this.zoom += (this.tz - this.zoom) * (reducedMotion ? 1 : Math.min(1, dt * 9));
  }

  get target() {
    return { x: this.tx, y: this.ty, zoom: this.tz };
  }
}
