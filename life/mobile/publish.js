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
    review: (s.review || []).map((r) => ({ ...pick(r, ['id', 't', 'type', 'title', 'status', 'decidedAt']), text: cut(r.text, 600), note: cut(r.note, 300) })),
    log: (s.log || []).slice(0, 20).map((l) => ({ t: l.t, text: cut(l.text, 300) })),
    transactions: (s.transactions || []).slice(-10),
    chat: inbox.slice(-10).map((m) => ({ t: m.t, text: cut(m.text, 600), reply: cut(m.reply, 1200), status: m.status })),
  };
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
const treeOf = (files) => git(['mktree'], files.map(([name, sha]) => `100644 blob ${sha}\t${name}\n`).join(''));
// Orphan commit, force-pushed: each branch holds one commit, so the repo doesn't grow with every update.
const push = (tree, branch, msg) => {
  const commit = git(['commit-tree', tree, '-m', msg]);
  git(['push', '--quiet', '--force', 'origin', `${commit}:refs/heads/${branch}`]);
};

function publish() {
  if (fs.existsSync(path.join(LIFE, 'STOP'))) return 'stopped';
  const memo = readJson(MEMO, {}), now = Date.now(), done = [];

  const appFiles = fs.readdirSync(APP).sort().map((f) => [f, blob(fs.readFileSync(path.join(APP, f)))]);
  const appTree = treeOf(appFiles);
  if (appTree !== memo.appTree) { push(appTree, 'mobile', 'Phone app'); memo.appTree = appTree; done.push('app'); }

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

module.exports = { snapshot, encrypt };
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
