/**
 * Demo mode: plausible activity without Claude Code. Synthetic hook payloads go through the
 * same `hookToEvents` mapping as real hooks, so the office can't tell the difference.
 */
import { hookToEvents, projectFromDir, validateEvents, type OfficeEvent, type SourceName } from '@agent-office/protocol';

type Emit = (events: OfficeEvent[]) => void;

/** Mulberry32: small seeded PRNG so demos are reproducible. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ProjectDef {
  dir: string;
  files: string[];
  commands: string[];
  source: SourceName;
}

const PROJECTS: ProjectDef[] = [
  {
    dir: '/demo/atlas-web',
    source: 'demo',
    files: ['src/components/Header.tsx', 'src/components/PriceCard.tsx', 'src/pages/checkout.tsx', 'src/styles/theme.css', 'src/hooks/useCart.ts', 'src/api/client.ts', 'src/components/PriceCard.test.tsx', 'README.md', 'docs/design-tokens.md', 'src/auth/session.ts', 'vite.config.ts', 'public/index.html'],
    commands: ['npm run build', 'npx vitest run', 'npx playwright test', 'git status', 'npm run lint'],
  },
  {
    dir: '/demo/billing-api',
    source: 'demo',
    files: ['server/routes/invoices.go', 'server/db/migrations/0042_tax.sql', 'server/payments/stripe_adapter.go', 'api/openapi.yaml', 'server/routes/invoices_test.go', 'docs/runbook.md', 'server/auth/jwt.go', 'Dockerfile', '.github/workflows/ci.yml'],
    commands: ['go test ./...', 'go build ./...', 'docker compose up -d db', 'make migrate', 'git diff --stat'],
  },
  {
    dir: '/demo/cloud-pipeline',
    source: 'cloud',
    files: ['pipelines/ingest.py', 'pipelines/transform.py', 'tests/test_transform.py', 'infra/main.tf', 'k8s/worker.yaml', 'docs/data-contract.md'],
    commands: ['pytest -q', 'terraform plan', 'kubectl get pods', 'python -m pipelines.ingest --dry-run'],
  },
];

const TYPES = ['Explore', 'general-purpose', 'Plan', 'code-reviewer', 'test-runner', 'docs-writer', 'security-auditor', 'frontend-dev'];

interface Plan {
  tool: string;
  input: Record<string, unknown>;
  ms: number;
  fail?: boolean;
  ask?: boolean;
}

export interface DemoOptions {
  seed?: number;
  /** Target number of concurrently active subagents across all sessions. */
  agents?: number;
  /** Multiplier on all delays (<1 = faster). */
  pace?: number;
}

export class DemoGenerator {
  private timers = new Set<NodeJS.Timeout>();
  private r: () => number;
  private active = 0;
  private sessions: { id: string; project: ProjectDef; agents: number }[] = [];
  private stopped = false;
  private taskSeq = 1;
  private agentSeq = 1;

  constructor(
    private readonly emit: Emit,
    private readonly opts: DemoOptions = {},
  ) {
    this.r = rng(opts.seed ?? 20261030);
  }

  private pick<T>(xs: T[]): T {
    return xs[Math.floor(this.r() * xs.length)]!;
  }

  private later(ms: number, fn: () => void) {
    if (this.stopped) return;
    const t = setTimeout(() => {
      this.timers.delete(t);
      if (!this.stopped) fn();
    }, ms * (this.opts.pace ?? 1));
    t.unref?.();
    this.timers.add(t);
  }

  private hook(session: { id: string; project: ProjectDef }, payload: Record<string, unknown>) {
    const raw = hookToEvents({ session_id: session.id, cwd: session.project.dir, ...payload }, { source: session.project.source, projectDir: session.project.dir, showContent: true });
    this.emit(validateEvents(raw).ok);
  }

  start(): void {
    const target = this.opts.agents ?? 9;
    // Two sessions on the web project (two floors), one each for the API and the cloud pipeline.
    const plan: [ProjectDef, number][] = [
      [PROJECTS[0]!, 0],
      [PROJECTS[1]!, 150],
      [PROJECTS[0]!, 300],
      [PROJECTS[2]!, 450],
    ];
    for (const [p, delay] of plan) this.later(delay, () => this.openSession(p));
    const tick = () => {
      if (this.active < target && this.sessions.length) {
        const s = this.pick(this.sessions);
        this.spawn(s, 'main', 0);
      }
      this.later(600 + this.r() * 1400, tick);
    };
    this.later(500, tick);
    // Sessions come and go now and then, so floors open and close.
    const churn = () => {
      if (this.sessions.length > 3 && this.r() < 0.5) {
        const s = this.sessions.find((x) => x.agents === 0);
        if (s) {
          this.hook(s, { hook_event_name: 'Stop' });
          this.hook(s, { hook_event_name: 'SessionEnd', reason: 'other' });
          this.sessions = this.sessions.filter((x) => x !== s);
        }
      } else if (this.sessions.length < 5) this.openSession(this.pick(PROJECTS));
      this.later(45_000 + this.r() * 60_000, churn);
    };
    this.later(40_000, churn);
  }

