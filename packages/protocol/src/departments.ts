import type { DepartmentName } from './constants.js';

/** One classification rule. `glob` matches project-relative paths; `command` matches the Bash program/line. */
export interface DeptRule {
  dept: DepartmentName;
  glob?: string;
  command?: string;
  tool?: string;
}

const cache = new Map<string, RegExp>();

/** Minimal glob → RegExp: `**`, `*`, `?`, `{a,b}`. Matching is case-insensitive. */
export function globToRegExp(glob: string): RegExp {
  const hit = cache.get(glob);
  if (hit) return hit;
  let re = '';
  let inBraces = false;
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // "**/" matches zero or more directories
        if (glob[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 2;
        } else {
          re += '.*';
          i += 1;
        }
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '{') {
      inBraces = true;
      re += '(?:';
    } else if (c === '}' && inBraces) {
      inBraces = false;
      re += ')';
    } else if (c === ',' && inBraces) re += '|';
    else if ('.+^$()|[]\\'.includes(c)) re += '\\' + c;
    else re += c;
  }
  const out = new RegExp('^' + re + '$', 'i');
  cache.set(glob, out);
  return out;
}

export const DEFAULT_DEPT_RULES: DeptRule[] = [
  { dept: 'security', glob: '**/{.env*,*secret*,*auth*,*crypt*,*permission*,security/**,auth/**,secrets/**,crypto/**}' },
  { dept: 'qa', glob: '**/{*.test.*,*.spec.*,test/**,tests/**,__tests__/**,e2e/**,*_test.go,test_*.py}' },
  { dept: 'qa', command: '\\b(vitest|jest|pytest|playwright|mocha|go test|cargo test|npm (run )?test|pnpm test|yarn test)\\b' },
  { dept: 'devops', glob: '**/{Dockerfile,docker-compose*,*.tf,*.yml,*.yaml,.github/**,k8s/**,helm/**,Makefile,*.sh,wrangler.toml}' },
  { dept: 'devops', command: '\\b(docker|kubectl|terraform|helm|ssh|systemctl|wrangler|gh|git push|npm (i|install|ci)|apt|brew)\\b' },
  { dept: 'docs', glob: '**/{*.md,*.mdx,*.rst,*.txt,docs/**,LICENSE*}' },
  { dept: 'frontend', glob: '**/{*.tsx,*.jsx,*.vue,*.svelte,*.css,*.scss,*.sass,*.less,*.html,components/**,web/**,ui/**,pages/**,app/**,public/**}' },
  { dept: 'backend', glob: '**/{*.go,*.rs,*.py,*.java,*.kt,*.rb,*.php,*.sql,*.cs,server/**,api/**,db/**,daemon/**,migrations/**}' },
  { dept: 'research', tool: 'WebSearch' },
  { dept: 'research', tool: 'WebFetch' },
  { dept: 'backend', glob: '**/*.{ts,js,mjs,cjs,json}' },
];

export interface ClassifyInput {
  tool: string;
  path?: string | undefined;
  command?: string | undefined;
}

export function classifyDept(input: ClassifyInput, rules: DeptRule[] = DEFAULT_DEPT_RULES): DepartmentName | undefined {
  for (const r of rules) {
    if (r.tool && r.tool === input.tool) return r.dept;
    if (r.glob && input.path && globToRegExp(r.glob).test(input.path)) return r.dept;
    if (r.command && input.command) {
      try {
        if (new RegExp(r.command, 'i').test(input.command)) return r.dept;
      } catch {
        // user-supplied pattern may be invalid; skip it
      }
    }
  }
  return undefined;
}
