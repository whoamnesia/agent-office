/**
 * The office world model: pure, deterministic given (events, time). No rendering here.
 * Projects become buildings, sessions become floors, agents become workers.
 */
import { MAIN_AGENT_ID, nameFor, seeded, type AgentStatusName, type DepartmentName, type OfficeEvent, type SourceName } from '@agent-office/protocol';
import { CITY_W, LOTS } from './city-layout.js';
import type { Pt } from './grid.js';
import { buildFloorPlan, type Desk, type Facing, type FloorPlan, type Spot } from './office-layout.js';

export const MAX_FLOORS = 5;
const WALK_SPEED = 2.4; // tiles per second
const FAMILY_BY_TYPE: Record<string, string> = {
  explore: 'explore',
  'general-purpose': 'general',
  general: 'general',
  plan: 'plan',
  'code-reviewer': 'review',
  reviewer: 'review',
  'test-runner': 'qa',
  tester: 'qa',
  qa: 'qa',
  'docs-writer': 'docs',
  docs: 'docs',
  'security-auditor': 'security',
  security: 'security',
  'frontend-dev': 'frontend',
  frontend: 'frontend',
};
const FAMILIES = ['explore', 'general', 'plan', 'review', 'qa', 'docs', 'security', 'frontend'];
const DEPT_BY_TYPE: Record<string, DepartmentName> = { explore: 'research', plan: 'general', review: 'backend', qa: 'qa', docs: 'docs', security: 'security', frontend: 'frontend', general: 'general' };

export interface ToolRecord {
  id?: string;
  name: string;
  target?: string;
  ok?: boolean;
  durationMs?: number;
  ts: number;
}

export interface Task {
  id: string;
  subject: string;
  done: boolean;
  createdAt: number;
  doneAt?: number;
}

export type Place = 'desk' | 'server' | 'analytics' | 'meeting' | 'outbox' | 'elevator';
export type Phase = 'enter' | 'active' | 'outbox' | 'celebrate' | 'exit' | 'gone';

export interface Agent {
  key: string;
  id: string;
  sessionId: string;
  floorId: string;
  director: boolean;
  type: string;
  family: string;
  preset: string;
  name: string;
  parentId?: string;
  status: AgentStatusName;
  statusSince: number;
  dept: DepartmentName;
  deptVotes: Partial<Record<DepartmentName, number>>;
  deskId?: string;
  pos: Pt;
  path: Pt[];
  facing: Facing;
  phase: Phase;
  phaseSince: number;
  place: Place;
  placeSince: number;
  spot?: Spot;
  anim: string;
  meetingUntil: number;
  tools: ToolRecord[];
  files: string[];
  calls: number;
  errors: number;
  tokens: number;
  usd?: number;
  task?: string;
  spawnedAt: number;
  endedAt?: number;
  lastEventAt: number;
  source: SourceName;
}

export interface Floor {
  id: string;
  sessionId: string;
  buildingId: string;
  projectName: string;
  source: SourceName;
  startedAt: number;
  endedAt?: number;
  lastActivity: number;
  tasks: Task[];
  agentKeys: Set<string>;
  pendingSpawners: string[];
  deskOwner: Map<string, string>;
  calls: number;
  errors: number;
  tokens: number;
}

export interface Building {
  id: string;
  name: string;
  slot: number;
  cloud: boolean;
  lot: Pt;
  floors: string[];
  openFloor?: string;
  lastActivity: number;
}

export type EffectKind = 'confetti' | 'smoke' | 'spark' | 'heart' | 'package' | 'donuts' | 'bell' | 'ding' | 'doc' | 'clap';
export interface Effect {
  kind: EffectKind;
  floorId?: string;
  pos: Pt;
  at: number;
}

export interface Achievement {
  id: string;
  title: { ru: string; en: string };
  unlockedAt?: number;
}

