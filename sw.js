// 全ファイルを先読みして圏外でも動かす。VERSION と PRECACHE は tools/gen-precache.mjs が書く
const VERSION = '89e61dae';
const PRECACHE = ["./","content/u01.json","content/u02.json","content/u03.json","content/u04.json","content/u05.json","content/u06.json","content/u07.json","content/u08.json","content/u09.json","content/u10.json","content/u11.json","content/u12.json","content/u13.json","content/u14.json","content/u15.json","content/u16.json","content/u17.json","content/u18.json","content/u19.json","content/u20.json","content/units.json","css/app.css","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","index.html","js/check.js","js/content.js","js/dom.js","js/flow.js","js/main.js","js/progress.js","js/speech.js","js/srs.js","js/store.js","js/views/common.js","js/views/grammar.js","js/views/home.js","js/views/install.js","js/views/lesson.js","js/views/quiz.js","js/views/recap.js","js/views/review.js","js/views/reward.js","js/views/settings.js","js/views/speakpanel.js","js/views/stats.js","js/views/wordbook.js","js/views/wordcard.js","manifest.webmanifest"];
const CACHE = `es-app-${VERSION}`;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
