import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  classifyDept,
  displayCommand,
  globToRegExp,
  hookToEvents,
  maskSecrets,
  nameFor,
  OfficeEvent,
  parseJsonl,
  stripLocalFields,
  sumUsage,
  transcriptToEvents,
  validateEvents,
} from '@agent-office/protocol';

const fixture = (name: string) => fs.readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');
const hooks = (name: string) => parseJsonl(fixture(`hooks/${name}`));

describe('hook mapping on real payloads', () => {
  const payloads = hooks('real-session-subagent.jsonl');
  const events = payloads.flatMap((p) => hookToEvents(p, { now: 1000 }));

  it('every produced event passes the zod schema', () => {
    expect(events.length).toBeGreaterThan(10);
    for (const e of events) expect(OfficeEvent.safeParse(e).success, JSON.stringify(e)).toBe(true);
  });

  it('SessionStart creates the director', () => {
    const spawn = events.find((e) => e.type === 'agent.spawn' && e.agent_id === 'main');
    expect(spawn).toMatchObject({ agent_type: 'director' });
  });

  it('subagent tool calls are attributed to the subagent (agent_id present in PreToolUse)', () => {
    const sub = events.find((e) => e.type === 'agent.spawn' && e.agent_id !== 'main') as { agent_id: string };
    expect(sub.agent_id).toBe('aa113a5a56d802045');
    const calls = events.filter((e) => e.type === 'tool.call' && e.agent_id === sub.agent_id).map((e) => (e as { name: string }).name);
    expect(calls).toEqual(['Read', 'Bash']);
  });

  it('maps statuses by tool and failures to error', () => {
    const st = events.filter((e) => e.type === 'agent.status' && e.agent_id === 'aa113a5a56d802045').map((e) => (e as { status: string }).status);
    expect(st).toEqual(['thinking', 'reading', 'error', 'running', 'thinking', 'done']);
  });

  it('tasks become kanban events', () => {
    expect(events.filter((e) => e.type.startsWith('task.')).map((e) => e.type)).toEqual(['task.created', 'task.completed']);
  });

  it('permission request → waiting_user', () => {
    const ev = hooks('real-session-permission.jsonl').flatMap((p) => hookToEvents(p));
    expect(ev.some((e) => e.type === 'agent.status' && e.status === 'waiting_user')).toBe(true);
    expect(ev.some((e) => e.type === 'notify' && e.kind === 'permission_prompt')).toBe(true);
  });

  it('never throws on garbage', () => {
    for (const g of [null, 1, 'x', [], {}, { hook_event_name: 'PreToolUse' }, { hook_event_name: 'Nope', session_id: 's' }]) {
      expect(() => hookToEvents(g)).not.toThrow();
    }
    expect(hookToEvents({ hook_event_name: 'Nope', session_id: 's' })).toEqual([]);
  });

  it('project is the folder name plus a hash, not the full path', () => {
    const [e] = hookToEvents({ hook_event_name: 'Stop', session_id: 's', cwd: '/home/me/secret-client/app' });
    expect(e!.project!.name).toBe('app');
    expect(JSON.stringify(e)).not.toContain('secret-client');
  });
});

describe('privacy', () => {
  it('masks secrets', () => {
    expect(maskSecrets('curl -H "Authorization: Bearer abc.def" x')).not.toContain('abc.def');
    expect(maskSecrets('OPENAI_API_KEY=sk-123456789abcdef run')).not.toContain('sk-1234');
    expect(maskSecrets('ghp_abcdefghijklmnop1234')).toBe('***');
    expect(maskSecrets('https://user:pw@host/x')).toBe('https://***@host/x');
  });
  it('bash shows only the program by default', () => {
    expect(displayCommand('npm run test -- --token=xyz', {})).toBe('npm …');
    expect(displayCommand('npm run test -- --token=xyz', { showContent: true })).toBe('npm run test -- ***');
  });
  it('prompts and outputs never leave the mapper', () => {
    const ev = hookToEvents(
      { hook_event_name: 'UserPromptSubmit', session_id: 's', prompt: 'TOP SECRET PROMPT' },
      {},
    ).concat(hookToEvents({ hook_event_name: 'PostToolUse', session_id: 's', tool_name: 'Read', tool_response: 'FILE BODY' }));
    expect(JSON.stringify(ev)).not.toMatch(/TOP SECRET|FILE BODY/);
  });
  it('hidePaths keeps only the extension', () => {
    const [call] = hookToEvents({ hook_event_name: 'PreToolUse', session_id: 's', cwd: '/r', tool_name: 'Edit', tool_input: { file_path: '/r/src/billing/invoice.ts' } }, { hidePaths: true });
    expect((call as { target: string }).target).toBe('•••.ts');
  });
  it('strips local-only transcript paths', () => {
    const e = OfficeEvent.parse({ v: 1, id: 'a', ts: 1, source: 'local', session_id: 's', type: 'session.start', transcript: '/x.jsonl' });
    expect('transcript' in stripLocalFields(e)).toBe(false);
  });
});

