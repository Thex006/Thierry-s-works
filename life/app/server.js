// Claude Life local server. No dependencies: run `node life/app/server.js`.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');

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
// Build id = newest modification time of the page files. The page reloads itself when it changes.
const buildId = () => {
  let m = 0;
  for (const f of fs.readdirSync(PUB)) { try { m = Math.max(m, fs.statSync(path.join(PUB, f)).mtimeMs); } catch {} }
  return String(Math.floor(m));
};
const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Build': buildId() });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

const server = http.createServer((req, res) => {
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
});

// Start, retrying while an older copy of the server is still shutting down.
let tries = 0;
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && tries++ < 40) return setTimeout(() => server.listen(PORT, '127.0.0.1'), 300);
  console.error(e.message); process.exit(1);
});
server.listen(PORT, '127.0.0.1', () => console.log(`Claude Life running at http://localhost:${PORT}`));

// Auto-update: pull new versions from GitHub every 5 minutes. Page files reload in the browser by
// themselves; if this server file changed, start a fresh copy of the server and exit.
// Only fast-forward pulls, so local work is never overwritten. Disable with CLAUDE_LIFE_NO_UPDATE=1.
const REPO = path.join(__dirname, '..', '..');
const SELF = __filename, bootMtime = fs.statSync(SELF).mtimeMs;
function update() {
  execFile('git', ['pull', '--ff-only', '--quiet'], { cwd: REPO, timeout: 60000, windowsHide: true }, (err, out, errOut) => {
    if (err) return console.log(`[update] skipped: ${(errOut || err.message).trim().split('\n')[0]}`);
    let changed = false; try { changed = fs.statSync(SELF).mtimeMs !== bootMtime; } catch {}
    if (!changed) return;
    console.log('[update] server changed, restarting');
    spawn(process.execPath, [SELF], { cwd: process.cwd(), detached: true, stdio: 'ignore', windowsHide: true }).unref();
    server.close(); setTimeout(() => process.exit(0), 200);
  });
}
if (!process.env.CLAUDE_LIFE_NO_UPDATE) { setTimeout(update, 3000); setInterval(update, 5 * 60 * 1000); }
