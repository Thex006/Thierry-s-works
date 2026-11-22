// Phone app publisher. manager.ps1 runs it every minute: `node life/mobile/publish.js` (`--test` runs a self-check).
// 1) Builds a status snapshot from a whitelist of state.json / inbox.json fields (never life/private or ACCOUNTS/identity).
// 2) Encrypts it (AES-256-GCM, key from a passphrase in life/private/mobile-key.txt), because the repo is public.
// 3) Pushes it to the `mobile-data` branch, and the phone app files (life/mobile/app) to the `mobile` branch (GitHub Pages).
// Uses git plumbing only: no checkout, no index, so it never touches the worker's working tree.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { workerStatus } = require('../app/worker-status');

const LIFE = path.join(__dirname, '..');
const REPO = path.join(LIFE, '..');
const PRIV = path.join(LIFE, 'private');
const KEYF = path.join(PRIV, 'mobile-key.txt');
const MEMO = path.join(PRIV, 'mobile-publish.json'); // what was pushed last, so unchanged data isn't pushed again
const APP = path.join(__dirname, 'app');
const ITER = 200000;

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')); } catch { return d; } };
const cut = (s, n) => (s == null ? '' : String(s).slice(0, n));
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o?.[k] !== undefined).map((k) => [k, o[k]]));

function snapshot() {
  const s = readJson(path.join(LIFE, 'state.json'), {});
  const inbox = readJson(path.join(LIFE, 'inbox.json'), []);
  const w = workerStatus();
  return {
    v: 1,
    ...pick(s, ['name', 'day', 'balance', 'lives', 'energy', 'stats', 'usage']),
    activity: pick(s.activity, ['type', 'bet', 'label', 'since']),
    worker: { ...pick(w, ['state', 'since', 'heartbeat', 'until']), log: cut(w.log, 200) },
    bets: (s.bets || []).map((b) => pick(b, ['name', 'status', 'note', 'metrics', 'earned'])),
    doing: (s.doing || []).map((d) => pick(d, ['bet', 'task', 'status'])),
    needs: (s.needs || []).map((n) => (typeof n === 'string' ? { text: cut(n, 500) } : { t: n.t, text: cut(n.text, 500) })),
    review: (s.review || []).map((r) => ({ ...pick(r, ['id', 't', 'type', 'kind', 'target', 'title', 'status', 'decidedAt', 'checks', 'skills']), text: cut(r.text, 600), details: cut(r.details, 3000), email: cut(r.email, 3000), note: cut(r.note, 300) })),
    log: (s.log || []).slice(0, 20).map((l) => ({ t: l.t, text: cut(l.text, 300) })),
    transactions: (s.transactions || []).slice(-10),
    agents: (s.agents || []).map((a) => pick(a, ['name', 'role', 'color', 'hair', 'skin', 'status'])),
    inbox: inbox.slice(-15).map((m) => ({ ...pick(m, ['id', 't', 'from', 'status']), text: cut(m.text, 1500), reply: cut(m.reply, 3000), team: (m.team || []).map((x) => ({ who: cut(x.who, 40), text: cut(x.text, 300) })) })),  };
}

// Output: { v, salt, iv, data } base64. data = ciphertext + 16-byte GCM tag (the layout Web Crypto expects).
function encrypt(obj, pass, salt = crypto.randomBytes(16)) {
  const key = crypto.pbkdf2Sync(pass, salt, ITER, 32, 'sha256'), iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final(), c.getAuthTag()]);
  return { v: 1, iter: ITER, salt: salt.toString('base64'), iv: iv.toString('base64'), data: data.toString('base64') };
}
function decrypt(box, pass) {
  const key = crypto.pbkdf2Sync(pass, Buffer.from(box.salt, 'base64'), box.iter, 32, 'sha256');
  const raw = Buffer.from(box.data, 'base64'), d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  d.setAuthTag(raw.subarray(-16));
  return JSON.parse(Buffer.concat([d.update(raw.subarray(0, -16)), d.final()]).toString('utf8'));
}

function passphrase() {
  try { const p = fs.readFileSync(KEYF, 'utf8').trim(); if (p) return p; } catch {}
  const p = crypto.randomBytes(15).toString('base64url'); // 20 chars, 120 bits
  fs.mkdirSync(PRIV, { recursive: true });
  fs.writeFileSync(KEYF, p + '\n');
  return p;
}

