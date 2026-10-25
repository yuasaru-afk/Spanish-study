// レッスン画面：文法の要点 → 練習 → 単語チェック（最大8語）。「次へ」のたびに位置を保存する
import { h } from '../dom.js';
import { setPosition, recordAnswer, checkWord, completeLesson, awardBadges } from '../store.js';
import { dayNumber } from '../srs.js';
import { stagesFor, nextPosition, prevPosition, stageLength, startPosition, STAGE_NAMES } from '../flow.js';
import { esLine, topbar, progressBar } from './common.js';
import { renderQuestion } from './quiz.js';
import { renderWordCard } from './wordcard.js';
import { renderReward } from './reward.js';

const today = () => dayNumber(new Date());

export async function render(root, ctx, unitId) {
  const unit = await ctx.content.loadUnit(unitId);
  if (!root.isConnected) return;
  // 位置はユニットごと。古い記録（resume だけ持っている）からも読む
  const r = ctx.state.resume;
  const saved = ctx.state.units[unitId]?.pos || (r?.unitId === unitId ? r : null);
  // 単語チェックの対象は段に入った時に決めたものを使う（記録が付いても並びがずれない）
  const start = startPosition(unit, saved, ctx.state.cards);
  const wordIds = start === 'finish' ? [] : start.wordIds;
  const stages = stagesFor(unit, wordIds);
  const pos = start === 'finish' ? null : start.pos;
  const idsFor = stage => (stage === 'words' ? wordIds : undefined);
  const finish = extra => {
    const beforeXp = ctx.state.xp;
    let earned = [];
    ctx.setState(st => {
      const res = awardBadges(completeLesson(extra(st), unitId, today()));
      earned = res.earned;
      return res.state;
    }, { redraw: false });
    ctx.reward = { title: `${unit.no} ${unit.title} 完了！`, beforeXp, earned, unitId };
    ctx.go(`#/done/${unitId}`);
  };
  if (!pos) return finish(st => st);
  const cur = ctx.state.units[unitId]?.pos;
  if (!cur || cur.stage !== pos.stage || cur.index !== pos.index || (pos.stage === 'words' && !cur.ids)
    || (!ctx.state.units[unitId]?.done && r?.unitId !== unitId)) {
    ctx.setState(st => setPosition(st, unitId, pos.stage, pos.index, idsFor(pos.stage)), { redraw: false });
  }

  // 次へ。extra は進む前に記録へ足す更新（単語チェックの答え）
  const advance = (extra = st => st) => {
    const next = nextPosition(unit, wordIds, pos);
    if (next === 'done') return finish(extra);
    ctx.setState(st => setPosition(extra(st), unitId, next.stage, next.index, idsFor(next.stage)), { top: true });
  };
  const total = stages.reduce((n, s) => n + stageLength(unit, s, wordIds), 0);
  const doneSoFar = stages.slice(0, stages.indexOf(pos.stage)).reduce((n, s) => n + stageLength(unit, s, wordIds), 0) + pos.index;
  const body = h('div.body');
  const actions = h('div.actions');
  root.append(
    topbar(ctx, `${unit.no} ${unit.title}`, `${STAGE_NAMES[pos.stage]} ${pos.index + 1}/${stageLength(unit, pos.stage, wordIds)}`),
    progressBar(doneSoFar / total), body, actions);
  // 1つ前に戻る（小さく）。戻ってもう一度答えても XP は1問1日1回のまま
  const prev = prevPosition(unit, wordIds, pos);
  if (prev) {
    body.before(h('button.prevlink', {
      onclick: () => ctx.setState(st => setPosition(st, unitId, prev.stage, prev.index, idsFor(prev.stage)), { top: true }),
    }, '‹ 前の問題'));
  }

  if (pos.stage === 'points') {
    body.append(
      h('h1', {}, '今日の文法'),
      h('ul.points', {}, unit.points.lines.map(l => h('li', {}, l))),
      unit.points.examples?.length ? h('div.note', {}, unit.points.examples.map(ex => h('div', { style: 'margin:6px 0' }, esLine(ctx, ex.es), h('div', {}, ex.ja)))) : null,
      h('p.muted', {}, 'くわしい説明は、問題の途中でも「📘 文法ノートで見る」から読めます。'));
    actions.append(h('button.btn', { onclick: () => advance() }, '問題へ'));
  } else if (pos.stage === 'practice') {
    const qid = `${unit.id}:${pos.index}`;
    renderQuestion(ctx, unit.practice[pos.index], body, actions, {
      next: { label: '次へ', onclick: () => advance() },
      grammarHash: `#/grammar/${unit.id}/q`,
      onAnswer: ok => ctx.setState(st => recordAnswer(st, qid, ok, today()), { redraw: false }),
    });
  } else {
    const w = unit.words.find(x => x.id === wordIds[pos.index]);
    body.append(h('p.muted', {}, 'このユニットで出てきた単語を復習しましょう。'));
    renderWordCard(ctx, w, body, actions, remembered => advance(st => checkWord(st, w.id, remembered, today())));
  }
}

export async function renderDone(root, ctx, unitId) {
  const index = await ctx.content.loadIndex();
  if (!root.isConnected) return;
  const at = index.findIndex(u => u.id === unitId);
  const next = index[at + 1];
  const base = ctx.reward?.unitId === unitId ? ctx.reward : { title: 'ユニット完了！', beforeXp: ctx.state.xp, earned: [] };
  ctx.reward = { ...base, buttons: [
    next ? { label: `次へ：${next.no} ${next.title}`, hash: `#/u/${next.id}`, primary: true } : null,
    { label: 'ホームへ', hash: '#/', primary: !next },
  ].filter(Boolean) };
  renderReward(root, ctx);
}
