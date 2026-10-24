// 文法ノート：各ユニットの解説を後から引き直す
import { h, rich } from '../dom.js';
import { esLine, topbar, progressBar } from './common.js';
import { recordAnswer } from '../store.js';
import { dayNumber } from '../srs.js';
import { grammarQuiz } from '../flow.js';
import { XP } from '../progress.js';
import { renderQuestion } from './quiz.js';
import { renderReward } from './reward.js';

export async function renderList(root, ctx) {
  const index = await ctx.content.loadIndex();
  if (!root.isConnected) return;
  root.append(
    topbar(ctx, '文法ノート'),
    h('div.body', {}, h('ul.units', {}, index.map(u => h('li', {},
      h('button.unit', { onclick: () => ctx.go(`#/grammar/${u.id}`) }, h('span.no', {}, u.no), h('span.name', {}, u.title), h('span', {}, '›')))))),
  );
}

// fromQuiz は練習問題の「文法ノートで見る」から来た時。上に「クイズに戻る」を出す
export async function renderUnit(root, ctx, unitId, fromQuiz) {
  const unit = await ctx.content.loadUnit(unitId);
  if (!root.isConnected) return;
  const back = fromQuiz
    ? h('button.back', { onclick: () => ctx.go(`#/u/${unitId}`) }, '‹ クイズに戻る')
    : h('button.back', { onclick: () => ctx.go('#/grammar') }, '‹ 文法ノート');
  root.append(
    h('div.topbar', {}, back, h('span.title', {}, `文法ノート：${unit.no} ${unit.title}`)),
    h('div.body', {},
      h('p.muted', {}, unit.summary),
      unit.explain.map(x => h('section', {},
        h('h2', {}, x.title),
        h('p', { html: rich(x.body) }),
        x.examples?.length ? h('div.note', {}, x.examples.map(ex => h('div', { style: 'margin:6px 0' }, esLine(ctx, ex.es), h('div', {}, ex.ja), ex.note ? h('div.muted', {}, ex.note) : null))) : null))),
    fromQuiz
      ? h('div.actions', {}, h('button.btn', { onclick: () => ctx.go(`#/u/${unitId}`) }, 'クイズに戻る'))
      : h('div.actions', {}, h('button.btn', { onclick: () => ctx.go(`#/gq/${unitId}`) }, '確認問題を解く（3問）')),
  );
}

// 文法ノートの確認問題（3問）。正解の XP は 5、1問につき1日1回まで。途中で閉じたら最初から
export async function renderQuiz(root, ctx, unitId) {
  const unit = await ctx.content.loadUnit(unitId);
  if (!root.isConnected) return;
  const today = dayNumber(new Date());
  const order = grammarQuiz(unit, today);
  const beforeXp = ctx.state.xp;
  let k = 0;
  const show = () => {
    root.replaceChildren();
    window.scrollTo(0, 0);
    if (k >= order.length) {
      ctx.reward = { title: '確認問題 おわり', beforeXp, earned: [], buttons: [
        { label: '文法ノートへ', hash: `#/grammar/${unitId}`, primary: true }, { label: 'ホームへ', hash: '#/' }] };
      return renderReward(root, ctx);
    }
    const i = order[k];
    const body = h('div.body');
    const actions = h('div.actions');
    root.append(topbar(ctx, `確認問題：${unit.no} ${unit.title}`, `${k + 1}/${order.length}`), progressBar(k / order.length), body, actions);
    renderQuestion(ctx, unit.practice[i], body, actions, {
      next: { label: '次へ', onclick: () => { k += 1; show(); } },
      onAnswer: ok => ctx.setState(st => recordAnswer(st, `${unitId}:${i}`, ok, today, XP.grammar), { redraw: false }),
    });
  };
  show();
}
