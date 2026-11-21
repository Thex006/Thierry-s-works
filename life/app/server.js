// Claude Life local server. No dependencies: run `node life/app/server.js`.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, 'public');
const STATE = path.join(__dirname, '..', 'state.json');
const PORT = Number(process.env.PORT) || 4747;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

const readState = () => JSON.parse(fs.readFileSync(STATE, 'utf8'));
const writeState = (s) => {
  const tmp = STATE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2) + '\n');
  fs.renameSync(tmp, STATE);
};
const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/state' && req.method === 'GET') {
    try { return send(res, 200, readState()); } catch (e) { return send(res, 500, { error: e.message }); }
  }

  // Operator decision on a review item: { id, decision: approved|changes|rejected, note }
  if (url.pathname === '/api/review' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', () => {
      try {
        const { id, decision, note } = JSON.parse(body || '{}');
        if (!['approved', 'changes', 'rejected'].includes(decision)) return send(res, 400, { error: 'bad decision' });
        const s = readState();
        const item = (s.review || []).find((r) => r.id === id);
        if (!item) return send(res, 404, { error: 'not found' });
        item.status = decision;
        item.note = String(note || '').slice(0, 2000);
        item.decidedAt = new Date().toISOString();
        const verb = { approved: 'approved', changes: 'asked for changes on', rejected: 'rejected' }[decision];
        s.log = [{ t: item.decidedAt, text: `Operator ${verb} "${item.title}"${item.note ? `: ${item.note}` : ''}` }, ...(s.log || [])];
        writeState(s);
        send(res, 200, s);
      } catch (e) { send(res, 400, { error: e.message }); }
    });
    return;
  }

  let file = path.normalize(path.join(PUB, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUB)) return send(res, 403, 'forbidden', 'text/plain');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'not found', 'text/plain');
    send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream');
  });
}).listen(PORT, '127.0.0.1', () => console.log(`Claude Life running at http://localhost:${PORT}`));
