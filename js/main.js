// 起動と画面切替（hash ルーティング）
import { load, save, touchStreak } from './store.js';
import { dayNumber } from './srs.js';
import * as content from './content.js';
import { h } from './dom.js';
import { maybeShowInstallHint } from './views/install.js';
import { warmUpSpeech } from './speech.js';
import * as settings from './views/settings.js';
import * as home from './views/home.js';
import * as lesson from './views/lesson.js';
import * as review from './views/review.js';
import * as grammar from './views/grammar.js';
import * as wordbook from './views/wordbook.js';
import * as recap from './views/recap.js';
import * as stats from './views/stats.js';

window.__errors = [];
window.addEventListener('error', e => window.__errors.push(e.message));
window.addEventListener('unhandledrejection', e => window.__errors.push(String(e.reason)));

const ROUTES = [
  [/^#\/u\/(\w+)$/, lesson.render],
  [/^#\/done\/(\w+)$/, lesson.renderDone],
  [/^#\/review$/, review.render],
  [/^#\/words\/new$/, review.renderNew],
  [/^#\/words\/(phrases)$/, wordbook.render],
  [/^#\/words$/, wordbook.render],
  [/^#\/speak\/(\w+)\/(\d+)$/, wordbook.renderSpeak],
  [/^#\/recap$/, recap.render],
  [/^#\/stats$/, stats.render],
  [/^#\/grammar\/(\w+)(\/q)?$/, grammar.renderUnit],
  [/^#\/gq\/(\w+)$/, grammar.renderQuiz],
  [/^#\/grammar$/, grammar.renderList],
  [/^#\/settings$/, settings.render],
  [/.*/, home.render],
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
  // redraw:false は画面が自分で表示を更新する時（練習の途中・単語の復習など）
  // top:true は次の問題へ進む時。同じ画面の描き直しでもスクロールを先頭に戻す
  setState(fn, { redraw = true, top = false } = {}) {
    state = fn(state);
    save(storage, state);
    applySettings(document, state.settings);
    if (redraw) draw({ top });
  },
  go(hash) { if (location.hash === hash) draw(); else location.hash = hash; },
  content,
};

// 毎回新しい入れ物に描く。読み込み待ちの間に画面が変わったら、古い描画は捨てる（isConnected で判定）
function draw({ top = false } = {}) {
  const root = document.getElementById('app');
  const hash = location.hash || '#/';
  if (pendingReload && hash === '#/') { location.reload(); return; }
  const keepScroll = hash === draw.last && !top ? window.scrollY : 0;
  draw.last = hash;
  const box = h('div', { style: 'display:contents' });
  root.replaceChildren(box);
  const [re, render] = ROUTES.find(([r]) => r.test(hash));
  Promise.resolve(render(box, ctx, ...hash.match(re).slice(1)))
    .then(() => window.scrollTo(0, keepScroll))
    .catch(err => {
      box.replaceChildren(h('div.ng', {}, '読み込めませんでした。', h('br'), String(err.message || err)),
        h('button.btn2', { onclick: () => ctx.go('#/') }, 'ホームへ'), h('div', { style: 'height:8px' }),
        h('button.btn2', { onclick: () => ctx.go('#/settings') }, '設定へ（記録の読み込み）'));
    });
}

// 新しい教材（Service Worker の入れ替え）が来たら、ホームに戻った時に読み直す。
// 練習の途中では読み直さない
let pendingReload = false;

applySettings(document, state.settings);
window.addEventListener('hashchange', () => draw());
draw();
maybeShowInstallHint(window);
warmUpSpeech(window);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register('sw.js').then(reg => {
    // iOS はホーム画面アプリを起動し直さずに復帰させるので、表に出るたびに更新を確かめる
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    pendingReload = true;
    if ((location.hash || '#/') === '#/') location.reload();
  });
}
