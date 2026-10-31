import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hookToEvents, parseJsonl, validateEvents, type OfficeEvent } from '@agent-office/protocol';
import { buildCityPlan, buildFloorPlan, dayState, seasonFor, timeOfDay, World } from '@agent-office/office-core';

const fixture = (n: string) => fs.readFileSync(new URL(`../fixtures/${n}`, import.meta.url), 'utf8');
const realEvents = (): OfficeEvent[] => validateEvents(parseJsonl(fixture('hooks/real-session-subagent.jsonl')).flatMap((p, i) => hookToEvents(p, { now: 1_000 + i * 500 }))).ok;

function ev(session: string, body: Record<string, unknown>, ts: number, project = { id: 'p-a', name: 'alpha' }, source = 'demo'): OfficeEvent {
  return validateEvents({ v: 1, id: `${session}-${ts}-${Math.random()}`, ts, source, session_id: session, project, ...body }).ok[0]!;
}

describe('floor plan', () => {
  const plan = buildFloorPlan();
  it('every desk seat and every spot is reachable from the elevator', () => {
    const from = plan.spots.elevator.pos;
    const targets = [...plan.desks.map((d) => d.seat), ...Object.values(plan.spots).flatMap((s) => (Array.isArray(s) ? s.map((x) => x.pos) : [s.pos]))];
    for (const t of targets) expect(plan.grid.path(from, t), `unreachable ${t}`).toBeDefined();
  });
  it('has desks for every department and a director desk', () => {
    const depts = new Set(plan.desks.map((d) => d.dept));
    for (const d of ['director', 'frontend', 'backend', 'qa', 'security', 'docs', 'general', 'devops']) expect(depts.has(d as never)).toBe(true);
  });
  it('glass partitions block walking through them', () => {
    // director office (row 3) to open space (row 4) only through the door at x=2
    expect(plan.grid.canStep(0, 3, 0, 4)).toBe(false);
    expect(plan.grid.canStep(2, 3, 2, 4)).toBe(true);
  });
});

describe('city plan', () => {
  const city = buildCityPlan();
  it('pedestrians can reach the cafe, food truck, metro and park from the HQ entrance', () => {
    const from = city.pois.entrance[0]!;
    for (const t of [city.pois.cafe.counter.pos, city.pois.foodTruck.counter.pos, city.pois.metro.pos, city.pois.fountain[0]!.pos, city.pois.busStop[0]!.pos])
      expect(city.grid.path(from, t), `unreachable ${t}`).toBeDefined();
  });
  it('the road can only be crossed at the crosswalk', () => {
    expect(city.grid.isBlocked(10, 34)).toBe(true);
    expect(city.grid.isBlocked(23, 34)).toBe(false);
  });
  it('has at least 6 kinds of active environment objects', () => {
    const kinds = new Set(city.items.map((i) => i.sprite.replace(/_\d+$/, '').replace(/^(tree|traffic|scooter|pumpkin).*/, '$1')));
    for (const k of ['fountain', 'cafe', 'food_truck', 'flower_stall', 'bus_stop', 'metro', 'traffic', 'lamppost']) expect(kinds.has(k)).toBe(true);
    expect(city.parking.length).toBeGreaterThan(10);
  });
});

describe('world from real hooks', () => {
  it('builds a floor with the director and the subagent, with tool history', () => {
    const w = new World();
    for (const e of realEvents()) w.apply(e);
    expect(w.floors.size).toBe(1);
    const agents = [...w.agents.values()];
    expect(agents.some((a) => a.director)).toBe(true);
    const sub = agents.find((a) => a.id === 'aa113a5a56d802045')!;
    expect(sub.tools.map((t) => t.name)).toEqual(['Read', 'Bash']);
    expect(sub.tools[0]!.ok).toBe(false);
    expect(sub.errors).toBe(1);
    expect(sub.parentId).toBe('main');
    const f = [...w.floors.values()][0]!;
    expect(f.tasks).toEqual([expect.objectContaining({ subject: 'probe task', done: true })]);
  });
});

