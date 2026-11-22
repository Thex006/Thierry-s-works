// Claude Life phone app: fetches the encrypted status the PC pushes (life/mobile/publish.js), decrypts it here, shows it.
const DATA = new URLSearchParams(location.search).get('data') || 'https://raw.githubusercontent.com/Thex006/Thierry-s-works/mobile-data/status.json';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const ago = (t) => {
  const m = Math.round((Date.now() - Date.parse(t)) / 60000);
  return isNaN(m) ? '' : m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};
const when = (t) => (t ? new Date(t).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '');

async function decrypt(box, pass) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(box.salt), iterations: box.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(box.iv) }, key, b64(box.data));
  return JSON.parse(new TextDecoder().decode(plain));
}

function section(id, title, items) {
  $(id).innerHTML = items.length ? `<h2>${title}</h2><div class="card${id === 'needs' ? ' need' : ''}">${items.join('')}</div>` : '';
}

function render(s, pushed) {
  $('balance').textContent = '$' + Number(s.balance || 0).toFixed(2);
  $('lives').textContent = '❤️'.repeat(Math.max(0, s.lives || 0));
  $('day').textContent = 'Day ' + (s.day ?? 0);
  // The PC pushes at least every 10 minutes while it's on; older than 20 means it's off or offline.
  const stale = Date.now() - Date.parse(pushed) > 20 * 60000;
  const w = s.worker || {}, st = stale ? 'stale' : w.state || 'idle';
  const label = { working: 'Working', sleeping: 'Sleeping (usage limit)', paused: 'On a break', idle: 'Idle', stale: 'PC offline?' }[st] || st;
  $('badge').textContent = label; $('badge').dataset.s = st;
  $('updated').textContent = 'Updated ' + ago(pushed);
  $('nowText').textContent = s.activity?.label || '';
  $('nowMeta').textContent = [s.activity?.bet, w.until && `wakes ${when(w.until)}`, s.usage?.weekPercent != null && `week usage ${s.usage.weekPercent}%`].filter(Boolean).join(' · ');

  section('needs', 'Needs you', (s.needs || []).map((n) => `<div class="item">🙋 ${esc(n.text)}${n.t ? `<small>${esc(when(n.t))}</small>` : ''}</div>`));
  const rev = [...(s.review || [])].sort((a, b) => ((a.status || 'pending') === 'pending' ? -1 : 0) - ((b.status || 'pending') === 'pending' ? -1 : 0));
  section('review', 'Review', rev.map((r) => {
    const st = r.status || 'pending';
    return `<div class="item"><details><summary><b>${esc(r.title)}</b><span class="pill ${esc(st)}">${esc(st)}</span></summary><p>${esc(r.text)}</p>${r.note ? `<small>Your note: ${esc(r.note)}</small>` : ''}</details></div>`;
  }));
  section('bets', 'Bets', (s.bets || []).filter((b) => b.status === 'active').map((b) =>
    `<div class="item"><b>${esc(b.name)}</b> <span class="muted">$${esc(b.earned || 0)}</span><div class="metrics">${(b.metrics || []).map((m) => `<span>${esc(m.value)} ${esc(m.label)}</span>`).join('')}</div></div>`));
  section('chat', 'Chat', [...(s.chat || [])].reverse().slice(0, 6).map((m) =>
    `<div class="item"><details><summary>${esc(m.text.length > 90 ? m.text.slice(0, 90) + '…' : m.text)}</summary>${m.text.length > 90 ? `<p class="me">${esc(m.text)}</p>` : ''}${m.reply ? `<div class="reply">${esc(m.reply)}</div>` : ''}</details><small>${esc(m.reply ? 'Replied' : m.status)} · ${esc(when(m.t))}</small></div>`));
  section('journal', 'Journal', (s.log || []).slice(0, 12).map((l) => `<div class="item">${esc(l.text)}<small>${esc(when(l.t))}</small></div>`));
}

async function load() {
  const pass = store.get('pass');
  if (!pass) return showUnlock();
  let box;
  try {
    const r = await fetch(DATA + (DATA.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    box = await r.json(); store.set('box', JSON.stringify(box));
  } catch { box = JSON.parse(store.get('box') || 'null'); } // offline: show the last copy
  if (!box) { $('updated').textContent = 'No data yet'; return; }
  try { render(await decrypt(box, pass), box.pushed); $('main').hidden = false; $('unlock').hidden = true; $('lock').hidden = false; }
  catch { store.set('pass', null); showUnlock('That passphrase did not work.'); }
}
function showUnlock(err = '') { $('main').hidden = true; $('lock').hidden = true; $('unlock').hidden = false; $('unlockErr').textContent = err; }

$('unlock').addEventListener('submit', (e) => { e.preventDefault(); store.set('pass', $('pass').value.trim()); $('pass').value = ''; load(); });
$('lock').addEventListener('click', () => { store.set('pass', null); store.set('box', null); showUnlock(); });
// Optional one-tap setup link: ...#k=<passphrase>. The part after # never leaves the phone.
const k = new URLSearchParams(location.hash.slice(1)).get('k');
if (k) { store.set('pass', k); history.replaceState(null, '', location.pathname + location.search); }
load();
setInterval(load, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
