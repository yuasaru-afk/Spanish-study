// 単語カード：タップで意味を出し、「✗ 忘れてた／○ 覚えてた」で答える（レッスン・単語集・振り返りで共通）
import { h } from '../dom.js';
import { speak } from '../speech.js';
import { esLine, latamBox, withArt } from './common.js';

export function renderWordCard(ctx, w, body, actions, onGrade) {
  const back = h('div', { hidden: true }, h('div', { style: 'font-size:1.15em;margin-top:10px' }, w.ja), latamBox(w.latam));
  const gender = w.art === 'el' ? '男性名詞' : w.art === 'la' ? '女性名詞' : '';
  // 早押し2回で2回答えたことにならないよう、1回押したら両方止める
  let answered = false;
  const grade = remembered => () => {
    if (answered) return;
    answered = true;
    grades.querySelectorAll('button').forEach(b => (b.disabled = true));
    onGrade(remembered);
  };
  const grades = h('div.grades', { hidden: true, style: 'grid-template-columns:1fr 1fr' },
    h('button.g-again', { onclick: grade(false) }, '✗ 忘れてた'),
    h('button.g-good', { onclick: grade(true) }, '○ 覚えてた'));
  const hint = h('p.muted', { style: 'text-align:center' }, 'タップで意味を表示');
  // カードをタップしたら意味を出して、単語を読み上げる
  const card = h('div.card.flash', { onclick: () => { speak(window, withArt(w.art, w.es), ctx.state.settings.rate); back.hidden = false; grades.hidden = false; hint.remove(); } },
    esLine(ctx, withArt(w.art, w.es)), gender ? h('div.muted', {}, gender) : null, back);
  card.querySelector('.esline').style.justifyContent = 'center';
  body.append(card, hint);
  actions.append(h('p.muted', { style: 'text-align:center;margin:0' }, '意味を思い出してからタップ'), grades);
}