export interface WorldStats {
  activeAgents: number;
  sessions: number;
  callsWindow: number;
  errorsWindow: number;
  tokens: number;
  usd: number;
  greenStreak: number;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_agent', title: { ru: 'Первый сотрудник', en: 'First hire' } },
  { id: 'team_of_5', title: { ru: 'Пятеро в офисе', en: 'Team of five' } },
  { id: 'chain', title: { ru: 'Цепочка делегирования', en: 'Delegation chain' } },
  { id: 'green_10', title: { ru: '10 зелёных тестов подряд', en: '10 green tests in a row' } },
  { id: 'green_100', title: { ru: '100 зелёных тестов подряд', en: '100 green tests in a row' } },
  { id: 'first_deploy', title: { ru: 'Первый деплой', en: 'First deploy' } },
  { id: 'kanban_5', title: { ru: '5 задач закрыто', en: '5 tasks closed' } },
  { id: 'night_owl', title: { ru: 'Ночная смена', en: 'Night shift' } },
  { id: 'cloud', title: { ru: 'Облачный филиал', en: 'Cloud branch' } },
];

export class World {
  readonly plan: FloorPlan = buildFloorPlan();
  readonly buildings = new Map<string, Building>();
  readonly floors = new Map<string, Floor>();
  readonly agents = new Map<string, Agent>();
  effects: Effect[] = [];
  achievements: Achievement[] = ACHIEVEMENTS.map((a) => ({ ...a }));
  /** recent tool results for health/weather: [ts, ok, dept] */
  private recent: [number, boolean, string | undefined][] = [];
  private greenStreak = 0;
  /** agents that already left; late hook events must not bring them back */
  private ended = new Set<string>();
  private tasksDone = 0;
  now = 0;
  private lastPrune = 0;
  lang: 'ru' | 'en' = 'ru';
  /** set while replaying history so workers snap into place instead of walking */
  catchingUp = false;
  /** night factor from the renderer, used for the night-owl achievement */
  night = 0;
  onAchievement?: (a: Achievement) => void;

  /** Clears all state (used when scrubbing the replay timeline). */
  reset(): void {
    this.buildings.clear();
    this.floors.clear();
    this.agents.clear();
    this.effects = [];
    this.recent = [];
    this.ended.clear();
    this.greenStreak = 0;
    this.tasksDone = 0;
  }

  // ------------------------------------------------------------------ events

  applyAll(events: OfficeEvent[], now: number): void {
    this.catchingUp = true;
    for (const e of [...events].sort((a, b) => a.ts - b.ts)) this.apply(e);
    this.catchingUp = false;
    this.now = now;
    this.prune(now, true);
    for (const a of this.agents.values()) this.snap(a);
    this.effects = [];
  }