describe('departments', () => {
  it('glob conversion', () => {
    expect(globToRegExp('**/*.{ts,tsx}').test('a/b/c.tsx')).toBe(true);
    expect(globToRegExp('**/*.{ts,tsx}').test('c.ts')).toBe(true);
    expect(globToRegExp('docs/**').test('docs/a/b.md')).toBe(true);
    expect(globToRegExp('*.md').test('a/b.md')).toBe(false);
  });
  it('classifies paths and commands', () => {
    expect(classifyDept({ tool: 'Edit', path: 'src/ui/Button.tsx' })).toBe('frontend');
    expect(classifyDept({ tool: 'Edit', path: 'src/api/users.go' })).toBe('backend');
    expect(classifyDept({ tool: 'Edit', path: 'src/api/users.test.ts' })).toBe('qa');
    expect(classifyDept({ tool: 'Read', path: 'README.md' })).toBe('docs');
    expect(classifyDept({ tool: 'Read', path: '.github/workflows/ci.yml' })).toBe('devops');
    expect(classifyDept({ tool: 'Edit', path: 'src/auth/session.ts' })).toBe('security');
    expect(classifyDept({ tool: 'Bash', command: 'npx vitest run' })).toBe('qa');
    expect(classifyDept({ tool: 'WebSearch' })).toBe('research');
  });
  it('custom rules win', () => {
    expect(classifyDept({ tool: 'Edit', path: 'lib/x.ts' }, [{ dept: 'frontend', glob: 'lib/**' }])).toBe('frontend');
  });
});

describe('schema validation', () => {
  it('drops invalid items, keeps valid ones', () => {
    const good = { v: 1, id: 'a', ts: 1, source: 'demo', session_id: 's', type: 'agent.status', agent_id: 'x', status: 'reading' };
    const r = validateEvents([good, { ...good, status: 'dancing' }, { nope: 1 }]);
    expect(r.ok).toHaveLength(1);
    expect(r.rejected).toBe(2);
  });
  it('rejects wrong schema version', () => {
    expect(validateEvents({ v: 2, id: 'a', ts: 1, source: 'demo', session_id: 's', type: 'session.end' }).ok).toHaveLength(0);
  });
});

describe('transcripts', () => {
  it('sums usage tolerantly', () => {
    const t = sumUsage(parseJsonl(fixture('transcripts/subagent.jsonl') + '\n{broken'));
    expect(t.output).toBeGreaterThan(0);
    expect(t.tokens).toBeGreaterThan(t.output);
  });
  it('rebuilds a replay with the subagent', () => {
    const ev = transcriptToEvents(fixture('transcripts/main-session.jsonl'), { subagents: [{ text: fixture('transcripts/subagent.jsonl') }] });
    for (const e of ev) expect(OfficeEvent.safeParse(e).success, JSON.stringify(e)).toBe(true);
    expect(ev.some((e) => e.type === 'agent.spawn' && e.agent_id === 'aa113a5a56d802045')).toBe(true);
    expect(ev.some((e) => e.type === 'tool.call' && e.agent_id === 'aa113a5a56d802045' && e.name === 'Read')).toBe(true);
    expect(ev.some((e) => e.type === 'agent.end' && e.agent_id === 'aa113a5a56d802045')).toBe(true);
    expect(ev.every((e) => e.source === 'replay')).toBe(true);
  });
  it('empty or garbage transcripts yield nothing', () => {
    expect(transcriptToEvents('')).toEqual([]);
    expect(transcriptToEvents('not json\n{"x":1}')).toEqual([]);
  });
});

describe('names', () => {
  it('is deterministic', () => {
    expect(nameFor('aa113a5a56d802045')).toBe(nameFor('aa113a5a56d802045'));
    expect(nameFor('a', 'en')).not.toBe(nameFor('b', 'en'));
  });
});
