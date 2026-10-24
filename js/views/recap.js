// 振り返りレッスン：間違えた問題・今日の復習の単語・終えたユニットの問題で10問。途中で閉じたら最初から
import { h } from '../dom.js';
import { recordAnswer, checkWord, completeReview, awardBadges } from '../store.js';
import { dayNumber } from '../srs.js';
import { buildReview } from '../flow.js';
import { topbar, progressBar } from './common.js';
import { renderQuestion } from './quiz.js';
import { renderWordCard } from './wordcard.js';
import { renderReward } from './reward.js';
import { doneUnits } from './home.js';

export async function render(root, ctx) {
  const index = await ctx.content.loadIndex();
  const units = await doneUnits(ctx, index);
  if (!root.isConnected) return;
  const today = dayNumber(new Date());
  const items = buildReview({ mistakes: ctx.state.mistakes, cards: ctx.state.cards, doneUnits: units, today });
  const byId = new Map(units.map(u => [u.id, u]));
  const words = new Map(units.flatMap(u => u.words.map(w => [w.id, w])));
  const beforeXp = ctx.state.xp;
  let k = 0;

  const show = () => {
    root.replaceChildren();
    window.scrollTo(0, 0);
    if (k >= items.length) return finish();
    const it = items[k];
    const body = h('div.body');
    const actions = h('div.actions');
    root.append(topbar(ctx, '振り返りレッスン', `${k + 1}/${items.length}`), progressBar(k / items.length), body, actions);
    const next = () => { k += 1; show(); };
    if (it.kind === 'q') {
      renderQuestion(ctx, byId.get(it.unitId).practice[it.index], body, actions, {
        next: { label: '次へ', onclick: next },
        onAnswer: ok => ctx.setState(st => recordAnswer(st, it.qid, ok, today), { redraw: false }),
      });
    } else {
      body.append(h('p.muted', {}, '前に覚えた単語の確認'));
      renderWordCard(ctx, words.get(it.wordId), body, actions, remembered => {
        ctx.setState(st => checkWord(st, it.wordId, remembered, today), { redraw: false });
        next();
      });
    }
  };

  const finish = () => {
    let earned = [];
    ctx.setState(st => {
      const res = awardBadges(completeReview(st, today));
      earned = res.earned;
      return res.state;
    }, { redraw: false });
    ctx.reward = { title: '振り返り 完了！', beforeXp, earned, buttons: [{ label: 'ホームへ', hash: '#/', primary: true }] };
    renderReward(root, ctx);
  };

  if (!items.length) {
    root.append(topbar(ctx, '振り返りレッスン'), h('div.body', {}, h('p', {}, 'まだ振り返る材料がありません。レッスンを進めましょう。')));
    return;
  }
  show();
}
