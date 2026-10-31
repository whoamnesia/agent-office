import { z } from 'zod';
import { AGENT_STATUSES, DEPARTMENTS, SCHEMA_VERSION, SOURCES } from './constants.js';

export const Source = z.enum(SOURCES);
export type Source = z.infer<typeof Source>;

export const AgentStatus = z.enum(AGENT_STATUSES);
export type AgentStatus = z.infer<typeof AgentStatus>;

export const Department = z.enum(DEPARTMENTS);
export type Department = z.infer<typeof Department>;

const id = z.string().min(1).max(200);
const shortText = z.string().max(300);

/** Project (= building). Derived from cwd; `name` is the folder name only. */
export const ProjectRef = z.object({
  id: id,
  name: z.string().max(120),
});
export type ProjectRef = z.infer<typeof ProjectRef>;

const base = {
  v: z.literal(SCHEMA_VERSION),
  id: id,
  ts: z.number().int().nonnegative(),
  source: Source,
  session_id: id,
  project: ProjectRef.optional(),
};

export const SessionStart = z.object({
  ...base,
  type: z.literal('session.start'),
  reason: z.string().max(40).optional(),
  /** Local-only: transcript location, stripped before broadcasting. */
  transcript: z.string().max(1000).optional(),
});
export const SessionEnd = z.object({ ...base, type: z.literal('session.end'), reason: z.string().max(40).optional() });
export const AgentSpawn = z.object({
  ...base,
  type: z.literal('agent.spawn'),
  agent_id: id,
  agent_type: z.string().max(80),
  parent_id: id.optional(),
  /** Short task label; only filled when showContent is on. */
  task: shortText.optional(),
});
export const AgentEnd = z.object({
  ...base,
  type: z.literal('agent.end'),
  agent_id: id,
  ok: z.boolean().optional(),
  transcript: z.string().max(1000).optional(),
});
export const AgentStatusEvent = z.object({
  ...base,
  type: z.literal('agent.status'),
  agent_id: id,
  status: AgentStatus,
  /** Department hint derived from the tool target, so the worker can walk to the right room. */
  dept: Department.optional(),
});
export const ToolCall = z.object({
  ...base,
  type: z.literal('tool.call'),
  agent_id: id,
  tool_use_id: id.optional(),
  name: z.string().max(120),
  target: shortText.optional(),
  dept: Department.optional(),
});
export const ToolResult = z.object({
  ...base,
  type: z.literal('tool.result'),
  agent_id: id,
  tool_use_id: id.optional(),
  name: z.string().max(120),
  ok: z.boolean(),
  duration_ms: z.number().nonnegative().optional(),
});
export const TaskCreated = z.object({
  ...base,
  type: z.literal('task.created'),
  task_id: id,
  subject: shortText,
  agent_id: id.optional(),
});
export const TaskCompleted = z.object({
  ...base,
  type: z.literal('task.completed'),
  task_id: id,
  subject: shortText,
  agent_id: id.optional(),
});
export const Notify = z.object({
  ...base,
  type: z.literal('notify'),
  kind: z.string().max(60),
  message: shortText.optional(),
  agent_id: id.optional(),
});
export const CostTick = z.object({
  ...base,
  type: z.literal('cost.tick'),
  agent_id: id.optional(),
  tokens: z.number().nonnegative(),
  usd: z.number().nonnegative().optional(),
  /** absolute = running total for the agent/session; delta = increment. */
  mode: z.enum(['absolute', 'delta']).default('absolute'),
});

export const OfficeEvent = z.discriminatedUnion('type', [
  SessionStart,
  SessionEnd,
  AgentSpawn,
  AgentEnd,
  AgentStatusEvent,
  ToolCall,
  ToolResult,
  TaskCreated,
  TaskCompleted,
  Notify,
  CostTick,
]);
export type OfficeEvent = z.infer<typeof OfficeEvent>;
export type OfficeEventInput = z.input<typeof OfficeEvent>;
export type EventType = OfficeEvent['type'];
export type EventOf<T extends EventType> = Extract<OfficeEvent, { type: T }>;

/** A batch as POSTed by emitters and relays. */
export const EventBatch = z.union([OfficeEvent, z.array(OfficeEvent).max(500)]);

export interface ValidationResult {
  ok: OfficeEvent[];
  rejected: number;
}

/** Validates a parsed body (single event or array); invalid items are dropped, never thrown. */
export function validateEvents(body: unknown): ValidationResult {
  const items = Array.isArray(body) ? body.slice(0, 500) : [body];
  const ok: OfficeEvent[] = [];
  let rejected = 0;
  for (const item of items) {
    const r = OfficeEvent.safeParse(item);
    if (r.success) ok.push(r.data);
    else rejected++;
  }
  return { ok, rejected };
}

/** Fields that must never leave the local machine/daemon (stripped before broadcast). */
export function stripLocalFields<T extends OfficeEvent>(e: T): T {
  if ('transcript' in e && e.transcript !== undefined) {
    const { transcript: _t, ...rest } = e as T & { transcript?: string };
    return rest as T;
  }
  return e;
}
