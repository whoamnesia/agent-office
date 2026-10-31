// The mini office as one SVG string, drawn with the web office's own pixel art:
// the room, the director behind glass, subagents at desks, sorted by depth like
// the web renderer does. The app's scrub allows no <image>, so each sprite is
// vector pixels (sprites.ts), defined once and placed with <use>. Pure: same
// input, same markup. Animation is SMIL only (the sandboxed frame runs no script).
import type { Status } from '../types'
import { ANIM, SCENE, V } from './sprites'

export type Worker = { id: string; label: string; detail: string; status: Status; type?: string }

export const COLOR: Record<Status, string> = {
  thinking: '#b69cff',
  reading: '#6fc3ff',
  writing: '#ffb35c',
  running: '#7ef0a0',
  searching: '#ffe08a',
  waiting_user: '#ff8f6b',
  error: '#ff5a5a',
  done: '#57d68d',
  idle: '#8a8fa8',
}

export const WORD: Record<Status, string> = {
  thinking: 'думает',
  reading: 'читает',
  writing: 'пишет',
  running: 'запускает',
  searching: 'ищет',
  waiting_user: 'ждёт вас',
  error: 'ошибка',
  done: 'готово',
  idle: 'отдыхает',
}

/** Seat 0 is the director's; the rest are desks. */
export const MAX_DESKS = SCENE.seats.length - 1
export const OFFICE_RATIO = SCENE.h / SCENE.w

/** The web office's seated animation for each status (office-core animFor). */
const ANIM_FOR: Record<Status, string> = {
  thinking: 'think',
  reading: 'read',
  writing: 'type',
  running: 'type',
  searching: 'read',
  waiting_user: 'hand',
  error: 'error',
  done: 'joy',
  idle: 'sit',
}
/** Frames per second, as the web character view plays them. */
const FPS: Record<string, number> = { sit: 0.5, type: 7, read: 1.2, think: 1.1, hand: 3, error: 4, joy: 6 }

const SCREEN_FOR: Record<Status, readonly string[]> = {
  thinking: ['screen_think_0', 'screen_think_1'],
  reading: ['screen_code_0', 'screen_code_1', 'screen_code_2'],
  writing: ['screen_code_0', 'screen_code_1', 'screen_code_2'],
  running: ['screen_term_0', 'screen_term_1'],
  searching: ['screen_search_0', 'screen_search_1'],
  waiting_user: ['screen_wait_0', 'screen_wait_1'],
  error: ['screen_error_0', 'screen_error_1'],
  done: ['screen_done_0'],
  idle: ['screen_idle_0', 'screen_idle_1'],
}

const ICON_FOR: Partial<Record<Status, readonly string[]>> = {
  thinking: ['icon_think_0', 'icon_think_1', 'icon_think_2'],
  reading: ['icon_book'],
  writing: ['icon_pen'],
  running: ['icon_gear'],
  searching: ['icon_search'],
  waiting_user: ['icon_alert'],
  error: ['icon_error'],
  done: ['icon_done'],
  idle: ['icon_zzz_0', 'icon_zzz_1'],
}