  apply(e: OfficeEvent): void {
    const t = this.catchingUp ? e.ts : Math.max(this.now, e.ts);
    if (!this.catchingUp) this.now = Math.max(this.now, e.ts);
    const floor = this.ensureFloor(e, t);
    if (!floor) return;
    floor.lastActivity = t;
    this.buildings.get(floor.buildingId)!.lastActivity = t;
    switch (e.type) {
      case 'session.start':
        floor.endedAt = undefined;
        break;
      case 'session.end':
        floor.endedAt = t;
        for (const k of floor.agentKeys) {
          const a = this.agents.get(k);
          if (a && !a.director) this.finish(a, t);
        }
        break;
      case 'agent.spawn': {
        const a = this.ensureAgent(floor, e.agent_id, t, e.source, e.agent_type, true)!;
        if (e.task) a.task = e.task;
        if (!a.director) {
          a.parentId = e.parent_id ?? floor.pendingSpawners.shift() ?? MAIN_AGENT_ID;
          if (a.parentId !== MAIN_AGENT_ID) {
            const parent = this.agents.get(floor.id + ':' + a.parentId);
            // a delegation chain gathers at the meeting room board for a moment
            if (parent && (parent.phase === 'active' || parent.phase === 'enter')) {
              parent.meetingUntil = t + 6000;
              a.meetingUntil = t + 6000;
              this.unlock('chain', t);
            }
          }
        }
        break;
      }
      case 'agent.end': {
        const a = this.agents.get(floor.id + ':' + e.agent_id);
        if (a) this.finish(a, t);
        break;
      }
      case 'agent.status': {
        const a = this.ensureAgent(floor, e.agent_id, t, e.source);
        if (!a || a.phase === 'outbox' || a.phase === 'celebrate' || a.phase === 'exit' || a.phase === 'gone') break;
        if (e.dept) this.vote(a, e.dept);
        if (a.status !== e.status) {
          if (e.status === 'error') {
            a.errors++;
            floor.errors++;
            this.fx('smoke', floor.id, this.deskPos(a), t);
          }
          if (e.status === 'waiting_user') this.fx('bell', floor.id, a.pos, t);
          a.status = e.status;
          a.statusSince = t;
        }
        a.lastEventAt = t;
        if (e.status === 'done' && !a.director) this.fx('confetti', floor.id, a.pos, t);
        break;
      }
      case 'tool.call': {
        const a = this.ensureAgent(floor, e.agent_id, t, e.source);
        if (!a) break;
        a.calls++;
        floor.calls++;
        a.lastEventAt = t;
        if (e.dept) this.vote(a, e.dept);
        a.tools.push({ id: e.tool_use_id, name: e.name, target: e.target, ts: t });
        if (a.tools.length > 14) a.tools.shift();
        if (e.target && /^(Read|Edit|Write|MultiEdit|NotebookEdit)$/.test(e.name) && !a.files.includes(e.target)) {
          a.files.unshift(e.target);
          if (a.files.length > 30) a.files.pop();
        }
        if (e.name === 'Agent' || e.name === 'Task') floor.pendingSpawners.push(e.agent_id);
        break;
      }
      case 'tool.result': {
        const a = this.agents.get(floor.id + ':' + e.agent_id);
        if (a) {
          const rec = [...a.tools].reverse().find((r) => (e.tool_use_id ? r.id === e.tool_use_id : r.name === e.name && r.ok === undefined));
          if (rec) {
            rec.ok = e.ok;
            rec.durationMs = e.duration_ms;
          }
          const dept = a.dept;
          this.recent.push([t, e.ok, dept]);
          if (this.recent.length > 400) this.recent.splice(0, 100);
          if (dept === 'qa' && e.name === 'Bash') {
            this.greenStreak = e.ok ? this.greenStreak + 1 : 0;
            if (this.greenStreak >= 10) this.unlock('green_10', t);
            if (this.greenStreak >= 100) this.unlock('green_100', t);
          }
          if (dept === 'devops' && e.ok && e.name === 'Bash') this.unlock('first_deploy', t);
          if (e.ok && Math.random() < 0.08 && !this.catchingUp) this.fx('package', floor.id, this.deskPos(a), t);
        }
        break;
      }
      case 'task.created':
        if (!floor.tasks.some((x) => x.id === e.task_id)) floor.tasks.push({ id: e.task_id, subject: e.subject, done: false, createdAt: t });
        if (floor.tasks.length > 40) floor.tasks.shift();
        break;
      case 'task.completed': {
        const task = floor.tasks.find((x) => x.id === e.task_id);
        if (task) {
          task.done = true;
          task.doneAt = t;
        } else floor.tasks.push({ id: e.task_id, subject: e.subject, done: true, createdAt: t, doneAt: t });
        this.tasksDone++;
        if (this.tasksDone >= 5) this.unlock('kanban_5', t);
        this.fx('donuts', floor.id, [this.plan.kanban.x + 1.5, 1.2], t);
        this.fx('clap', floor.id, [this.plan.kanban.x + 1.5, 1.2], t);
        break;
      }
      case 'notify':
        if (e.kind === 'permission_prompt' && e.agent_id) {
          const a = this.agents.get(floor.id + ':' + e.agent_id);
          if (a) this.fx('bell', floor.id, a.pos, t);
        }
        break;
      case 'cost.tick': {
        const key = floor.id + ':' + (e.agent_id ?? MAIN_AGENT_ID);
        // token totals may arrive after the agent left: update it if it is still around, never resurrect it
        const a = this.agents.get(key) ?? (this.ended.has(key) ? undefined : this.ensureAgent(floor, e.agent_id ?? MAIN_AGENT_ID, t, e.source));
        if (!a) break;
        const before = a.tokens;
        if (e.mode === 'delta') {
          a.tokens += e.tokens;
          if (e.usd !== undefined) a.usd = (a.usd ?? 0) + e.usd;
        } else {
          a.tokens = Math.max(a.tokens, e.tokens);
          if (e.usd !== undefined) a.usd = e.usd;
        }
        floor.tokens += a.tokens - before;
        break;
      }
    }
    if (this.night > 0.6 && !this.catchingUp && (e.type === 'tool.call' || e.type === 'agent.spawn')) this.unlock('night_owl', t);
  }

