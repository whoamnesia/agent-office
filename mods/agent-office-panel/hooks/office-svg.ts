// The mini office as one SVG string: an isometric room, the director behind
// glass in the back corner, subagents at desks. Pure: same input, same markup.
// Animation is SMIL only (the sandboxed frame runs no script).
import type { Status } from '../types'

export type Worker = { id: string; label: string; detail: string; status: Status }

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

/** Desk tiles for subagents, front to back is drawn by depth anyway. */
const SLOTS: ReadonlyArray<readonly [number, number]> = [
  [5, 1], [7, 1], [5, 3], [7, 3], [1, 5], [3, 5],
  [5, 5], [7, 5], [1, 7], [3, 7], [5, 7], [7, 7],
]
export const MAX_DESKS = SLOTS.length

const W = 320
const H = 216
const OX = 160
const OY = 60
const ROOM = 9

const BODY = ['#5b8def', '#e0697e', '#46b39d', '#d9a441', '#9b6fe0', '#4fb3d9', '#e08a4f', '#7aa04a']

const esc = (s: string) => s.replace(/[&<>"]/g, c => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'))
const r1 = (n: number) => Math.round(n * 10) / 10

/** Grid (x, y) at height z to screen. */
function p(x: number, y: number, z = 0): [number, number] {
  return [r1(OX + (x - y) * 16), r1(OY + (x + y) * 8 - z)]
}
const pts = (...ps: Array<[number, number]>) => ps.map(q => q.join(',')).join(' ')

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** A box on the floor: top and the two faces that look at the viewer. */
function box(x: number, y: number, w: number, d: number, h: number, top: string, left: string, right: string, z = 0): string {
  const t = [p(x, y, z + h), p(x + w, y, z + h), p(x + w, y + d, z + h), p(x, y + d, z + h)] as const
  return (
    `<polygon points="${pts(p(x, y + d, z), p(x + w, y + d, z), t[2], t[3])}" fill="${left}"/>` +
    `<polygon points="${pts(p(x + w, y, z), p(x + w, y + d, z), t[2], t[1])}" fill="${right}"/>` +
    `<polygon points="${pts(...t)}" fill="${top}"/>`
  )
}

function room(): string {
  let s = ''
  // Floor: a checker of two near tones.
  for (let x = 0; x < ROOM; x++)
    for (let y = 0; y < ROOM; y++)
      s += `<polygon points="${pts(p(x, y), p(x + 1, y), p(x + 1, y + 1), p(x, y + 1))}" fill="${(x + y) % 2 ? '#2b2f45' : '#30354d'}"/>`
  // Back walls, 44 px tall, with night windows.
  const wh = 44
  s += `<polygon points="${pts(p(0, 0), p(ROOM, 0), p(ROOM, 0, wh), p(0, 0, wh))}" fill="#3a3f5c"/>`
  s += `<polygon points="${pts(p(0, 0), p(0, ROOM), p(0, ROOM, wh), p(0, 0, wh))}" fill="#33385a"/>`
  for (let i = 0; i < 3; i++) {
    const a = 4.6 + i * 1.5
    s += `<polygon points="${pts(p(a, 0, 14), p(a + 1, 0, 14), p(a + 1, 0, 36), p(a, 0, 36))}" fill="#1b2140"/>`
    s += `<polygon points="${pts(p(a, 0, 14), p(a + 1, 0, 14), p(a + 1, 0, 20), p(a, 0, 20))}" fill="#ffd76a" opacity=".55"/>`
    s += `<polygon points="${pts(p(0, a, 14), p(0, a + 1, 14), p(0, a + 1, 36), p(0, a, 36))}" fill="#182040"/>`
  }
  // A star or two blinking in the windows.
  const [sx, sy] = p(6.4, 0, 31)
  s += `<rect x="${sx}" y="${sy}" width="1" height="1" fill="#fff"><animate attributeName="opacity" values="1;.2;1" dur="3s" repeatCount="indefinite"/></rect>`
  // Wall trim.
  s += `<polyline points="${pts(p(0, ROOM, wh), p(0, 0, wh), p(ROOM, 0, wh))}" fill="none" stroke="#4a5078" stroke-width="2"/>`
  return s
}

function glass(): string {
  // The director's office: tiles 0..3 on both axes, glass on the two inner sides.
  const g = 30
  const c = 3.4
  return (
    `<polygon points="${pts(p(c, 0), p(c, c), p(c, c, g), p(c, 0, g))}" fill="#9fd8ff" opacity=".16" stroke="#bfe6ff" stroke-opacity=".5"/>` +
    `<polygon points="${pts(p(0, c), p(c, c), p(c, c, g), p(0, c, g))}" fill="#9fd8ff" opacity=".2" stroke="#bfe6ff" stroke-opacity=".5"/>` +
    `<line x1="${p(0.6, c, 22)[0]}" y1="${p(0.6, c, 22)[1]}" x2="${p(1.4, c, 10)[0]}" y2="${p(1.4, c, 10)[1]}" stroke="#fff" stroke-opacity=".35"/>`
  )
}

function plant(x: number, y: number): string {
  const [px, py] = p(x, y)
  return box(x - 0.15, y - 0.15, 0.3, 0.3, 6, '#8a5a3c', '#6e4630', '#5c3a28') +
    `<circle cx="${px}" cy="${py - 11}" r="4.5" fill="#3f9b5b"/><circle cx="${px - 2}" cy="${py - 13}" r="3" fill="#56b872"/>`
}

/** Typing hands: a small bob, faster for writing. */
function hands(status: Status, x: number, y: number): string {
  const busy = status === 'writing' || status === 'reading' || status === 'running'
  const anim = busy
    ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -1;0 0" dur="${status === 'writing' ? '.25s' : '.6s'}" repeatCount="indefinite"/>`
    : ''
  return `<g><rect x="${x - 6}" y="${y - 10}" width="3" height="2" fill="#f1c7a5">${anim}</rect><rect x="${x + 3}" y="${y - 10}" width="3" height="2" fill="#f1c7a5">${anim.replace('values="0 0;0 -1;0 0"', 'values="0 -1;0 0;0 -1"')}</rect></g>`
}

/** What floats above the head. */
function badge(status: Status, x: number, y: number): string {
  const c = COLOR[status]
  switch (status) {
    case 'thinking': {
      const dots = [0, 1, 2]
        .map(i => `<circle cx="${x - 4 + i * 4}" cy="${y}" r="1.3" fill="#2b2f45"><animate attributeName="opacity" values=".2;1;.2" dur="1.2s" begin="${i * 0.3}s" repeatCount="indefinite"/></circle>`)
        .join('')
      return `<g><ellipse cx="${x}" cy="${y}" rx="8" ry="4.5" fill="#fff"/><circle cx="${x - 5}" cy="${y + 5}" r="1.4" fill="#fff"/>${dots}</g>`
    }
    case 'waiting_user':
      return `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur=".7s" repeatCount="indefinite"/><circle cx="${x}" cy="${y}" r="5" fill="${c}"/><rect x="${x - 0.8}" y="${y - 3.2}" width="1.6" height="4" fill="#fff"/><rect x="${x - 0.8}" y="${y + 1.6}" width="1.6" height="1.4" fill="#fff"/></g>`
    case 'error':
      return `<g><circle cx="${x}" cy="${y}" r="5" fill="${c}"><animate attributeName="opacity" values="1;.4;1" dur=".8s" repeatCount="indefinite"/></circle><path d="M${x - 2} ${y - 2}l4 4M${x + 2} ${y - 2}l-4 4" stroke="#fff" stroke-width="1.4"/></g>`
    case 'done': {
      const bits = [0, 1, 2, 3, 4, 5]
        .map(i => {
          const dx = (i - 2.5) * 4
          const col = ['#ffd76a', '#ff8f6b', '#6fc3ff', '#57d68d', '#b69cff', '#fff'][i]
          return `<rect x="${x + dx}" y="${y - 4}" width="2" height="2" fill="${col}"><animate attributeName="y" values="${y - 6};${y + 14}" dur="1.4s" begin="${i * 0.12}s" repeatCount="3" fill="freeze"/><animate attributeName="opacity" values="1;0" dur="1.4s" begin="${i * 0.12}s" repeatCount="3" fill="freeze"/></rect>`
        })
        .join('')
      return `<g>${bits}<circle cx="${x}" cy="${y}" r="5" fill="${c}"/><path d="M${x - 2.4} ${y}l1.8 1.8 3.2-3.4" fill="none" stroke="#fff" stroke-width="1.4"/></g>`
    }
    case 'searching':
      return `<g><animateTransform attributeName="transform" type="rotate" values="-15 ${x} ${y};15 ${x} ${y};-15 ${x} ${y}" dur="1.6s" repeatCount="indefinite"/><circle cx="${x - 1}" cy="${y - 1}" r="3" fill="none" stroke="${c}" stroke-width="1.6"/><path d="M${x + 1.2} ${y + 1.2}l2.6 2.6" stroke="${c}" stroke-width="1.8"/></g>`
    case 'idle':
      return `<text x="${x}" y="${y}" font-size="7" font-family="monospace" fill="#c9cde0">z<animate attributeName="y" values="${y};${y - 6}" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="2.4s" repeatCount="indefinite"/></text>`
    default:
      return ''
  }
}

/** A desk with a monitor and the agent sitting in front of it, back to us. */
function desk(w: Worker, gx: number, gy: number, boss: boolean): string {
  const st = w.status
  const c = COLOR[st]
  const dw = boss ? 1.6 : 1.1
  let s = box(gx, gy, dw, 0.6, 10, boss ? '#a8774f' : '#8d97b8', boss ? '#7a5537' : '#6b7493', boss ? '#694830' : '#5a6280')
  // Monitor on the back of the desk; its glow takes the status colour.
  const [mx, my] = p(gx + dw / 2, gy + 0.2, 10)
  const screen = st === 'error' ? '#ff5a5a' : st === 'idle' || st === 'done' ? '#3a4060' : c
  const flicker =
    st === 'error'
      ? `<animate attributeName="opacity" values="1;.3;1" dur=".5s" repeatCount="indefinite"/>`
      : st === 'running' || st === 'writing'
        ? `<animate attributeName="opacity" values=".85;1;.85" dur="1.1s" repeatCount="indefinite"/>`
        : ''
  s += `<rect x="${mx - 1}" y="${my - 3}" width="2" height="3" fill="#20243a"/>`
  s += `<rect x="${mx - 7}" y="${my - 13}" width="14" height="10" rx="1" fill="#20243a"/>`
  s += `<rect x="${mx - 6}" y="${my - 12}" width="12" height="8" fill="${screen}">${flicker}</rect>`
  if (st === 'writing' || st === 'running' || st === 'reading')
    s += [0, 1, 2]
      .map(i => `<rect x="${mx - 5}" y="${my - 11 + i * 2.4}" width="${4 + ((i * 3) % 5)}" height="1" fill="#20243a" opacity=".55"><animate attributeName="width" values="2;${7 - i};2" dur="${0.8 + i * 0.3}s" repeatCount="indefinite"/></rect>`)
      .join('')
  if (st !== 'error' && st !== 'idle' && st !== 'done') s += `<ellipse cx="${mx}" cy="${my - 8}" rx="11" ry="8" fill="${c}" opacity=".12"/>`

  // The agent, in front of the desk.
  const [ax, ay] = p(gx + dw / 2 + 0.25, gy + 1.15)
  const body = boss ? '#2f3550' : BODY[hash(w.label) % BODY.length]
  const dim = st === 'idle' || st === 'done' ? ' opacity=".75"' : ''
  s += `<ellipse cx="${ax}" cy="${ay}" rx="9" ry="4.5" fill="none" stroke="${c}" stroke-width="1.6" opacity=".9">${st === 'waiting_user' || st === 'error' ? '<animate attributeName="stroke-width" values="1.2;2.6;1.2" dur="1s" repeatCount="indefinite"/>' : ''}</ellipse>`
  s += `<g${dim}>`
  s += `<rect x="${ax - 6}" y="${ay - 9}" width="12" height="7" rx="2" fill="#262a40"/>` // chair
  s += `<rect x="${ax - 4.5}" y="${ay - 17}" width="9" height="11" rx="3" fill="${body}"/>`
  if (boss) s += `<path d="M${ax} ${ay - 16}l-1.2 2 1.2 5 1.2-5z" fill="#e0b84f"/>`
  s += `<circle cx="${ax}" cy="${ay - 20}" r="4" fill="#f1c7a5"/>`
  s += `<path d="M${ax - 4} ${ay - 20.5}a4 4 0 0 1 8 0z" fill="${boss ? '#cfd3e6' : ['#3b2a20', '#6b4a2b', '#1f1f2a', '#a8642e'][hash(w.id) % 4]}"/>`
  s += hands(st, ax, ay - 2)
  s += `</g>`
  s += badge(st, ax + 8, ay - 28)

  const tip = `${w.label} · ${WORD[st]}${w.detail ? ` · ${w.detail}` : ''}`
  return `<g><title>${esc(tip)}</title>${s}</g>`
}

/**
 * The whole office. `director` sits behind glass; `workers` take desks in
 * order, at most MAX_DESKS of them (the caller picks which).
 */
export function officeSvg(director: Worker, workers: readonly Worker[]): string {
  let s = room()
  s += plant(0.5, 3.0)
  s += plant(8.5, 0.5)
  s += desk(director, 0.9, 0.7, true)
  s += `<g><title>Кабинет директора</title>${glass()}</g>`
  const [lx, ly] = p(0.2, 3.6, 31)
  s += `<text x="${lx}" y="${ly}" font-size="6" font-family="monospace" fill="#bfe6ff" opacity=".8">DIRECTOR</text>`
  const placed = workers.slice(0, MAX_DESKS).map((w, i) => ({ w, at: SLOTS[i]! }))
  placed.sort((a, b) => a.at[0] + a.at[1] - (b.at[0] + b.at[1]) || a.at[0] - b.at[0])
  for (const { w, at } of placed) s += desk(w, at[0], at[1], false)
  if (workers.length === 0) {
    const [tx, ty] = p(5.6, 5.6)
    s += `<text x="${tx}" y="${ty}" text-anchor="middle" font-size="7" font-family="monospace" fill="#8a8fa8">столы свободны</text>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#1a1d2e"/>${s}</svg>`.replace(/(\.\d)\d{6,}/g, '$1')
}

export const OFFICE_RATIO = H / W
