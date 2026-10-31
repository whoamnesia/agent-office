/**
 * Hook payload → office events. Pure and dependency-free: this module is bundled into
 * the `ao-emit` hook binary, so it must not import zod or anything heavy.
 * Unknown hook events and malformed payloads map to an empty list, never throw.
 */
import { MAIN_AGENT_ID, SCHEMA_VERSION, type AgentStatusName, type DepartmentName, type SourceName } from './constants.js';
import { classifyDept, type DeptRule } from './departments.js';
import { displayCommand, displayPath, hostOf, maskSecrets, truncate, type PrivacyOptions } from './privacy.js';
import type { OfficeEventInput, ProjectRef } from './schema.js';

export interface MapOptions extends PrivacyOptions {
  source?: SourceName;
  now?: number;
  /** Stable project root (CLAUDE_PROJECT_DIR); falls back to the payload cwd. */
  projectDir?: string;
  deptRules?: DeptRule[];
  makeId?: () => string;
  /** Keep transcript paths on events (local daemon only). */
  includeTranscripts?: boolean;
}

type Payload = Record<string, unknown>;

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);

let counter = 0;
function defaultId(now: number): string {
  counter = (counter + 1) % 1e6;
  return now.toString(36) + '-' + counter.toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/** FNV-1a, enough to derive a stable, non-reversible project id from a path. */
export function hashId(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function projectFromDir(dir: string | undefined): ProjectRef | undefined {
  if (!dir) return undefined;
  const norm = dir.replace(/\\/g, '/').replace(/\/+$/, '');
  const name = norm.split('/').pop() || norm || 'project';
  return { id: 'p-' + hashId(norm), name: truncate(name, 60) };
}

export function statusForTool(tool: string): AgentStatusName {
  switch (tool) {
    case 'Read':
    case 'Grep':
    case 'Glob':
    case 'LS':
    case 'NotebookRead':
      return 'reading';
    case 'Edit':
    case 'Write':
    case 'MultiEdit':
    case 'NotebookEdit':
      return 'writing';
    case 'Bash':
    case 'BashOutput':
    case 'KillShell':
    case 'KillBash':
    case 'PowerShell':
    case 'Monitor':
      return 'running';
    case 'WebSearch':
    case 'WebFetch':
      return 'searching';
    default:
      if (tool.startsWith('mcp__')) return 'searching';
      return 'thinking';
  }
}

interface Target {
  target?: string;
  dept?: DepartmentName;
}

function describeTool(tool: string, input: Payload, root: string | undefined, opts: MapOptions): Target {
  const rules = opts.deptRules;
  const p = str(input.file_path) ?? str(input.notebook_path) ?? str(input.path);
  switch (tool) {
    case 'Bash':
    case 'PowerShell': {
      const cmd = str(input.command) ?? '';
      return { target: displayCommand(cmd, opts), dept: classifyDept({ tool, command: cmd }, rules) ?? 'devops' };
    }
    case 'WebFetch':
      return { target: hostOf(str(input.url) ?? '') || 'web', dept: 'research' };
    case 'WebSearch':
      return { target: opts.showContent ? truncate(maskSecrets(str(input.query) ?? ''), 80) : 'web search', dept: 'research' };
    case 'Agent':
    case 'Task': {
      const kind = str(input.subagent_type) ?? 'agent';
      const desc = opts.showContent && str(input.description) ? ': ' + truncate(maskSecrets(str(input.description)!), 60) : '';
      return { target: kind + desc };
    }
    case 'Grep': {
      const where = p ? displayPath(p, root, opts) : '.';
      const pat = opts.showContent && str(input.pattern) ? ' /' + truncate(maskSecrets(str(input.pattern)!), 40) + '/' : '';
      return { target: where + pat, dept: p ? classifyDept({ tool, path: rel(p, root) }, rules) : undefined };
    }
    case 'Glob': {
      const pat = str(input.pattern) ?? '';
      return { target: truncate(maskSecrets(pat), 80), dept: classifyDept({ tool, path: pat }, rules) };
    }
    default:
      if (tool.startsWith('mcp__')) return { target: tool.split('__')[1] ?? 'mcp', dept: 'research' };
      if (p) return { target: displayPath(p, root, opts), dept: classifyDept({ tool, path: rel(p, root) }, rules) };
      return {};
  }
}

function rel(p: string, root: string | undefined): string {
  const norm = p.replace(/\\/g, '/');
  if (root) {
    const r = root.replace(/\\/g, '/').replace(/\/+$/, '');
    if (norm.startsWith(r + '/')) return norm.slice(r.length + 1);
  }
  return norm.replace(/^\/+/, '');
}

/** Maps one Claude Code hook payload (already JSON-parsed stdin) to office events. */
export function hookToEvents(raw: unknown, opts: MapOptions = {}): OfficeEventInput[] {
  if (!raw || typeof raw !== 'object') return [];
  const p = raw as Payload;
  const hook = str(p.hook_event_name);
  const session_id = str(p.session_id);
  if (!hook || !session_id) return [];

  const now = opts.now ?? Date.now();
  const makeId = opts.makeId ?? (() => defaultId(now));
  const root = opts.projectDir ?? str(p.cwd);
  const project = projectFromDir(root);
  const agent_id = str(p.agent_id) ?? MAIN_AGENT_ID;
  const common = { v: SCHEMA_VERSION, ts: now, source: opts.source ?? 'local', session_id, ...(project ? { project } : {}) };
  const ev = <T extends object>(body: T) => ({ ...common, id: makeId(), ...body }) as unknown as OfficeEventInput;
  const status = (a: string, s: AgentStatusName, dept?: DepartmentName) =>
    ev({ type: 'agent.status', agent_id: a, status: s, ...(dept ? { dept } : {}) });
  const tool = str(p.tool_name) ?? 'unknown';
  const toolUseId = str(p.tool_use_id);
  const transcript = opts.includeTranscripts ? str(p.transcript_path) : undefined;

  switch (hook) {
    case 'SessionStart':
      return [
        ev({ type: 'session.start', reason: str(p.source) ?? 'startup', ...(transcript ? { transcript } : {}) }),
        ev({ type: 'agent.spawn', agent_id: MAIN_AGENT_ID, agent_type: 'director' }),
        status(MAIN_AGENT_ID, 'idle'),
      ];
    case 'SessionEnd':
      return [ev({ type: 'session.end', reason: truncate(str(p.reason) ?? 'other', 40) })];
    case 'UserPromptSubmit':
      return [status(MAIN_AGENT_ID, 'thinking')];
    case 'PreToolUse': {
      const input = (p.tool_input && typeof p.tool_input === 'object' ? p.tool_input : {}) as Payload;
      const d = describeTool(tool, input, root, opts);
      return [
        ev({
          type: 'tool.call',
          agent_id,
          name: truncate(tool, 120),
          ...(toolUseId ? { tool_use_id: toolUseId } : {}),
          ...(d.target ? { target: d.target } : {}),
          ...(d.dept ? { dept: d.dept } : {}),
        }),
        status(agent_id, statusForTool(tool), d.dept),
      ];
    }
    case 'PostToolUse':
    case 'PostToolUseFailure': {
      const ok = hook === 'PostToolUse';
      const dur = typeof p.duration_ms === 'number' && p.duration_ms >= 0 ? { duration_ms: p.duration_ms } : {};
      const out = [
        ev({ type: 'tool.result', agent_id, name: truncate(tool, 120), ok, ...(toolUseId ? { tool_use_id: toolUseId } : {}), ...dur }),
      ];
      if (!ok && p.is_interrupt !== true) out.push(status(agent_id, 'error'));
      else out.push(status(agent_id, 'thinking'));
      return out;
    }
    case 'PermissionRequest':
      return [
        status(agent_id, 'waiting_user'),
        ev({ type: 'notify', kind: 'permission_prompt', agent_id, message: 'permission: ' + truncate(tool, 60) }),
      ];
    case 'Notification': {
      const kind = str(p.notification_type) ?? 'notice';
      const message = str(p.message);
      const out = [ev({ type: 'notify', kind: truncate(kind, 60), agent_id, ...(message ? { message: truncate(maskSecrets(message), 200) } : {}) })];
      if (kind === 'permission_prompt' || kind === 'elicitation_dialog') out.unshift(status(agent_id, 'waiting_user'));
      else if (kind === 'idle_prompt') out.unshift(status(MAIN_AGENT_ID, 'idle'));
      return out;
    }
    case 'SubagentStart':
      return [
        ev({ type: 'agent.spawn', agent_id, agent_type: truncate(str(p.agent_type) ?? 'agent', 80) }),
        status(agent_id, 'thinking'),
      ];
    case 'SubagentStop': {
      const t = opts.includeTranscripts ? str(p.agent_transcript_path) : undefined;
      return [status(agent_id, 'done'), ev({ type: 'agent.end', agent_id, ok: true, ...(t ? { transcript: t } : {}) })];
    }
    case 'Stop':
      return [status(MAIN_AGENT_ID, 'idle')];
    case 'StopFailure':
      return [status(MAIN_AGENT_ID, 'error')];
    case 'TaskCreated':
    case 'TaskCompleted': {
      const task_id = str(p.task_id) ?? makeId();
      const subject = truncate(maskSecrets(str(p.task_subject) ?? 'task'), 120);
      return [ev({ type: hook === 'TaskCreated' ? 'task.created' : 'task.completed', task_id, subject, ...(p.agent_id ? { agent_id } : {}) })];
    }
    default:
      return [];
  }
}
