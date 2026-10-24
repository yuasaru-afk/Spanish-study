// 単語カード：タップで意味を出し、「✗ 忘れてた／○ 覚えてた」で答える（レッスン・単語集・振り返りで共通）
import { h } from '../dom.js';
import { esLine, latamBox, withArt } from './common.js';

export function renderWordCard(ctx, w, body, actions, onGrade) {
  const back = h('div', { hidden: true }, h('div', { style: 'font-size:1.15em;margin-top:10px' }, w.ja), latamBox(w.latam));
  const gender = w.art === 'el' ? '男性名詞' : w.art === 'la' ? '女性名詞' : '';
  const grades = h('div.grades', { hidden: true, style: 'grid-template-columns:1fr 1fr' },
    h('button.g-again', { onclick: () => onGrade(false) }, '✗ 忘れてた'),
    h('button.g-good', { onclick: () => onGrade(true) }, '○ 覚えてた'));
  const hint = h('p.muted', { style: 'text-align:center' }, 'タップで意味を表示');
  const card = h('div.card.flash', { onclick: () => { back.hidden = false; grades.hidden = false; hint.remove(); } },
    esLine(ctx, withArt(w.art, w.es)), gender ? h('div.muted', {}, gender) : null, back);
  card.querySelector('.esline').style.justifyContent = 'center';
  body.append(card, hint);
  actions.append(h('p.muted', { style: 'text-align:center;margin:0' }, '意味を思い出してからタップ'), grades);
}
