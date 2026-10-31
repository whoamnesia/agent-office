import { Container, Sprite, type Renderer } from 'pixi.js';
import type { CityPlan } from '@agent-office/office-core';
import type { Atlas } from '../assets.js';
import { isoX, isoY } from '../iso.js';

export const MARGIN = 18;

/** Bakes the static ground into chunk textures (roads, plaza, park…) and keeps water as animated sprites. */
export class Ground {
  readonly root = new Container();
  readonly water = new Container();
  private waterSprites: { s: Sprite; phase: number }[] = [];
  private frame = -1;

  constructor(renderer: Renderer, atlas: Atlas, city: CityPlan) {
    this.root.label = 'ground';
    const x0 = -MARGIN;
    const y0 = -MARGIN;
    const x1 = city.w + MARGIN;
    const y1 = city.h + MARGIN;
    const CH = 24;
    const tileFor = (x: number, y: number) => {
      // beyond the map edges, rows continue (road, rails, promenade) so the block doesn't float in a void
      const cx = Math.max(0, Math.min(city.w - 1, x));
      const cy = Math.max(-3, y);
      if (y < 0) return (x + y) % 4 === 0 ? 'paving_0' : 'paving_1';
      let t = city.tileAt(cx, cy);
      if ((x < 0 || x >= city.w) && /^(grass|parking|sand|crosswalk)/.test(t)) t = y < 30 ? 'paving_1' : t === 'crosswalk' ? 'asphalt' : t;
      if ((x < 0 || x >= city.w) && t === 'crosswalk') t = 'asphalt';
      return t;
    };
    for (let cy = y0; cy < y1; cy += CH)
      for (let cx = x0; cx < x1; cx += CH) {
        const chunk = new Container();
        for (let y = cy; y < Math.min(cy + CH, y1); y++)
          for (let x = cx; x < Math.min(cx + CH, x1); x++) {
            const t = tileFor(x, y);
            if (t.startsWith('water')) {
              const s = new Sprite(atlas.get(t));
              s.position.set(isoX(x, y), isoY(x, y));
              this.water.addChild(s);
              this.waterSprites.push({ s, phase: (x * 7 + y * 3) & 3 });
              continue;
            }
            const s = new Sprite(atlas.get(t));
            s.position.set(isoX(x, y), isoY(x, y));
            chunk.addChild(s);
          }
        if (!chunk.children.length) continue;
        const b = chunk.getLocalBounds();
        const tex = renderer.generateTexture({ target: chunk, resolution: 1, textureSourceOptions: { scaleMode: 'nearest' } });
        const sp = new Sprite(tex);
        sp.position.set(b.x, b.y);
        this.root.addChild(sp);
        chunk.destroy({ children: true });
      }
    this.root.addChild(this.water);
  }

  update(t: number, atlas: Atlas): void {
    const f = Math.floor(t * 2.2) % 4;
    if (f === this.frame) return;
    this.frame = f;
    const tex = [0, 1, 2, 3].map((k) => atlas.get(`water_${k}`));
    for (const w of this.waterSprites) w.s.texture = tex[(f + w.phase) & 3]!;
  }
}
