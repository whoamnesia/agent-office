// Records SSE events from the daemon with receive latency (receivedAt - event.ts). Usage: node tools/sse-record.mjs <dataDir> <outFile> [seconds]
import fs from 'node:fs';
import http from 'node:http';
const [, , dir, out, secs = '120'] = process.argv;
const info = JSON.parse(fs.readFileSync(dir + '/daemon.json', 'utf8'));
const w = fs.createWriteStream(out);
http.get({ host: '127.0.0.1', port: info.port, path: '/stream?t=' + info.token }, (res) => {
  let buf = '';
  res.setEncoding('utf8');
  res.on('data', (c) => {
    buf += c;
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const name = /event: (\S+)/.exec(block)?.[1];
      const data = block.split('\n').filter((l) => l.startsWith('data: ')).map((l) => l.slice(6)).join('');
      if (name === 'events') for (const e of JSON.parse(data)) w.write(JSON.stringify({ rx: Date.now(), lat: Date.now() - e.ts, type: e.type, agent: e.agent_id, status: e.status, name: e.name, target: e.target, session: e.session_id }) + '\n');
    }
  });
});
setTimeout(() => process.exit(0), Number(secs) * 1000);
