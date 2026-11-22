// App shell: network first, cache as fallback so the app opens offline. Status data is not cached here (app.js keeps the last copy).
const CACHE = 'claude-life-v2';
const SHELL = ['./', 'index.html', 'style.css', 'phone.css', 'phone.js', 'game.js', 'manifest.webmanifest', 'icon-192.png', 'fonts/press-start-2p.woff2', 'fonts/nunito.woff2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
