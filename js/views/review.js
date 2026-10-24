// 今日の単語の復習。忘れた単語は今回の最後にもう一度出す
import { h } from '../dom.js';
import { dayNumber, dueWordIds, gradeCard } from '../srs.js';
import { esLine, latamBox, withArt, topbar, progressBar } from './common.js';

async function allWords(ctx) {
  const index = await ctx.content.loadIndex();
  const units = await Promise.all(index.map(u => ctx.content.loadUnit(u.id)));
  return new Map(units.flatMap(u => u.words.map(w => [w.id, w])));
}

export async function render(root, ctx) {
  const words = await allWords(ctx);
  if (!root.isConnected) return;
  const today = dayNumber(new Date());
  const queue = dueWordIds(ctx.state.cards, today).filter(id => words.has(id));
  const total = queue.length;
  let done = 0;
  const head = h('div');
  const body = h('div.body');
  const actions = h('div.actions');
  root.append(head, body, actions);

  function show() {
    head.replaceChildren(topbar(ctx, '単語の復習', total ? `${Math.min(done + 1, total)}/${total}` : ''), progressBar(total ? done / total : 1));
    body.replaceChildren();
    actions.replaceChildren();
    if (!queue.length) {
      body.append(h('div', { style: 'text-align:center;padding-top:15vh' },
        h('div', { style: 'font-size:3em' }, total ? '👏' : '☕'),
        h('h1', {}, total ? '今日の復習は終わり！' : '今日の復習はありません'),
        h('p.muted', {}, total ? '次に出るのは、覚えた度合いに応じて数日後です。' : 'ユニットを進めると単語がたまります。')));
      actions.append(h('button.btn', { onclick: () => ctx.go('#/') }, 'ホームへ'));
      return;
    }
    const w = words.get(queue[0]);
    const back = h('div', { hidden: true }, h('div', { style: 'font-size:1.15em;margin-top:10px' }, w.ja), latamBox(w.latam));
    const grades = h('div.grades', { hidden: true },
      h('button.g-again', { onclick: () => grade('again') }, '✗ 忘れた'),
      h('button.g-hard', { onclick: () => grade('hard') }, '△ あやしい'),
      h('button.g-good', { onclick: () => grade('good') }, '○ 覚えた'));
    const hint = h('p.muted', { style: 'text-align:center' }, 'タップで意味を表示');
    const card = h('div.card.flash', { onclick: () => { back.hidden = false; grades.hidden = false; hint.remove(); } },
      esLine(ctx, withArt(w.art, w.es)), back);
    card.querySelector('.esline').style.justifyContent = 'center';
    body.append(card, hint);
    actions.append(h('p.muted', { style: 'text-align:center;margin:0' }, '覚えてた？'), grades);
  }

  function grade(g) {
    const id = queue.shift();
    ctx.setState(st => ({ ...st, cards: { ...st.cards, [id]: gradeCard(st.cards[id], g, today) } }), { redraw: false });
    if (g === 'again') queue.push(id); else done += 1;
    show();
  }
  show();
}
