// 画面共通の部品
import { h } from '../dom.js';
import { speak } from '../speech.js';

export function sayButton(ctx, text, label = '🔊', rate) {
  const say = () => speak(window, text, rate ?? ctx.state.settings.rate);
  // 指が触れた瞬間に読む（click は指を離してからなので遅れる）。キーボードの click（detail 0）も読む
  return h('button.say', {
    'aria-label': `読み上げ: ${text}`,
    onpointerdown: e => { e.stopPropagation(); say(); },
    onclick: e => { e.stopPropagation(); if (e.detail === 0) say(); },
  }, label);
}

// スペイン語の1行（文字＋読み上げ）
export function esLine(ctx, text, extra) {
  return h('div.esline', {}, h('span.es', { lang: 'es' }, text), sayButton(ctx, text), extra || null);
}

export function withArt(art, es) {
  return art ? `${art} ${es}` : es;
}

export function latamBox(latam) {
  if (!latam?.es) return null;
  return h('div.latam', {}, '🌎 中南米では ', h('b', { lang: 'es' }, withArt(latam.art, latam.es)), latam.note ? `（${latam.note}）` : '');
}

export function topbar(ctx, title, right, backTo = '#/') {
  return h('div.topbar', {}, h('button.back', { onclick: () => ctx.go(backTo) }, backTo === '#/' ? '‹ ホーム' : '‹ 戻る'), h('span.title', {}, title), right ? h('span', {}, right) : null);
}

export function progressBar(ratio) {
  return h('div.progress', {}, h('i', { style: `width:${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }));
}
