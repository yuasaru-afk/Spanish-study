import { h } from '../dom.js';
import { dayNumber, dueWordIds } from '../srs.js';
import { isUnlocked, buildReview, STAGE_NAMES } from '../flow.js';
import { levelInfo } from '../progress.js';
import { REVIEW_EVERY } from '../store.js';
import { progressBar } from './common.js';

// 終えたユニットの教材（振り返りの材料）
export async function doneUnits(ctx, index) {
  const ids = index.filter(u => ctx.state.units[u.id]?.done).map(u => u.id);
  return Promise.all(ids.map(id => ctx.content.loadUnit(id)));
}

export async function render(root, ctx) {
  const index = await ctx.content.loadIndex();
  const st = ctx.state;
  const today = dayNumber(new Date());
  // 教材の読み込みに失敗しても、ホームは開けるようにする（振り返りを出さないだけ）
  let showRecap = false;
  if (st.sinceReview >= REVIEW_EVERY) {
    try {
      showRecap = buildReview({ mistakes: st.mistakes, cards: st.cards, doneUnits: await doneUnits(ctx, index), today }).length > 0;
    } catch { showRecap = false; }
  }
  if (!root.isConnected) return;
  const due = dueWordIds(st.cards, today).length;
  const lv = levelInfo(st.xp);
  const resumeUnit = st.resume && index.find(u => u.id === st.resume.unitId);
  const nextUnit = index.find(u => !st.units[u.id]?.done && isUnlocked(index, st.units, u.id));

  root.append(
    h('div.topbar', {}, h('span.title', {}, '¡Hola!'), h('span.streak', {}, `🔥 ${st.streak.count}日連続`)),
    h('div.body', {},
      h('button.levelcard', { onclick: () => ctx.go('#/stats') },
        h('div.lvrow', {}, h('b', {}, `レベル ${lv.level}`), h('span.muted', {}, `今日 ${st.daily[today] || 0} XP`)),
        progressBar(lv.into / lv.need),
        h('div.muted', {}, `次のレベルまで ${lv.need - lv.into} XP ›`)),
      resumeUnit
        ? h('div.note', {},
          h('div', {}, `続きから：${resumeUnit.no} ${resumeUnit.title}`),
          h('div.muted', {}, `${STAGE_NAMES[st.resume.stage] || ''} ${st.resume.index + 1} から`),
          h('button.btn', { style: 'margin-top:8px', onclick: () => ctx.go(`#/u/${resumeUnit.id}`) }, '続ける ▶'))
        : nextUnit
          ? h('div.note', {}, h('div', {}, `次のレッスン：${nextUnit.no} ${nextUnit.title}`),
            h('button.btn', { style: 'margin-top:8px', onclick: () => ctx.go(`#/u/${nextUnit.id}`) }, '始める ▶'))
          : null,
      showRecap ? h('button.btn2', { onclick: () => ctx.go('#/recap') }, '🔁 振り返りレッスン（10問）') : null,
      due ? h('button.btn2', { style: 'margin-top:8px', onclick: () => ctx.go('#/review') }, `🃏 今日の単語の復習：${due}語`) : null,
      h('ul.units', {}, index.map(u => {
        const done = st.units[u.id]?.done;
        const open = isUnlocked(index, st.units, u.id);
        const now = (resumeUnit ? resumeUnit.id : nextUnit?.id) === u.id;
        return h('li', {}, h(`button.unit${done ? '.done' : ''}${now ? '.now' : ''}`, { disabled: !open, onclick: () => ctx.go(`#/u/${u.id}`) },
          h('span.no', {}, u.no), h('span.name', {}, u.title), h('span', {}, done ? '✓' : open ? '▶' : '🔒')));
      })),
      h('div.menu.menu4', {},
        h('button', { onclick: () => ctx.go('#/grammar') }, '📘', h('br'), '文法ノート'),
        h('button', { onclick: () => ctx.go('#/words') }, '🃏', h('br'), '単語集'),
        h('button', { onclick: () => ctx.go('#/stats') }, '📈', h('br'), '記録'),
        h('button', { onclick: () => ctx.go('#/settings') }, '⚙', h('br'), '設定')),
    ),
  );
}