  private ensureFloor(e: OfficeEvent, t: number): Floor | undefined {
    let floor = this.floors.get(e.session_id);
    if (floor) return floor;
    if (e.type === 'session.end' || e.type === 'cost.tick') return undefined;
    const project = e.project ?? { id: 'p-unknown', name: 'project' };
    const cloud = e.source === 'cloud';
    const bid = cloud ? 'cloud' : project.id;
    let b = this.buildings.get(bid);
    if (!b) {
      const used = new Set([...this.buildings.values()].map((x) => x.slot));
      let slot = cloud ? 2 : [0, 1].find((s) => !used.has(s)) ?? -1;
      if (slot === -1) {
        // more local projects than lots: they share the second tower
        const shared = [...this.buildings.values()].find((x) => x.slot === 1);
        if (shared) b = shared;
        slot = 1;
      }
      if (!b) {
        b = { id: bid, name: cloud ? 'Cloud Branch' : project.name, slot, cloud, lot: LOTS[slot]!, floors: [], lastActivity: t };
        this.buildings.set(bid, b);
      }
      if (cloud) this.unlock('cloud', t);
    }
    floor = {
      id: e.session_id,
      sessionId: e.session_id,
      buildingId: b.id,
      projectName: project.name,
      source: e.source,
      startedAt: t,
      lastActivity: t,
      tasks: [],
      agentKeys: new Set(),
      pendingSpawners: [],
      deskOwner: new Map(),
      calls: 0,
      errors: 0,
      tokens: 0,
    };
    this.floors.set(floor.id, floor);
    b.floors.push(floor.id);
    if (b.floors.length > MAX_FLOORS) {
      // drop the least recently active ended floor, else the oldest
      const victim = [...b.floors].map((id) => this.floors.get(id)!).sort((x, y) => (x.endedAt ? 0 : 1) - (y.endedAt ? 0 : 1) || x.lastActivity - y.lastActivity)[0]!;
      this.removeFloor(victim.id);
    }
    b.openFloor = floor.id;
    return floor;
  }

  private ensureAgent(floor: Floor, agentId: string, t: number, source: SourceName, type?: string, spawn = false): Agent | undefined {
    const key = floor.id + ':' + agentId;
    if (this.ended.has(key)) {
      if (!spawn) return undefined;
      this.ended.delete(key);
      this.agents.delete(key);
    }
    const existing = this.agents.get(key);
    if (existing) {
      if (type && existing.type === 'agent' && !existing.director) {
        existing.type = type;
        existing.family = familyFor(type, agentId);
        existing.preset = presetFor(existing.family, agentId);
      }
      if (existing.phase === 'gone') {
        existing.phase = 'enter';
        existing.phaseSince = t;
      }
      return existing;
    }
    const director = agentId === MAIN_AGENT_ID;
    const realType = director ? 'director' : (type ?? 'agent');
    const family = director ? 'director' : familyFor(realType, agentId);
    const a: Agent = {
      key,
      id: agentId,
      sessionId: floor.sessionId,
      floorId: floor.id,
      director,
      type: realType,
      family,
      preset: director ? 'director' : presetFor(family, agentId),
      name: director ? (this.lang === 'ru' ? 'Директор' : 'Director') : nameFor(agentId, this.lang),
      status: 'idle',
      statusSince: t,
      dept: director ? 'general' : (DEPT_BY_TYPE[family] ?? 'general'),
      deptVotes: {},
      pos: [...this.plan.spots.elevator.pos] as Pt,
      path: [],
      facing: 'se',
      phase: 'enter',
      phaseSince: t,
      place: 'elevator',
      placeSince: t,
      anim: 'idle',
      meetingUntil: 0,
      tools: [],
      files: [],
      calls: 0,
      errors: 0,
      tokens: 0,
      spawnedAt: t,
      lastEventAt: t,
      source,
    };
    this.agents.set(key, a);
    floor.agentKeys.add(key);
    this.assignDesk(a, floor);
    if (!director) {
      this.fx('ding', floor.id, this.plan.spots.elevator.pos, t);
      this.unlock('first_agent', t);
      const active = [...this.agents.values()].filter((x) => !x.director && x.phase !== 'gone').length;
      if (active >= 5) this.unlock('team_of_5', t);
    } else {
      a.phase = 'active';
      a.pos = [...this.deskFor(a)!.seat] as Pt;
      a.place = 'desk';
    }
    return a;
  }

