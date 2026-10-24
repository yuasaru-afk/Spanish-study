// 起動と画面切替（hash ルーティング）
import { load, save, touchStreak } from './store.js';
import { dayNumber } from './srs.js';
import * as content from './content.js';
import { maybeShowInstallHint } from './views/install.js';
import * as settings from './views/settings.js';

const ROUTES = [
  [/^#\/settings$/, settings.render],
];

const storage = (() => {
  try { localStorage.setItem('es-app-probe', '1'); return localStorage; } catch { /* 保存できない環境はメモリで動かす */ }
  const m = new Map();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
})();

let state = touchStreak(load(storage), dayNumber(new Date()));
save(storage, state);

export function applySettings(doc, s) {
  doc.documentElement.dataset.font = s.fontSize;
  doc.documentElement.dataset.theme = s.theme;
}

const ctx = {
  get state() { return state; },
  setState(fn) {
    state = fn(state);
    save(storage, state);
    applySettings(document, state.settings);
    if (ctx.rerender) draw();
  },
  go(hash) { if (location.hash === hash) draw(); else location.hash = hash; },
  content,
  rerender: true,
};

function draw() {
  const root = document.getElementById('app');
  const hash = location.hash || '#/';
  const scrollKeep = hash === draw.last ? window.scrollY : 0;
  draw.last = hash;
  root.replaceChildren();
  ctx.rerender = true;
  for (const [re, render] of ROUTES) {
    const m = hash.match(re);
    if (m) { render(root, ctx, ...m.slice(1)); window.scrollTo(0, scrollKeep); return; }
  }
  ROUTES.at(-1)[1](root, ctx);
}

applySettings(document, state.settings);
window.addEventListener('hashchange', draw);
draw();
maybeShowInstallHint(window);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js');
}
