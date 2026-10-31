/**
 * Tolerant reader for Claude Code transcript JSONL (an internal, changing format).
 * Unknown fields are ignored and broken lines skipped; nothing here throws.
 * Produces office events for replay and token totals for cost ticks.
 */
import { MAIN_AGENT_ID, SCHEMA_VERSION } from './constants.js';
import { hookToEvents, projectFromDir, statusForTool } from './mapping.js';
import type { PrivacyOptions } from './privacy.js';
import type { OfficeEventInput } from './schema.js';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

export function parseJsonl(text: string): Obj[] {
  const out: Obj[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t);
      if (isObj(o)) out.push(o);
    } catch {
      // partial line (transcript still being written) or garbage: skip
    }
  }
  return out;
}

export interface UsageTotals {
  input: number;
  output: number;
  cacheCreate: number;
  cacheRead: number;
  /** input + output + cache creation; cache reads are cheap and excluded. */
  tokens: number;
}

export function usageOf(line: Obj): UsageTotals | undefined {
  const msg = isObj(line.message) ? line.message : undefined;
  const u = msg && isObj(msg.usage) ? msg.usage : undefined;
  if (!u) return undefined;
  const n = (k: string) => (typeof u[k] === 'number' ? (u[k] as number) : 0);
  const input = n('input_tokens');
  const output = n('output_tokens');
  const cacheCreate = n('cache_creation_input_tokens');
  const cacheRead = n('cache_read_input_tokens');
  return { input, output, cacheCreate, cacheRead, tokens: input + output + cacheCreate };
}

/** Sums usage over assistant lines, de-duplicating repeated message ids (streamed chunks). */
export function sumUsage(lines: Obj[]): UsageTotals {
  const seen = new Set<string>();
  const t: UsageTotals = { input: 0, output: 0, cacheCreate: 0, cacheRead: 0, tokens: 0 };
  for (const l of lines) {
    if (l.type !== 'assistant') continue;
    const msg = isObj(l.message) ? l.message : undefined;
    const key = str(msg?.id) ?? str(l.requestId) ?? str(l.uuid);
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    const u = usageOf(l);
    if (!u) continue;
    t.input += u.input;
    t.output += u.output;
    t.cacheCreate += u.cacheCreate;
    t.cacheRead += u.cacheRead;
    t.tokens += u.tokens;
  }
  return t;
}

export interface TranscriptReplayOptions extends PrivacyOptions {
  /** Extra subagent transcripts (agent-<id>.jsonl contents), keyed by agent id when known. */
  subagents?: { agentId?: string; text: string }[];
}

/**
 * Rebuilds a plausible event stream from transcripts. Tool calls become hook-shaped
 * payloads and go through the same `hookToEvents` mapping as live data, so replay
 * and live sessions look identical in the office.
 */
export function transcriptToEvents(mainText: string, opts: TranscriptReplayOptions = {}): OfficeEventInput[] {
  const lines = parseJsonl(mainText);
  const sub = (opts.subagents ?? []).flatMap((s) => parseJsonl(s.text).map((l) => (s.agentId && !l.agentId ? { ...l, agentId: s.agentId } : l)));
  const all = [...lines, ...sub]
    .map((l, i) => ({ l, t: Date.parse(str(l.timestamp) ?? '') || 0, i }))
    .filter((x) => x.t > 0)
    .sort((a, b) => a.t - b.t || a.i - b.i);
  if (all.length === 0) return [];

  const first = all[0]!.l;
  const session_id = str(first.sessionId) ?? 'replay-' + all[0]!.t.toString(36);
  const cwd = all.map((x) => str(x.l.cwd)).find(Boolean);
  const map = { source: 'replay' as const, projectDir: cwd, showContent: opts.showContent, hidePaths: opts.hidePaths };
  const events: OfficeEventInput[] = [];
  const push = (payload: Obj, ts: number) => events.push(...hookToEvents({ session_id, cwd, ...payload }, { ...map, now: ts }));

  push({ hook_event_name: 'SessionStart', source: 'replay' }, all[0]!.t);
  const toolNames = new Map<string, { name: string; agent?: string; t: number }>();
  const spawned = new Set<string>();
  const seenMsg = new Set<string>();

  for (const { l, t } of all) {
    const agentId = str(l.agentId);
    const owner = agentId && l.isSidechain !== false ? agentId : undefined;
    const msg = isObj(l.message) ? l.message : undefined;
    const content = msg?.content;
    if (owner && !spawned.has(owner)) {
      spawned.add(owner);
      push({ hook_event_name: 'SubagentStart', agent_id: owner, agent_type: str(l.agentType) ?? 'agent' }, t);
    }

    if (l.type === 'user' && !owner && typeof content === 'string' && l.isMeta !== true) {
      push({ hook_event_name: 'UserPromptSubmit' }, t);
    }
    if (l.type === 'assistant' && Array.isArray(content)) {
      for (const block of content) {
        if (!isObj(block) || block.type !== 'tool_use') continue;
        const name = str(block.name) ?? 'unknown';
        const id = str(block.id);
        if (id) toolNames.set(id, { name, ...(owner ? { agent: owner } : {}), t });
        push(
          { hook_event_name: 'PreToolUse', tool_name: name, tool_input: isObj(block.input) ? block.input : {}, tool_use_id: id, ...(owner ? { agent_id: owner } : {}) },
          t,
        );
      }
      const u = usageOf(l);
      const key = str(msg?.id) ?? str(l.uuid) ?? '';
      if (u && u.tokens > 0 && !seenMsg.has(key)) {
        seenMsg.add(key);
        events.push({
          v: SCHEMA_VERSION,
          id: 'tok-' + key.slice(-12) + '-' + t.toString(36),
          ts: t,
          source: 'replay',
          session_id,
          ...(projectFromDir(cwd) ? { project: projectFromDir(cwd)! } : {}),
          type: 'cost.tick',
          agent_id: owner ?? MAIN_AGENT_ID,
          tokens: u.tokens,
          mode: 'delta',
        });
      }
    }
    if (l.type === 'user' && Array.isArray(content)) {
      for (const block of content) {
        if (!isObj(block) || block.type !== 'tool_result') continue;
        const id = str(block.tool_use_id);
        const call = id ? toolNames.get(id) : undefined;
        const name = call?.name ?? 'unknown';
        const failed = block.is_error === true;
        push(
          {
            hook_event_name: failed ? 'PostToolUseFailure' : 'PostToolUse',
            tool_name: name,
            tool_use_id: id,
            duration_ms: call ? Math.max(0, t - call.t) : undefined,
            ...(call?.agent ? { agent_id: call.agent } : {}),
          },
          t,
        );
        const result = isObj(l.toolUseResult) ? l.toolUseResult : undefined;
        const subId = result ? str(result.agentId) : undefined;
        if ((name === 'Agent' || name === 'Task') && subId) {
          if (!spawned.has(subId)) {
            spawned.add(subId);
            push({ hook_event_name: 'SubagentStart', agent_id: subId, agent_type: str(result?.agentType) ?? 'agent' }, call?.t ?? t);
          }
          push({ hook_event_name: 'SubagentStop', agent_id: subId, agent_type: str(result?.agentType) ?? 'agent' }, t);
        }
      }
    }
  }
  push({ hook_event_name: 'Stop' }, all[all.length - 1]!.t + 1);
  return events.sort((a, b) => a.ts - b.ts);
}

export { statusForTool };