  stop(): void {
    this.stopped = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  private openSession(project: ProjectDef) {
    const id = 'demo-' + Math.floor(this.r() * 1e9).toString(36) + '-' + this.sessions.length;
    const s = { id, project, agents: 0 };
    this.sessions.push(s);
    this.hook(s, { hook_event_name: 'SessionStart', source: 'startup' });
    this.later(200, () => this.hook(s, { hook_event_name: 'UserPromptSubmit', prompt: '(demo)' }));
    const subject = this.pick(['Fix flaky checkout test', 'Add tax line to invoices', 'Document deploy runbook', 'Refactor auth middleware', 'Speed up CI cache', 'Audit dependencies', 'Polish price cards']);
    const taskId = String(this.taskSeq++);
    this.later(600, () => this.hook(s, { hook_event_name: 'TaskCreated', task_id: taskId, task_subject: subject }));
    this.later(60_000 + this.r() * 90_000, () => this.hook(s, { hook_event_name: 'TaskCompleted', task_id: taskId, task_subject: subject }));
  }

  private spawn(s: { id: string; project: ProjectDef; agents: number }, parent: string, depth: number) {
    const agent_id = 'a' + (this.agentSeq++).toString(16).padStart(4, '0') + Math.floor(this.r() * 0xffffff).toString(16);
    const type = this.pick(TYPES);
    this.active++;
    s.agents++;
    const desc = this.pick(['Find usages of price formatter', 'Review the checkout diff', 'Run the test suite', 'Write migration notes', 'Investigate 500s on /invoices', 'Check auth token expiry']);
    if (parent === 'main') this.hook(s, { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_input: { subagent_type: type, description: desc }, tool_use_id: 'tu-' + agent_id });
    else this.hook(s, { hook_event_name: 'PreToolUse', agent_id: parent, tool_name: 'Agent', tool_input: { subagent_type: type, description: desc }, tool_use_id: 'tu-' + agent_id });
    this.later(250, () => this.hook(s, { hook_event_name: 'SubagentStart', agent_id, agent_type: type }));
    const steps = this.planFor(type, s.project);
    let t = 900;
    steps.forEach((st, i) => {
      const id = `${agent_id}-${i}`;
      this.later(t, () => this.hook(s, { hook_event_name: 'PreToolUse', agent_id, agent_type: type, tool_name: st.tool, tool_input: st.input, tool_use_id: id }));
      if (st.ask) {
        this.later(t + 300, () => this.hook(s, { hook_event_name: 'PermissionRequest', agent_id, agent_type: type, tool_name: st.tool, tool_input: st.input }));
        t += 6000 + this.r() * 6000;
      }
      t += st.ms;
      this.later(t, () =>
        this.hook(s, { hook_event_name: st.fail ? 'PostToolUseFailure' : 'PostToolUse', agent_id, agent_type: type, tool_name: st.tool, tool_use_id: id, duration_ms: st.ms, is_interrupt: false }),
      );
      t += st.fail ? 2500 : 500 + this.r() * 1200;
    });
    // Occasionally a subagent delegates to a helper of its own (a chain).
    if (depth === 0 && this.r() < 0.22) this.later(t / 2, () => this.spawn(s, agent_id, depth + 1));
    this.later(t + 600, () => {
      this.hook(s, { hook_event_name: 'SubagentStop', agent_id, agent_type: type });
      this.hook(s, { hook_event_name: 'PostToolUse', ...(parent === 'main' ? {} : { agent_id: parent }), tool_name: 'Agent', tool_use_id: 'tu-' + agent_id, duration_ms: t });
      const tokens = Math.floor(4000 + this.r() * 40000);
      this.emit(
        validateEvents([{ v: 1, id: 'tok-' + agent_id, ts: Date.now(), source: s.project.source, session_id: s.id, project: projectFromDir(s.project.dir)!, type: 'cost.tick', agent_id, tokens, usd: tokens * 0.000006, mode: 'absolute' }]).ok,
      );
      this.active--;
      s.agents--;
      if (s.agents === 0) this.later(400, () => this.hook(s, { hook_event_name: 'Stop' }));
    });
  }

  private planFor(type: string, p: ProjectDef): Plan[] {
    const f = () => p.dir + '/' + this.pick(p.files);
    const n = 3 + Math.floor(this.r() * 6);
    const out: Plan[] = [];
    for (let i = 0; i < n; i++) {
      const roll = this.r();
      let step: Plan;
      if (type === 'Explore' || type === 'Plan') step = roll < 0.5 ? { tool: 'Read', input: { file_path: f() }, ms: 900 } : roll < 0.8 ? { tool: 'Grep', input: { pattern: 'formatPrice', path: p.dir + '/src' }, ms: 700 } : { tool: 'WebSearch', input: { query: 'best practice' }, ms: 3500 };
      else if (type === 'test-runner') step = roll < 0.6 ? { tool: 'Bash', input: { command: this.pick(p.commands.filter((c) => /test|pytest/.test(c))) ?? 'npm test' }, ms: 5000 + this.r() * 7000, fail: this.r() < 0.3 } : { tool: 'Read', input: { file_path: f() }, ms: 800 };
      else if (type === 'docs-writer') step = roll < 0.5 ? { tool: 'Write', input: { file_path: p.dir + '/docs/notes.md' }, ms: 2500 } : { tool: 'Read', input: { file_path: f() }, ms: 900 };
      else if (type === 'security-auditor') step = roll < 0.6 ? { tool: 'Grep', input: { pattern: 'secret', path: p.dir + '/src/auth' }, ms: 1200 } : { tool: 'WebFetch', input: { url: 'https://nvd.nist.gov/' }, ms: 3000 };
      else
        step =
          roll < 0.35 ? { tool: 'Edit', input: { file_path: f() }, ms: 1800 + this.r() * 2000 }
          : roll < 0.6 ? { tool: 'Read', input: { file_path: f() }, ms: 900 }
          : roll < 0.85 ? { tool: 'Bash', input: { command: this.pick(p.commands) }, ms: 3000 + this.r() * 6000, fail: this.r() < 0.18 }
          : { tool: 'WebSearch', input: { query: 'docs' }, ms: 3000 };
      if (step.tool === 'Bash' && this.r() < 0.12) step.ask = true;
      out.push(step);
    }
    return out;
  }
}