  private vote(a: Agent, dept: DepartmentName) {
    if (a.director) return;
    a.deptVotes[dept] = (a.deptVotes[dept] ?? 0) + 1;
    const best = (Object.entries(a.deptVotes) as [DepartmentName, number][]).sort((x, y) => y[1] - x[1])[0]![0];
    // research and devops work happens in rooms; the desk follows the dominant code area
    if (best !== a.dept && (a.deptVotes[best] ?? 0) >= 2) {
      a.dept = best;
      const floor = this.floors.get(a.floorId);
      if (floor) this.assignDesk(a, floor);
    }
  }

  private assignDesk(a: Agent, floor: Floor) {
    const desks = this.plan.desks;
    if (a.director) {
      floor.deskOwner.set('director', a.key);
      a.deskId = 'director';
      return;
    }
    const wanted = a.dept === 'research' ? 'general' : a.dept;
    const free = (d: Desk) => {
      const o = floor.deskOwner.get(d.id);
      return !o || o === a.key;
    };
    const cur = a.deskId ? desks.find((d) => d.id === a.deskId) : undefined;
    if (cur && cur.dept === wanted) return;
    const pick = desks.find((d) => d.dept === wanted && free(d)) ?? (cur && cur.dept !== 'director' ? cur : undefined) ?? desks.find((d) => (d.dept === 'general' || d.dept === 'docs') && free(d)) ?? desks.find((d) => d.dept !== 'director' && free(d));
    if (a.deskId) floor.deskOwner.delete(a.deskId);
    a.deskId = pick?.id;
    if (pick) floor.deskOwner.set(pick.id, a.key);
  }

  deskFor(a: Agent): Desk | undefined {
    return a.deskId ? this.plan.desks.find((d) => d.id === a.deskId) : undefined;
  }

  private deskPos(a: Agent): Pt {
    return (this.deskFor(a)?.seat ?? a.pos) as Pt;
  }

  private finish(a: Agent, t: number) {
    if (a.director || a.phase === 'outbox' || a.phase === 'celebrate' || a.phase === 'exit' || a.phase === 'gone') return;
    a.endedAt = t;
    this.ended.add(a.key);
    if (this.ended.size > 5000) this.ended.delete(this.ended.values().next().value!);
    a.status = 'done';
    a.statusSince = t;
    a.phase = 'outbox';
    a.phaseSince = t;
    a.path = [];
    const floor = this.floors.get(a.floorId);
    if (floor && a.deskId) floor.deskOwner.delete(a.deskId);
  }

  private fx(kind: EffectKind, floorId: string | undefined, pos: Pt, at: number) {
    if (this.catchingUp) return;
    this.effects.push({ kind, floorId, pos: [pos[0], pos[1]], at });
    if (this.effects.length > 200) this.effects.splice(0, 50);
  }

  private unlock(id: string, t: number) {
    const a = this.achievements.find((x) => x.id === id);
    if (a && !a.unlockedAt) {
      a.unlockedAt = t;
      if (!this.catchingUp) this.onAchievement?.(a);
    }
  }

  private removeFloor(id: string) {
    const f = this.floors.get(id);
    if (!f) return;
    for (const k of f.agentKeys) this.agents.delete(k);
    this.floors.delete(id);
    const b = this.buildings.get(f.buildingId);
    if (b) {
      b.floors = b.floors.filter((x) => x !== id);
      if (b.openFloor === id) b.openFloor = b.floors[b.floors.length - 1];
      if (!b.floors.length) this.buildings.delete(b.id);
    }
  }

  /** Removes finished/stale floors and agents. In catch-up mode history older than a few hours is dropped. */
  prune(now: number, hard = false) {
    for (const f of [...this.floors.values()]) {
      const endedLongAgo = f.endedAt !== undefined && now - f.endedAt > (hard ? 0 : 25_000);
      const stale = now - f.lastActivity > (hard ? 4 : 12) * 3600_000;
      if (endedLongAgo || stale) this.removeFloor(f.id);
    }
    for (const a of [...this.agents.values()]) {
      const dead = a.phase === 'gone' || (!a.director && a.phase === 'active' && now - a.lastEventAt > 45 * 60_000);
      if (dead || (hard && a.phase !== 'active' && a.phase !== 'enter')) {
        this.agents.delete(a.key);
        const f = this.floors.get(a.floorId);
        f?.agentKeys.delete(a.key);
        if (f && a.deskId && f.deskOwner.get(a.deskId) === a.key) f.deskOwner.delete(a.deskId);
      }
    }
  }

  // ------------------------------------------------------------------ simulation