/** office-core familyFor: the agent type picks the look, unknown types by hash. */
const FAMILY_BY_TYPE: Record<string, string> = {
  explore: 'explore', 'general-purpose': 'general', general: 'general', plan: 'plan',
  'code-reviewer': 'review', reviewer: 'review', 'test-runner': 'qa', tester: 'qa', qa: 'qa',
  'docs-writer': 'docs', docs: 'docs', 'security-auditor': 'security', security: 'security',
  'frontend-dev': 'frontend', frontend: 'frontend',
}
const FAMILIES = ['explore', 'general', 'plan', 'review', 'qa', 'docs', 'security', 'frontend']

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
function presetOf(w: Worker): string {
  if (w.id === 'main') return 'director'
  const t = (w.type ?? w.label).toLowerCase()
  const known = FAMILY_BY_TYPE[t] ?? Object.entries(FAMILY_BY_TYPE).find(([k]) => t.includes(k))?.[1]
  return `${known ?? FAMILIES[hash(t || w.id) % FAMILIES.length]}_0`
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'))

/** The sprites one drawing uses, each defined once: name → id. */
type Defs = Map<string, string>

/** One sprite placed at (px, py). */
function sprite(defs: Defs, name: string, px: number, py: number): string {
  const v = V[name]
  if (!v) return ''
  let id = defs.get(name)
  if (!id) defs.set(name, (id = `k${defs.size}`))
  return `<use href="#${id}" x="${px + v[0]}" y="${py + v[1]}"/>`
}

/** Frames cycling at fps: the pixels they share stay, each frame's own show in its slice of the loop. */
function anim(defs: Defs, frames: readonly string[], fps: number, px: number, py: number, common?: string): string {
  const base = common ? sprite(defs, common, px, py) : ''
  if (frames.length <= 1) return base + sprite(defs, frames[0] ?? '', px, py)
  const dur = `${Math.round((frames.length / fps) * 1000)}ms`
  return (
    base +
    frames
      .map((name, i) => {
        const values = frames.map((_, j) => (j === i ? 1 : 0)).join(';')
        return `<g><animate attributeName="opacity" values="${values}" calcMode="discrete" dur="${dur}" repeatCount="indefinite"/>${sprite(defs, name, px, py)}</g>`
      })
      .join('')
  )
}

/** The icon over a head; a waiting worker's bounces, a finished one's sheds confetti. */
function icon(defs: Defs, st: Status, px: number, py: number): string {
  const frames = ICON_FOR[st]
  if (!frames) return ''
  const y = py - 30
  let out = anim(defs, frames, frames.length > 2 ? 2.5 : 1, px, y)
  if (st === 'waiting_user')
    out = `<g>${out}<animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="600ms" repeatCount="indefinite"/></g>`
  if (st === 'error')
    out += `<g opacity=".8">${anim(defs, ['smoke_0', 'smoke_1', 'smoke_2'], 4, px + 6, y + 6)}</g>`
  if (st === 'done')
    out += ['confetti_0', 'confetti_1', 'confetti_2', 'confetti_3']
      .map((c, i) => {
        const dx = [-9, -3, 4, 10][i]!
        return `<g>${sprite(defs, c, px + dx, y - 4)}<animateTransform attributeName="transform" type="translate" values="0 0;${i % 2 ? 2 : -2} 22" dur="${1200 + i * 230}ms" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;0" dur="${1200 + i * 230}ms" repeatCount="indefinite"/></g>`
      })
      .join('')
  return out
}

/** The Svg element's cap on source length. */
const LIMIT = 131072

/** The office; a crowd whose animations would overflow the cap is drawn on its first frames. */
export function officeSvg(director: Worker, desks: readonly Worker[]): string {
  const svg = draw(director, desks, false)
  return svg.length < LIMIT ? svg : draw(director, desks, true)
}

function draw(director: Worker, desks: readonly Worker[], still: boolean): string {
  const defs: Defs = new Map()
  const room = SCENE.room.map(([name, px, py]) => sprite(defs, name, px, py)).join('')
  const layers: Array<[number, string]> = SCENE.overlays.map(([name, px, py, d]) => [d, sprite(defs, name, px, py)])
  const icons: string[] = []
  const placed: Array<Worker | undefined> = [director, ...desks.slice(0, MAX_DESKS)]
  SCENE.seats.forEach((seat, i) => {
    const w = placed[i]
    if (!w) return
    const { px, py, d } = seat
    if (seat.screen) {
      const [sx, sy, sd] = seat.screen
      const fast = w.status === 'writing' || w.status === 'running'
      layers.push([sd, anim(defs, SCREEN_FOR[w.status].slice(0, still ? 1 : undefined), fast ? 3 : 1, sx, sy)])
    }
    const preset = presetOf(w)
    const a = ANIM_FOR[w.status]
    const key = ANIM[`${preset}/${seat.back ? 'back' : 'front'}/${a}`] ? `${preset}/${seat.back ? 'back' : 'front'}/${a}` : `${preset}/front/${a}`
    const tip = `<title>${esc([w.label, WORD[w.status], w.detail].filter(Boolean).join(' · '))}</title>`
    layers.push([
      d,
      `<g>${tip}<ellipse cx="${px}" cy="${py}" rx="8" ry="3.5" stroke="${COLOR[w.status]}" stroke-width="1.5" opacity=".9"/>${anim(defs, (ANIM[key] ?? []).slice(0, still ? 1 : undefined), FPS[a] ?? 1, px, py, `${key}/c`)}</g>`,
    ])
    icons.push(`<g>${tip}${icon(defs, w.status, px, py)}</g>`)
  })
  layers.sort((x, y) => x[0] - y[0])

  const { x, y, w, h } = SCENE
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" fill="none" shape-rendering="crispEdges">` +
    `<defs>${[...defs].map(([name, id]) => `<g id="${id}">${V[name]![2]}</g>`).join('')}</defs>` +
    room +
    layers.map(l => l[1]).join('') +
    icons.join('') +
    `</svg>`
  )
}