const git = (args, input) => execFileSync('git', args, { cwd: REPO, input, encoding: 'utf8', windowsHide: true, timeout: 60000, stdio: 'pipe' }).trim();
const blob = (buf) => git(['hash-object', '-w', '--stdin'], buf);
const treeOf = (files) => git(['mktree'], files.map(([name, sha, type = 'blob']) => `${type === 'tree' ? '040000' : '100644'} ${type} ${sha}\t${name}\n`).join(''));
// A folder as a git tree.
const dirTree = (dir) => treeOf(fs.readdirSync(dir).sort().map((n) => {
  const f = path.join(dir, n);
  return fs.statSync(f).isDirectory() ? [n, dirTree(f), 'tree'] : [n, blob(fs.readFileSync(f))];
}));
// Phone app = the desktop game (life/app/public) + the phone files (life/mobile/app), with the phone shim injected.
function appTree() {
  const PUB = path.join(LIFE, 'app', 'public');
  const html = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8')
    .replace('href="manifest.json"', 'href="manifest.webmanifest"')
    .replace('<link rel="stylesheet" href="style.css">', '<link rel="stylesheet" href="style.css">\n<link rel="stylesheet" href="phone.css">\n<link rel="apple-touch-icon" href="icon-192.png">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="robots" content="noindex">')
    .replace('<script src="game.js">', '<script src="phone.js"></script>\n<script src="game.js">');
  if (!html.includes('phone.js') || !html.includes('phone.css')) throw new Error('could not inject the phone shim into index.html');
  const items = new Map();
  for (const n of fs.readdirSync(PUB)) if (n !== 'manifest.json') items.set(n, path.join(PUB, n));
  for (const n of fs.readdirSync(APP)) items.set(n, path.join(APP, n));
  return treeOf([...items].sort(([a], [b]) => (a < b ? -1 : 1)).map(([n, f]) =>
    n === 'index.html' ? [n, blob(html)] : fs.statSync(f).isDirectory() ? [n, dirTree(f), 'tree'] : [n, blob(fs.readFileSync(f))]));
}
// Orphan commit, force-pushed: each branch holds one commit, so the repo doesn't grow with every update.
const push = (tree, branch, msg) => {
  const commit = git(['commit-tree', tree, '-m', msg]);
  git(['push', '--quiet', '--force', 'origin', `${commit}:refs/heads/${branch}`]);
};

function publish() {
  if (fs.existsSync(path.join(LIFE, 'STOP'))) return 'stopped';
  const memo = readJson(MEMO, {}), now = Date.now(), done = [];

  const tree = appTree();
  if (tree !== memo.appTree) { push(tree, 'mobile', 'Phone app'); memo.appTree = tree; done.push('app'); }

  const snap = snapshot(), hash = crypto.createHash('sha256').update(JSON.stringify(snap)).digest('hex');
  const age = now - (memo.dataAt || 0);
  // Push when something changed (at most once a minute), and every 10 min anyway so the phone can tell the PC is on.
  if ((hash !== memo.dataHash && age > 55000) || age > 10 * 60000) {
    const box = { ...encrypt(snap, passphrase()), pushed: new Date(now).toISOString() };
    push(treeOf([['status.json', blob(JSON.stringify(box))]]), 'mobile-data', 'Phone status');
    Object.assign(memo, { dataHash: hash, dataAt: now }); done.push('data');
  }
  fs.writeFileSync(MEMO, JSON.stringify(memo, null, 2) + '\n');
  return done.join('+') || 'unchanged';
}

module.exports = { snapshot, encrypt, appTree };
if (process.argv.includes('--test')) {
  const assert = require('assert');
  const snap = snapshot(), box = encrypt(snap, 'test-pass');
  assert.deepStrictEqual(decrypt(box, 'test-pass'), snap);
  assert.throws(() => decrypt(box, 'wrong'));
  const text = JSON.stringify(snap);
  for (const bad of ['identity', 'password', 'iban', 'birth']) assert(!text.toLowerCase().includes(bad + '":'), 'leaked field ' + bad);
  console.log('publish self-test passed (' + text.length + ' bytes)');
} else if (require.main === module) {
  try { console.log('mobile: ' + publish()); } catch (e) { console.log('mobile: failed ' + String(e.message).split('\n')[0]); process.exitCode = 1; }
}
