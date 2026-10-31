import fs from 'node:fs';
import path from 'node:path';
import type { DeptRule } from '@agent-office/protocol';

/** Everything configurable lives here; unknown keys in the file are preserved but ignored. */
export interface OfficeConfig {
  autostart: boolean;
  port: number;
  showContent: boolean;
  hidePaths: boolean;
  dayCycleMinutes: number;
  /** auto = follows the cycle; day/night pin the time; manual = slider value. */
  dayMode: 'auto' | 'day' | 'night' | 'manual';
  timeOfDay: number;
  weather: 'auto' | 'clear' | 'rain' | 'snow' | 'fog';
  weatherFollowsHealth: boolean;
  sound: boolean;
  lang: 'auto' | 'ru' | 'en';
  quality: 'auto' | 'high' | 'low';
  fpsCap: 60 | 30 | 15;
  reducedMotion: 'auto' | 'on' | 'off';
  colorblind: boolean;
  uiScale: number;
  seasonal: boolean;
  deptRules: DeptRule[] | null;
  relayUrl: string | null;
  relayToken: string | null;
  /** Worker appearance overrides keyed by agent type or agent id. */
  customization: Record<string, { hair?: number; outfit?: number; skin?: number; desk?: string }>;
  /** Furniture moved in layout mode, keyed by item id → [x, y]. */
  layout: Record<string, [number, number]>;
}

export const DEFAULT_CONFIG: OfficeConfig = {
  autostart: true,
  port: 47821,
  showContent: false,
  hidePaths: false,
  dayCycleMinutes: 15,
  dayMode: 'auto',
  timeOfDay: 0.45,
  weather: 'auto',
  weatherFollowsHealth: true,
  sound: false,
  lang: 'auto',
  quality: 'auto',
  fpsCap: 60,
  reducedMotion: 'auto',
  colorblind: false,
  uiScale: 1,
  seasonal: true,
  deptRules: null,
  relayUrl: null,
  relayToken: null,
  customization: {},
  layout: {},
};

/** Keys the browser UI may change through POST /config (never relay credentials or privacy flags). */
export const UI_WRITABLE: (keyof OfficeConfig)[] = [
  'dayMode',
  'timeOfDay',
  'weather',
  'weatherFollowsHealth',
  'sound',
  'lang',
  'quality',
  'fpsCap',
  'reducedMotion',
  'colorblind',
  'uiScale',
  'seasonal',
  'customization',
  'layout',
  'dayCycleMinutes',
];

function readJson(file: string): Record<string, unknown> {
  try {
    const v = JSON.parse(fs.readFileSync(file, 'utf8'));
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** User config from the data dir, then project overrides from `<project>/.claude/agent-office.config.json`. */
export function loadConfig(configFile: string, projectDir?: string): OfficeConfig {
  const user = readJson(configFile);
  const project = projectDir ? readJson(path.join(projectDir, '.claude', 'agent-office.config.json')) : {};
  // Projects may tune privacy and departments but can't point the emitter at a relay.
  delete project.relayUrl;
  delete project.relayToken;
  return sanitize({ ...DEFAULT_CONFIG, ...user, ...project });
}

export function sanitize(c: Record<string, unknown>): OfficeConfig {
  const d = DEFAULT_CONFIG;
  const pick = <K extends keyof OfficeConfig>(k: K, ok: (v: unknown) => boolean): OfficeConfig[K] =>
    (ok(c[k]) ? c[k] : d[k]) as OfficeConfig[K];
  const bool = (v: unknown) => typeof v === 'boolean';
  const oneOf = (...xs: unknown[]) => (v: unknown) => xs.includes(v);
  const num = (lo: number, hi: number) => (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  const obj = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v);
  const strOrNull = (v: unknown) => v === null || (typeof v === 'string' && v.length < 2000);
  return {
    autostart: pick('autostart', bool),
    port: pick('port', num(1024, 65535)),
    showContent: pick('showContent', bool),
    hidePaths: pick('hidePaths', bool),
    dayCycleMinutes: pick('dayCycleMinutes', num(1, 24 * 60)),
    dayMode: pick('dayMode', oneOf('auto', 'day', 'night', 'manual')),
    timeOfDay: pick('timeOfDay', num(0, 1)),
    weather: pick('weather', oneOf('auto', 'clear', 'rain', 'snow', 'fog')),
    weatherFollowsHealth: pick('weatherFollowsHealth', bool),
    sound: pick('sound', bool),
    lang: pick('lang', oneOf('auto', 'ru', 'en')),
    quality: pick('quality', oneOf('auto', 'high', 'low')),
    fpsCap: pick('fpsCap', oneOf(60, 30, 15)),
    reducedMotion: pick('reducedMotion', oneOf('auto', 'on', 'off')),
    colorblind: pick('colorblind', bool),
    uiScale: pick('uiScale', num(0.75, 2)),
    seasonal: pick('seasonal', bool),
    deptRules: pick('deptRules', (v) => v === null || (Array.isArray(v) && v.length < 200)),
    relayUrl: pick('relayUrl', strOrNull),
    relayToken: pick('relayToken', strOrNull),
    customization: pick('customization', obj),
    layout: pick('layout', obj),
  };
}

export function saveConfig(configFile: string, patch: Partial<OfficeConfig>): OfficeConfig {
  const current = readJson(configFile);
  const next = { ...current, ...patch };
  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  const tmp = configFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
  fs.renameSync(tmp, configFile);
  return sanitize({ ...DEFAULT_CONFIG, ...next });
}

/** Config as sent to the browser: relay token is never exposed. */
export function publicConfig(c: OfficeConfig) {
  const { relayToken: _t, deptRules: _r, ...rest } = c;
  return { ...rest, relayConfigured: !!(c.relayUrl && c.relayToken) };
}
