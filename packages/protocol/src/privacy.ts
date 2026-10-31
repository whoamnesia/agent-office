/** Privacy helpers. Default policy: only metadata (tool name, project-relative path, status). */

export interface PrivacyOptions {
  /** Include short command lines / queries / task descriptions. Off by default. */
  showContent?: boolean;
  /** Replace file paths with their extension only. */
  hidePaths?: boolean;
}

const SECRET_PATTERNS: RegExp[] = [
  /--?(?:password|passwd|token|secret|api-key|apikey|key|auth)[= ]\S+/gi,
  /\bauthorization\s*[:=]\s*(?:(?:bearer|basic|token)\s+)?[^\s"']+/gi,
  /\b(?:bearer|token)\s+[^\s"']+/gi,
  /\b(sk|pk|rk|ghp|gho|ghs|github_pat|xox[abpr]|AKIA|AIza)[-_A-Za-z0-9]{8,}/g,
  /\b([A-Za-z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|PWD|CREDENTIALS?)[A-Za-z0-9_]*)\s*[=:]\s*\S+/gi,
  /\b[A-Za-z0-9+/_-]{40,}={0,2}/g,
  /:\/\/[^/\s:@]+:[^/\s@]+@/g,
];

/** Masks anything that looks like a credential. Applied to every string that may be displayed or logged. */
export function maskSecrets(s: string): string {
  let out = s;
  for (const re of SECRET_PATTERNS) out = out.replace(re, (m) => (m.startsWith('://') ? '://***@' : '***'));
  return out;
}

export function truncate(s: string, max: number): string {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > max ? one.slice(0, max - 1) + '…' : one;
}

/** Makes `p` relative to `root` when it lives inside it; otherwise keeps only the last two segments. */
export function relativePath(p: string, root?: string): string {
  const norm = p.replace(/\\/g, '/');
  if (root) {
    const r = root.replace(/\\/g, '/').replace(/\/+$/, '');
    if (norm === r) return '.';
    if (norm.startsWith(r + '/')) return norm.slice(r.length + 1);
  }
  const parts = norm.split('/').filter(Boolean);
  return (parts.length > 2 ? '…/' : '') + parts.slice(-2).join('/');
}

export function displayPath(p: string, root: string | undefined, opts: PrivacyOptions): string {
  const rel = relativePath(p, root);
  if (opts.hidePaths) {
    const base = rel.split('/').pop() ?? '';
    const dot = base.lastIndexOf('.');
    return dot > 0 ? '•••' + base.slice(dot) : '•••';
  }
  return truncate(maskSecrets(rel), 160);
}

/** For Bash: by default only the program name ("npm …"); with showContent a masked, truncated command line. */
export function displayCommand(cmd: string, opts: PrivacyOptions): string {
  const masked = maskSecrets(cmd);
  if (opts.showContent) return truncate(masked, 120);
  const first = masked.trim().split(/\s+/)[0] ?? '';
  const prog = first.split('/').pop() ?? first;
  return prog ? prog + ' …' : '…';
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}
