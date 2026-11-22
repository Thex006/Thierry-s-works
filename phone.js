// Phone shim, loaded before the desktop game.js: answers its GET /api/state from the encrypted snapshot the PC pushes
// (life/mobile/publish.js), so the phone runs the same animated game. Writes (review, chat, stop) stay on the PC.
(() => {
  const DATA = new URLSearchParams(location.search).get('data') || 'https://raw.githubusercontent.com/Thex006/Thierry-s-works/mobile-data/status.json';
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const realFetch = window.fetch.bind(window);
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  // Optional one-tap setup link: ...#k=<passphrase>. The part after # never leaves the phone.
  const k = new URLSearchParams(location.hash.slice(1)).get('k');
  if (k) { store.set('pass', k); history.replaceState(null, '', location.pathname + location.search); }

  async function decrypt(box, pass) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(box.salt), iterations: box.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(box.iv) }, key, b64(box.data))));
  }

  // game.js polls every 3 s; the network is only asked once a minute (the PC pushes about that often).
  let cache = null, fetchedAt = 0, lastBox = '';
  async function state() {
    const pass = store.get('pass');
    if (!pass) { showUnlock(); throw new Error('locked'); }
    if (!cache || Date.now() - fetchedAt > 60000) {
      fetchedAt = Date.now();
      let raw = null;
      try { const r = await realFetch(DATA + (DATA.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' }); if (r.ok) raw = await r.text(); } catch {}
      raw = raw || store.get('box'); // offline: the last copy
      if (raw && raw !== lastBox) {
        const box = JSON.parse(raw);
        try { cache = { ...(await decrypt(box, pass)), pushed: box.pushed }; } catch { store.set('pass', null); cache = null; showUnlock('That passphrase did not work.'); throw new Error('bad pass'); }
        lastBox = raw; store.set('box', raw);
      }
    }
    if (!cache) throw new Error('no data');
    const s = structuredClone(cache), age = Date.now() - Date.parse(s.pushed);
    if (s.worker?.heartbeat) s.worker.heartbeatAgo = Math.max(0, Math.round((Date.now() - Date.parse(s.worker.heartbeat)) / 1000));
    // The PC pushes at least every 10 minutes while it's on.
    if (age > 20 * 60000) s.worker = { ...(s.worker || {}), state: 'idle', log: 'No update from the PC for ' + Math.round(age / 60000) + ' min. Is it off?' };
    else s.worker = { ...(s.worker || {}), log: 'Phone · updated ' + (age < 90000 ? 'just now' : Math.round(age / 60000) + ' min ago') };
    return s;
  }

  window.fetch = async (url, opts = {}) => {
    if (String(url).startsWith('/api/')) {
      if ((opts.method || 'GET') !== 'GET') return json({ error: 'Read-only on the phone. Use the PC app.' }, 403);
      try { return json(await state()); } catch (e) { return json({ error: e.message }, 503); }
    }
    return realFetch(url, opts);
  };

  function showUnlock(err = '') {
    let f = document.getElementById('unlock');
    if (!f) {
      f = document.createElement('form'); f.id = 'unlock'; f.className = 'unlock';
      f.innerHTML = '<h2>Unlock</h2><p>Paste the passphrase from <code>life\\private\\mobile-key.txt</code> on the PC. It stays on this phone only.</p>' +
        '<input id="pass" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false" aria-label="Passphrase" required>' +
        '<button class="btn on" type="submit">Unlock</button><p class="err" role="alert"></p>';
      f.addEventListener('submit', (e) => { e.preventDefault(); store.set('pass', f.querySelector('input').value.trim()); f.remove(); cache = null; lastBox = ''; });
      document.body.append(f);
    }
    f.querySelector('.err').textContent = err;
  }

  addEventListener('DOMContentLoaded', () => {
    const b = document.createElement('button'); b.className = 'forget'; b.textContent = 'Forget passphrase on this phone';
    b.onclick = () => { store.set('pass', null); store.set('box', null); location.reload(); };
    document.body.append(b);
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
