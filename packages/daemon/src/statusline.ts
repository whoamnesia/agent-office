/**
 * Optional status line (user settings → "statusLine": {"type":"command","command":"node <plugin>/bin/ao-statusline"}).
 * Prints a short line for the terminal and forwards the session cost to the office (cost.tick).
 */
import fs from 'node:fs';
import http from 'node:http';
import { files, type DaemonInfo } from './paths.js';
import { projectFromDir } from '@agent-office/protocol/mapping';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  let s: { session_id?: string; cwd?: string; workspace?: { project_dir?: string }; cost?: { total_cost_usd?: number }; model?: { display_name?: string } } = {};
  try {
    s = JSON.parse(input);
  } catch {
    /* print the fallback line */
  }
  const usd = s.cost?.total_cost_usd;
  process.stdout.write(`Agent Office${usd !== undefined ? ` · $${usd.toFixed(2)}` : ''}${s.model?.display_name ? ` · ${s.model.display_name}` : ''}\n`);
  let info: DaemonInfo | undefined;
  try {
    info = JSON.parse(fs.readFileSync(files().daemon, 'utf8'));
  } catch {
    return;
  }
  if (!info || !s.session_id || usd === undefined) return;
  const project = projectFromDir(s.workspace?.project_dir ?? s.cwd);
  const body = JSON.stringify({ v: 1, id: `sl-${s.session_id}-${Math.round(usd * 1e4)}`, ts: Date.now(), source: 'local', session_id: s.session_id, ...(project ? { project } : {}), type: 'cost.tick', agent_id: 'main', tokens: 0, usd, mode: 'absolute' });
  const req = http.request({ host: '127.0.0.1', port: info.port, path: '/events', method: 'POST', timeout: 300, headers: { 'content-type': 'application/json', 'x-ao-token': info.token } }, (r) => r.resume());
  req.on('error', () => undefined);
  req.on('timeout', () => req.destroy());
  req.end(body);
});
