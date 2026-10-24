// 単語の復習（今日の復習・新しい単語を覚える）。忘れてた単語は今回の最後にもう一度出す
import { h } from '../dom.js';
import { dayNumber, dueWordIds } from '../srs.js';
import { checkWord, awardBadges } from '../store.js';
import { topbar, progressBar } from './common.js';
import { renderWordCard } from './wordcard.js';
import { renderReward } from './reward.js';
import { openedUnits } from './wordbook.js';

const NEW_AT_ONCE = 8;

// mode: 'due'（今日の復習） | 'new'（開いたユニットの、記録のまだ無い単語を最大8）
export async function render(root, ctx, mode) {
  mode = mode === 'new' ? 'new' : 'due';
  const units = await openedUnits(ctx);
  if (!root.isConnected) return;
  const words = new Map(units.flatMap(u => u.words.map(w => [w.id, w])));
  const today = dayNumber(new Date());
  const queue = mode === 'new'
    ? [...words.keys()].filter(id => !ctx.state.cards[id]).slice(0, NEW_AT_ONCE)
    : dueWordIds(ctx.state.cards, today).filter(id => words.has(id));
  const title = mode === 'new' ? '新しい単語' : '今日の単語の復習';
  const total = queue.length;
  const beforeXp = ctx.state.xp;
  let done = 0;

  const show = () => {
    root.replaceChildren();
    window.scrollTo(0, 0);
    if (!queue.length) {
      if (total) return finish();
      root.append(topbar(ctx, title), h('div.body', { style: 'text-align:center;padding-top:15vh' },
        h('div', { style: 'font-size:3em' }, '☕'),
        h('h1', {}, mode === 'new' ? '新しい単語はありません' : '今日の復習はありません'),
        h('p.muted', {}, 'レッスンを進めると単語が増えます。')),
      h('div.actions', {}, h('button.btn', { onclick: () => ctx.go('#/words') }, '単語集へ')));
      return;
    }
    const body = h('div.body');
    const actions = h('div.actions');
    root.append(topbar(ctx, title, `${Math.min(done + 1, total)}/${total}`, '#/words'), progressBar(done / total), body, actions);
    const id = queue[0];
    renderWordCard(ctx, words.get(id), body, actions, remembered => {
      ctx.setState(st => checkWord(st, id, remembered, today), { redraw: false });
      queue.shift();
      if (remembered) done += 1; else queue.push(id);
      show();
    });
  };

  const finish = () => {
    let earned = [];
    ctx.setState(st => { const r = awardBadges(st); earned = r.earned; return r.state; }, { redraw: false });
    ctx.reward = { title: `${title} おわり`, beforeXp, earned, buttons: [{ label: '単語集へ', hash: '#/words', primary: true }, { label: 'ホームへ', hash: '#/' }] };
    renderReward(root, ctx);
  };
  show();
}

export const renderNew = (root, ctx) => render(root, ctx, 'new');
