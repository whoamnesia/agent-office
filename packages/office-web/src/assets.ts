import { Assets, Spritesheet, Texture, TextureStyle, type SpritesheetData } from 'pixi.js';

export interface Manifest {
  sheets: string[];
  sky: string[];
  floor: { w: number; d: number; storeyH: number; slabH: number; lobbyH: number; wallH: number };
  desk: { h: number; monitor: { x0: number; x1: number; y: number; z0: number; z1: number } };
  char: { w: number; h: number; presets: string[]; families: string[]; anims: Record<string, number> };
}

/** All textures by frame name. Custom atlases in assets/custom/ override built-in frames by name. */
export class Atlas {
  readonly tex = new Map<string, Texture>();
  readonly anims = new Map<string, Texture[]>();
  readonly sky = new Map<string, Texture>();
  manifest!: Manifest;
  customCount = 0;

  get(name: string): Texture {
    const t = this.tex.get(name);
    if (!t) {
      if (!this.missing.has(name)) {
        this.missing.add(name);
        console.warn('[agent-office] missing sprite', name);
      }
      return Texture.EMPTY;
    }
    return t;
  }
  has(name: string): boolean {
    return this.tex.has(name);
  }
  frames(anim: string): Texture[] {
    return this.anims.get(anim) ?? [];
  }
  private missing = new Set<string>();
}

async function loadSheet(atlas: Atlas, base: string, name: string): Promise<number> {
  const res = await fetch(`${base}${name}.json`);
  if (!res.ok) throw new Error(`atlas ${name}: HTTP ${res.status}`);
  const data = (await res.json()) as SpritesheetData;
  const texture = await Assets.load<Texture>(`${base}${data.meta.image}`);
  texture.source.scaleMode = 'nearest';
  const sheet = new Spritesheet(texture, data);
  await sheet.parse();
  for (const [k, t] of Object.entries(sheet.textures)) atlas.tex.set(k, t);
  for (const [k, frames] of Object.entries(sheet.animations)) atlas.anims.set(k, frames);
  return Object.keys(sheet.textures).length;
}

export async function loadAssets(base = 'assets/', onProgress?: (p: number) => void): Promise<Atlas> {
  TextureStyle.defaultOptions.scaleMode = 'nearest';
  const atlas = new Atlas();
  atlas.manifest = (await (await fetch(base + 'manifest.json')).json()) as Manifest;
  let done = 0;
  const total = atlas.manifest.sheets.length + atlas.manifest.sky.length;
  const tick = () => onProgress?.(++done / total);
  await Promise.all(atlas.manifest.sheets.map((s) => loadSheet(atlas, base, s).then(tick)));
  await Promise.all(
    atlas.manifest.sky.map(async (s) => {
      const t = await Assets.load<Texture>(`${base}sky/${s}.png`);
      t.source.scaleMode = 'nearest';
      atlas.sky.set(s, t);
      tick();
    }),
  );
  // Optional overrides: assets/custom/custom.json lists extra atlases (see docs/ASSETS.md).
  try {
    const res = await fetch(base + 'custom/custom.json');
    if (res.ok) {
      const list = (await res.json()) as { sheets?: string[] };
      for (const s of list.sheets ?? []) atlas.customCount += await loadSheet(atlas, base + 'custom/', s);
    }
  } catch {
    /* no custom assets */
  }
  return atlas;
}
