// Turns raw hook-logger output into committed fixtures: keeps structure and metadata,
// redacts prompts, responses, assistant text and file contents.
import fs from 'node:fs';
import path from 'node:path';

const [, , input, outDir, prefix = 'probe'] = process.argv;
const REDACT_KEYS = new Set(['prompt', 'tool_response', 'last_assistant_message', 'task_description', 'content', 'new_string', 'old_string']);
const redact = (v) => (typeof v === 'string' ? `[redacted:${v.length}]` : '[redacted]');
function clean(o, depth = 0) {
  if (Array.isArray(o)) return o.map((x) => clean(x, depth + 1));
  if (o && typeof o === 'object') {
    const r = {};
    for (const [k, v] of Object.entries(o)) r[k] = REDACT_KEYS.has(k) ? redact(v) : clean(v, depth + 1);
    return r;
  }
  return o;
}
fs.mkdirSync(outDir, { recursive: true });
const lines = fs.readFileSync(input, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const all = lines.map((l) => clean(l.payload));
fs.writeFileSync(path.join(outDir, `${prefix}.jsonl`), all.map((x) => JSON.stringify(x)).join('\n') + '\n');
console.log(`wrote ${all.length} payloads`);