  tick(dtMs: number, now: number): void {
    this.now = now;
    const dt = Math.min(dtMs, 250) / 1000;
    for (const a of this.agents.values()) this.step(a, dt, now);
    if (now - this.lastPrune > 5000) {
      this.lastPrune = now;
      this.prune(now);
    }
  }

  private desired(a: Agent, now: number): Place {
    if (a.director) return 'desk';
    if (a.meetingUntil > now) return 'meeting';
    const since = now - a.statusSince;
    let place: Place = 'desk';
    if (a.status === 'running' && since > 1200 && a.dept !== 'devops') place = 'server';
    else if (a.status === 'searching' && since > 800) place = 'analytics';
    // stay in a room a little while so short tool switches don't cause pacing
    if (a.place !== 'desk' && a.place !== place && now - a.placeSince < 3500 && (a.place === 'server' || a.place === 'analytics')) place = a.place;
    return place;
  }

  private spotFor(a: Agent, place: Place): Spot | undefined {
    const s = this.plan.spots;
    const floor = this.floors.get(a.floorId);
    const taken = new Set<string>();
    if (floor)
      for (const k of floor.agentKeys) {
        const o = this.agents.get(k);
        if (o && o !== a && o.spot) taken.add(o.spot.pos.join(','));
      }
    const firstFree = (list: Spot[]) => list.find((x) => !taken.has(x.pos.join(','))) ?? list[Math.floor(seeded(a.key, 9) * list.length)];
    switch (place) {
      case 'desk': {
        const d = this.deskFor(a);
        return d ? { pos: d.seat, facing: d.facing } : firstFree(s.lounge);
      }
      case 'server':
        return firstFree(s.server);
      case 'analytics':
        return firstFree(s.analytics);
      case 'meeting':
        return firstFree(s.meeting);
      case 'outbox':
        return s.outbox;
      case 'elevator':
        return s.elevator;
    }
  }

  private go(a: Agent, spot: Spot) {
    a.spot = spot;
    if (this.catchingUp) {
      a.pos = [...spot.pos] as Pt;
      a.facing = spot.facing;
      a.path = [];
      return;
    }
    const p = this.plan.grid.path(a.pos, spot.pos) ?? [];
    // last waypoint: the exact spot (seats are off-centre)
    a.path = [...p.slice(0, -1), [spot.pos[0], spot.pos[1]]];
  }

  private snap(a: Agent) {
    if (a.phase === 'enter') a.phase = 'active';
    const place = this.desired(a, this.now);
    const spot = this.spotFor(a, place);
    if (spot) {
      a.spot = spot;
      a.pos = [...spot.pos] as Pt;
      a.facing = spot.facing;
      a.place = place;
      a.path = [];
    }
    a.anim = this.animFor(a, true);
  }

  private step(a: Agent, dt: number, now: number) {
    // movement
    if (a.path.length) {
      let budget = WALK_SPEED * dt;
      while (budget > 0 && a.path.length) {
        const [tx, ty] = a.path[0]!;
        const dx = tx - a.pos[0];
        const dy = ty - a.pos[1];
        const dist = Math.hypot(dx, dy);
        if (dist < 1e-3) {
          a.path.shift();
          continue;
        }
        if (Math.abs(dx) > Math.abs(dy)) a.facing = dx > 0 ? 'se' : 'nw';
        else a.facing = dy > 0 ? 'sw' : 'ne';
        const mv = Math.min(budget, dist);
        a.pos = [a.pos[0] + (dx / dist) * mv, a.pos[1] + (dy / dist) * mv];
        budget -= mv;
        if (mv >= dist) a.path.shift();
      }
      if (!a.path.length && a.spot) a.facing = a.spot.facing;
    }
    const moving = a.path.length > 0;

    switch (a.phase) {
      case 'enter':
        if (now - a.phaseSince > 600) {
          a.phase = 'active';
          a.phaseSince = now;
        }
        break;
      case 'active': {
        const place = this.desired(a, now);
        const spot = this.spotFor(a, place);
        if (place !== a.place || (spot && a.spot && (spot.pos[0] !== a.spot.pos[0] || spot.pos[1] !== a.spot.pos[1]))) {
          if (place !== a.place) a.placeSince = now;
          a.place = place;
          if (spot) this.go(a, spot);
        } else if (!a.spot && spot) this.go(a, spot);
        break;
      }
      case 'outbox':
        if (a.place !== 'outbox') {
          a.place = 'outbox';
          const o = this.plan.spots.outbox;
          // spread simultaneous deliveries so finishers don't stack on one tile
          const j = seeded(a.key, 5);
          this.go(a, { pos: [o.pos[0] + (j - 0.5) * 1.6, o.pos[1] - j * 0.8], facing: o.facing });
        } else if (!moving) {
          a.phase = 'celebrate';
          a.phaseSince = now;
          this.fx('doc', a.floorId, this.plan.spots.outbox.pos, now);
          this.fx('confetti', a.floorId, a.pos, now);
        }
        break;
      case 'celebrate':
        if (now - a.phaseSince > 1800) {
          a.phase = 'exit';
          a.phaseSince = now;
          a.place = 'elevator';
          this.go(a, this.plan.spots.elevator);
        }
        break;
      case 'exit':
        if (!moving) {
          a.phase = 'gone';
          a.phaseSince = now;
          this.fx('ding', a.floorId, this.plan.spots.elevator.pos, now);
        }
        break;
    }
    a.anim = moving ? (a.phase === 'outbox' ? 'carry' : 'walk') : this.animFor(a, false);
  }

