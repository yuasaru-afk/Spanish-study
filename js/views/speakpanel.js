// 発音練習の部品：お手本を聞いて話すとマイクで判定。使えない時は判定なしに切り替える
import { h } from '../dom.js';
import { matchSpoken } from '../check.js';
import { canListen, listen, shouldFallback } from '../speech.js';
import { sayButton } from './common.js';

const FALLBACK = {
  unsupported: 'この端末では判定できないので、お手本を聞いて自分で声に出してみましょう。',
  denied: 'マイクが使えないので、判定なしで練習します。お手本を聞いて声に出してみましょう。',
  network: '圏外のため判定できません。お手本を聞いて声に出してみましょう。',
  silent: 'うまく聞き取れないので、判定なしで練習します。お手本を聞いて声に出してみましょう。',
};

export function renderSpeakPanel(ctx, s, body) {
  const result = h('div');
  let silent = 0;
  const mic = h('button.mic', { 'aria-label': '話す', onclick: talk }, '🎤');
  body.append(
    h('p', {}, 'お手本を聞いて、言ってみよう'),
    h('div.note', {}, h('div.esline', {}, h('span.es', { lang: 'es' }, s.es), sayButton(ctx, s.es, '🔊 ふつう'), sayButton(ctx, s.es, '🐢 ゆっくり', 0.7)), h('div', {}, s.ja)),
    s.tip ? h('p.muted', {}, `💡 ${s.tip}`) : null,
  );
  if (canListen(window)) body.append(mic); else showFallback('unsupported');
  body.append(result);

  function showFallback(reason) {
    mic.remove();
    result.replaceChildren(h('div.note', {}, FALLBACK[reason]));
  }
  async function talk() {
    mic.classList.add('on');
    mic.disabled = true;
    result.replaceChildren(h('p.muted', {}, '聞いています…'));
    const r = await listen(window);
    mic.classList.remove('on');
    mic.disabled = false;
    if (!r.ok) {
      silent = FALLBACK[r.reason] ? silent : silent + 1;
      if (shouldFallback(r.reason, silent)) return showFallback(FALLBACK[r.reason] ? r.reason : 'silent');
      return result.replaceChildren(h('div.ng', {}, '聞き取れませんでした。もう一度どうぞ。'));
    }
    silent = 0;
    const grade = matchSpoken(s.es, r.text);
    const label = { great: '◎ 通じます！', close: '○ おしい！もう一度', retry: 'もう一度言ってみよう' }[grade];
    result.replaceChildren(h(grade === 'great' ? 'div.ok' : 'div.ng', {}, h('div', {}, '聞き取れた文：', h('span', { lang: 'es' }, `「${r.text}」`)), h('b', {}, label)));
  }
}
