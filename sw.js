// 全ファイルを先読みして圏外でも動かす。VERSION と PRECACHE は tools/gen-precache.mjs が書く
const VERSION = 'e93df62c';
const PRECACHE = ["./","css/app.css","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","index.html","js/check.js","js/content.js","js/dom.js","js/main.js","js/speech.js","js/srs.js","js/store.js","js/views/install.js","js/views/settings.js","manifest.webmanifest"];
const CACHE = `es-app-${VERSION}`;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('es-app-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