  private animFor(a: Agent, _snap: boolean): string {
    if (a.phase === 'celebrate') return 'joy';
    if (a.phase === 'enter' || a.phase === 'exit' || a.phase === 'gone') return 'idle';
    const seated = a.place === 'desk' && !!this.deskFor(a) && this.deskFor(a)!.sprite !== 'terminal';
    const since = this.now - a.statusSince;
    switch (a.status) {
      case 'waiting_user':
        return 'hand';
      case 'error':
        return seated ? 'error' : 'idle';
      case 'done':
        return 'joy';
      case 'thinking':
        return seated ? 'think' : 'idle';
      case 'reading':
        return seated ? 'read' : 'idle';
      case 'writing':
        return seated ? 'type' : 'idle';
      case 'running':
        return seated ? 'type' : 'idle';
      case 'searching':
        return seated ? 'read' : 'idle';
      case 'idle':
      default:
        if (seated && since > 60_000) return 'sleep';
        return seated ? 'sit' : 'idle';
    }
  }

  // ------------------------------------------------------------------ queries

  stats(now: number): WorldStats {
    const win = now - 10 * 60_000;
    const recent = this.recent.filter((r) => r[0] >= win);
    let tokens = 0;
    let usd = 0;
    for (const a of this.agents.values()) {
      tokens += a.tokens;
      usd += a.usd ?? 0;
    }
    return {
      activeAgents: [...this.agents.values()].filter((a) => !a.director && a.phase !== 'gone').length,
      sessions: this.floors.size,
      callsWindow: recent.length,
      errorsWindow: recent.filter((r) => !r[1]).length,
      tokens,
      usd,
      greenStreak: this.greenStreak,
    };
  }

  /** 0 = healthy, 1 = on fire. Drives auto weather and the deadline mode. */
  health(now: number): { errorRate: number; volume: number; qaGreen: boolean } {
    const win = this.recent.filter((r) => r[0] >= now - 5 * 60_000);
    const errors = win.filter((r) => !r[1]).length;
    const qa = win.filter((r) => r[2] === 'qa');
    return { errorRate: win.length ? errors / win.length : 0, volume: win.length, qaGreen: qa.length >= 3 && qa.every((r) => r[1]) };
  }

  floorAgents(floorId: string): Agent[] {
    const f = this.floors.get(floorId);
    return f ? [...f.agentKeys].map((k) => this.agents.get(k)!).filter((a) => a && a.phase !== 'gone') : [];
  }

  takeEffects(): Effect[] {
    const e = this.effects;
    this.effects = [];
    return e;
  }

  get cityWidth() {
    return CITY_W;
  }
}

export function familyFor(type: string, agentId: string): string {
  const t = type.toLowerCase();
  if (FAMILY_BY_TYPE[t]) return FAMILY_BY_TYPE[t]!;
  for (const [k, v] of Object.entries(FAMILY_BY_TYPE)) if (t.includes(k)) return v;
  return FAMILIES[Math.floor(seeded(type || agentId, 1) * FAMILIES.length)]!;
}

export function presetFor(family: string, agentId: string): string {
  return `${family}_${Math.floor(seeded(agentId, 2) * 3)}`;
}
