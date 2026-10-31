/** Day/night model. `t` is the time of day in 0..1 (0 = midnight, 0.5 = noon). */

export type RGB = [number, number, number];
export type DayMode = 'auto' | 'day' | 'night' | 'manual';

interface Key {
  t: number;
  ambient: RGB;
  skyTop: RGB;
  skyBottom: RGB;
  /** strength of artificial lights (lamps, screens) in the composite */
  lights: number;
}

const hex = (h: number): RGB => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

const KEYS: Key[] = [
  { t: 0.0, ambient: [0.3, 0.31, 0.54], skyTop: hex(0x0a0f2c), skyBottom: hex(0x2a2352), lights: 1.3 },
  { t: 0.2, ambient: [0.36, 0.33, 0.56], skyTop: hex(0x161b46), skyBottom: hex(0x523c6c), lights: 1.2 },
  { t: 0.26, ambient: [0.86, 0.64, 0.62], skyTop: hex(0x4f6db0), skyBottom: hex(0xffa982), lights: 0.7 },
  { t: 0.33, ambient: [1.0, 0.92, 0.84], skyTop: hex(0x5f9fe0), skyBottom: hex(0xffe0bd), lights: 0.35 },
  { t: 0.5, ambient: [1.0, 0.99, 0.96], skyTop: hex(0x4f92de), skyBottom: hex(0xcfe7f7), lights: 0.25 },
  { t: 0.67, ambient: [1.0, 0.91, 0.79], skyTop: hex(0x5f94d6), skyBottom: hex(0xffd6a6), lights: 0.3 },
  { t: 0.735, ambient: [0.98, 0.64, 0.5], skyTop: hex(0x5656a6), skyBottom: hex(0xff9466), lights: 0.6 },
  { t: 0.78, ambient: [0.58, 0.46, 0.66], skyTop: hex(0x262a66), skyBottom: hex(0xb35f7c), lights: 1.0 },
  { t: 0.84, ambient: [0.33, 0.33, 0.56], skyTop: hex(0x0e1338), skyBottom: hex(0x3a2a5c), lights: 1.25 },
  { t: 1.0, ambient: [0.3, 0.31, 0.54], skyTop: hex(0x0a0f2c), skyBottom: hex(0x2a2352), lights: 1.3 },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const smooth = (t: number) => t * t * (3 - 2 * t);

export interface DayState {
  t: number;
  hour: number;
  minute: number;
  phase: 'night' | 'dawn' | 'day' | 'dusk';
  /** 0 = full day, 1 = deep night */
  night: number;
  ambient: RGB;
  skyTop: RGB;
  skyBottom: RGB;
  lights: number;
  /** sun position: angle across the sky 0..π during the day; elevation 0..1 */
  sunAngle: number;
  sunElevation: number;
  moonElevation: number;
  /** shadow offset per pixel of height, in screen space */
  shadow: { dx: number; dy: number; alpha: number };
}

export function dayState(tIn: number): DayState {
  const t = ((tIn % 1) + 1) % 1;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1]!.t <= t) i++;
  const a = KEYS[i]!;
  const b = KEYS[i + 1]!;
  const k = smooth((t - a.t) / (b.t - a.t));
  const ambient = lerp3(a.ambient, b.ambient, k);
  const lum = ambient[0] * 0.3 + ambient[1] * 0.5 + ambient[2] * 0.2;
  const night = Math.max(0, Math.min(1, (0.95 - lum) / 0.55));
  const hours = t * 24;
  const hour = Math.floor(hours);
  const minute = Math.floor((hours - hour) * 60);
  const phase = hours < 5 || hours >= 20.5 ? 'night' : hours < 8 ? 'dawn' : hours < 17 ? 'day' : 'dusk';
  // sun from 6:00 to 19:00
  const sunT = (hours - 6) / 13;
  const sunAngle = Math.max(0, Math.min(1, sunT)) * Math.PI;
  const sunElevation = sunT > 0 && sunT < 1 ? Math.sin(sunAngle) : 0;
  const moonT = ((hours + 24 - 19.5) % 24) / 11;
  const moonElevation = moonT < 1 ? Math.sin(moonT * Math.PI) : 0;
  // shadows sweep from long west-pointing to long east-pointing; fade at night
  const len = sunElevation > 0.05 ? Math.min(2.2, 0.35 / Math.max(0.16, sunElevation)) : 0.6;
  const dir = Math.cos(sunAngle);
  return {
    t,
    hour,
    minute,
    phase,
    night,
    ambient,
    skyTop: lerp3(a.skyTop, b.skyTop, k),
    skyBottom: lerp3(a.skyBottom, b.skyBottom, k),
    lights: lerp(a.lights, b.lights, k),
    sunAngle,
    sunElevation,
    moonElevation,
    shadow: { dx: dir * len, dy: 0.55 * len, alpha: sunElevation > 0.05 ? 0.32 + 0.1 * (1 - sunElevation) : 0.18 },
  };
}

export interface ClockConfig {
  dayMode: DayMode;
  dayCycleMinutes: number;
  timeOfDay: number;
}

/**
 * Time of day for a wall-clock instant. In auto mode a full cycle lasts `dayCycleMinutes`
 * of real time and is anchored to the epoch, so every open tab shows the same sky.
 */
export function timeOfDay(cfg: ClockConfig, nowMs: number): number {
  switch (cfg.dayMode) {
    case 'day':
      return 0.5;
    case 'night':
      return 0.94;
    case 'manual':
      return ((cfg.timeOfDay % 1) + 1) % 1;
    default: {
      const cycle = Math.max(1, cfg.dayCycleMinutes) * 60_000;
      return ((nowMs % cycle) / cycle + 0.3) % 1;
    }
  }
}

/** Seasonal decorations from the real calendar date. */
export function seasonFor(date: Date): { halloween: boolean; newYear: boolean; friday: boolean } {
  const m = date.getMonth();
  const d = date.getDate();
  return {
    halloween: (m === 9 && d >= 20) || (m === 10 && d <= 2),
    newYear: (m === 11 && d >= 15) || (m === 0 && d <= 10),
    friday: date.getDay() === 5 && date.getHours() >= 16,
  };
}
