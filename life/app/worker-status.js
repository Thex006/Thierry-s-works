// Shared by server.js (desktop app) and life/mobile/publish.js (phone snapshot).
const fs = require('fs');
const path = require('path');
const STOP = path.join(__dirname, '..', 'STOP');
// The worker's real status, from its files (not state.json): paused, sleeping, working or idle, plus the log's last line.
const PRIV = path.join(__dirname, '..', 'private');
const lastLogLine = () => {
  try {
    const f = path.join(PRIV, 'worker.log'), size = fs.statSync(f).size, len = Math.min(size, 8192), buf = Buffer.alloc(len);
    const fd = fs.openSync(f, 'r'); fs.readSync(fd, buf, 0, len, size - len); fs.closeSync(fd);
    return buf.toString('utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop() || '';
  } catch { return ''; }
};
const workerStatus = (now = Date.now()) => {
  const w = { log: lastLogLine() };
  if (fs.existsSync(STOP)) return { ...w, state: 'paused' };
  try {
    const until = Date.parse(fs.readFileSync(path.join(PRIV, 'sleep-until.txt'), 'utf8').trim());
    if (until > now) return { ...w, state: 'sleeping', until: new Date(until).toISOString() };
  } catch {}
  try {
    const l = JSON.parse(fs.readFileSync(path.join(PRIV, 'worker.lock'), 'utf8').replace(/^﻿/, ''));
    const hb = Date.parse(l.heartbeat);
    if (now - hb < 15 * 60 * 1000) return { ...w, state: 'working', since: l.started, heartbeat: l.heartbeat, heartbeatAgo: Math.round((now - hb) / 1000) };
  } catch {}
  return { ...w, state: 'idle' };
};
module.exports = { workerStatus };