describe('worker lifecycle', () => {
  it('walks from the elevator to a desk, works, delivers to the outbox and leaves', () => {
    const w = new World();
    let t = 1000;
    w.apply(ev('s1', { type: 'session.start' }, t));
    w.apply(ev('s1', { type: 'agent.spawn', agent_id: 'x1', agent_type: 'frontend-dev' }, t));
    const a = w.agents.get('s1:x1')!;
    expect(a.phase).toBe('enter');
    for (let i = 0; i < 300; i++) w.tick(50, (t += 50));
    expect(a.place).toBe('desk');
    expect(a.path.length).toBe(0);
    const desk = w.deskFor(a)!;
    expect(desk.dept).toBe('frontend');
    expect(a.pos).toEqual(desk.seat);
    w.apply(ev('s1', { type: 'agent.status', agent_id: 'x1', status: 'writing' }, t));
    w.tick(50, (t += 50));
    expect(a.anim).toBe('type');
    w.apply(ev('s1', { type: 'agent.status', agent_id: 'x1', status: 'running' }, t));
    for (let i = 0; i < 200; i++) w.tick(50, (t += 50));
    expect(a.place).toBe('server');
    w.apply(ev('s1', { type: 'agent.end', agent_id: 'x1' }, t));
    for (let i = 0; i < 600 && w.agents.has('s1:x1') && a.phase !== 'gone'; i++) w.tick(50, (t += 50));
    expect(['gone']).toContain(a.phase);
    expect(w.effects.length + 1).toBeGreaterThan(0);
  });

  it('late hook events never resurrect a worker who already left', () => {
    const w = new World();
    let t = 1000;
    w.apply(ev('s1', { type: 'session.start' }, t));
    w.apply(ev('s1', { type: 'agent.spawn', agent_id: 'p', agent_type: 'Plan' }, t));
    w.apply(ev('s1', { type: 'agent.end', agent_id: 'p' }, t));
    for (let i = 0; i < 600; i++) w.tick(50, (t += 50));
    w.prune(t + 10_000);
    expect(w.agents.has('s1:p')).toBe(false);
    // the child's PostToolUse marks the parent "thinking" and a token total arrives late
    w.apply(ev('s1', { type: 'agent.status', agent_id: 'p', status: 'thinking' }, t));
    w.apply(ev('s1', { type: 'cost.tick', agent_id: 'p', tokens: 100, mode: 'absolute' }, t));
    w.apply(ev('s1', { type: 'tool.call', agent_id: 'p', name: 'Read' }, t));
    expect(w.agents.has('s1:p')).toBe(false);
    // but a genuine new spawn with the same id works
    w.apply(ev('s1', { type: 'agent.spawn', agent_id: 'p', agent_type: 'Plan' }, t));
    expect(w.agents.get('s1:p')!.phase).toBe('enter');
  });

  it('infers the parent from the preceding Agent tool call and gathers chains in the meeting room', () => {
    const w = new World();
    const t = 5000;
    w.apply(ev('s1', { type: 'session.start' }, t));
    w.apply(ev('s1', { type: 'agent.spawn', agent_id: 'p1', agent_type: 'Plan' }, t));
    w.apply(ev('s1', { type: 'tool.call', agent_id: 'p1', name: 'Agent' }, t + 10));
    w.apply(ev('s1', { type: 'agent.spawn', agent_id: 'c1', agent_type: 'Explore' }, t + 20));
    expect(w.agents.get('s1:c1')!.parentId).toBe('p1');
    for (let i = 1; i < 40; i++) w.tick(50, t + 20 + i * 50);
    expect(w.agents.get('s1:c1')!.place).toBe('meeting');
    expect(w.agents.get('s1:p1')!.place).toBe('meeting');
    expect(w.achievements.find((a) => a.id === 'chain')!.unlockedAt).toBeDefined();
  });

  it('separates sessions into floors and projects into buildings; cloud goes to the Cloud Branch', () => {
    const w = new World();
    w.apply(ev('a', { type: 'session.start' }, 1));
    w.apply(ev('b', { type: 'session.start' }, 2));
    w.apply(ev('c', { type: 'session.start' }, 3, { id: 'p-b', name: 'beta' }));
    w.apply(ev('d', { type: 'session.start' }, 4, { id: 'p-c', name: 'gamma' }, 'cloud'));
    expect(w.floors.size).toBe(4);
    expect(w.buildings.size).toBe(3);
    expect(w.buildings.get('p-a')!.floors).toEqual(['a', 'b']);
    expect(w.buildings.get('cloud')!.slot).toBe(2);
  });

  it('catch-up from history snaps workers to their desks and drops old sessions', () => {
    const w = new World();
    const now = 10 * 3600_000;
    const evs = [ev('old', { type: 'session.start' }, 1000), ev('new', { type: 'session.start' }, now - 1000), ev('new', { type: 'agent.spawn', agent_id: 'q', agent_type: 'test-runner' }, now - 900)];
    w.applyAll(evs, now);
    expect(w.floors.has('old')).toBe(false);
    const a = w.agents.get('new:q')!;
    expect(a.path.length).toBe(0);
    expect(a.pos).toEqual(w.deskFor(a)!.seat);
  });
});

describe('time of day', () => {
  it('cycles every dayCycleMinutes in auto mode', () => {
    const cfg = { dayMode: 'auto' as const, dayCycleMinutes: 15, timeOfDay: 0 };
    const a = timeOfDay(cfg, 0);
    expect(timeOfDay(cfg, 15 * 60_000)).toBeCloseTo(a, 6);
    expect(timeOfDay(cfg, 7.5 * 60_000)).toBeCloseTo((a + 0.5) % 1, 6);
  });
  it('manual day/night pins the clock', () => {
    expect(timeOfDay({ dayMode: 'day', dayCycleMinutes: 15, timeOfDay: 0 }, 123)).toBe(0.5);
    expect(dayState(timeOfDay({ dayMode: 'night', dayCycleMinutes: 15, timeOfDay: 0 }, 1)).night).toBeGreaterThan(0.8);
  });
  it('night is dark, noon is bright, transitions are smooth', () => {
    expect(dayState(0.5).night).toBeLessThan(0.05);
    expect(dayState(0.0).night).toBeGreaterThan(0.8);
    let prev = dayState(0).ambient;
    for (let t = 0.001; t < 1; t += 0.001) {
      const cur = dayState(t).ambient;
      expect(Math.abs(cur[0] - prev[0]) + Math.abs(cur[1] - prev[1]) + Math.abs(cur[2] - prev[2])).toBeLessThan(0.05);
      prev = cur;
    }
  });
  it('knows it is Halloween season at the end of October', () => {
    expect(seasonFor(new Date(2026, 9, 30)).halloween).toBe(true);
    expect(seasonFor(new Date(2026, 6, 1)).halloween).toBe(false);
  });
});
