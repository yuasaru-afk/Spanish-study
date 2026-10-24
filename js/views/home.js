import { h } from '../dom.js';
import { dayNumber, dueWordIds } from '../srs.js';
import { isUnlocked, STAGE_NAMES } from '../flow.js';

export async function render(root, ctx) {
  const index = await ctx.content.loadIndex();
  if (!root.isConnected) return;
  const st = ctx.state;
  const due = dueWordIds(st.cards, dayNumber(new Date())).length;
  const resumeUnit = st.resume && index.find(u => u.id === st.resume.unitId);
  const nextUnit = index.find(u => !st.units[u.id]?.done && isUnlocked(index, st.units, u.id));

  root.append(
    h('div.topbar', {}, h('span.title', {}, '¡Hola!'), st.streak.count ? h('span', {}, `🔥 ${st.streak.count}日連続`) : null),
    h('div.body', {},
      resumeUnit
        ? h('div.note', {},
          h('div', {}, `続きから：${resumeUnit.no} ${resumeUnit.title}`),
          h('div.muted', {}, `${STAGE_NAMES[st.resume.stage]} ${st.resume.index + 1} 問目から`),
          h('button.btn', { style: 'margin-top:8px', onclick: () => ctx.go(`#/u/${resumeUnit.id}`) }, '続ける ▶'))
        : nextUnit
          ? h('div.note', {}, h('div', {}, `次は：${nextUnit.no} ${nextUnit.title}`),
            h('button.btn', { style: 'margin-top:8px', onclick: () => ctx.go(`#/u/${nextUnit.id}`) }, '始める ▶'))
          : null,
      due ? h('button.btn2', { onclick: () => ctx.go('#/review') }, `今日の単語の復習：${due}個`) : null,
      h('ul.units', {}, index.map(u => {
        const done = st.units[u.id]?.done;
        const open = isUnlocked(index, st.units, u.id);
        const now = (resumeUnit ? resumeUnit.id : nextUnit?.id) === u.id;
        return h('li', {}, h(`button.unit${done ? '.done' : ''}${now ? '.now' : ''}`, { disabled: !open, onclick: () => ctx.go(`#/u/${u.id}`) },
          h('span.no', {}, u.no), h('span.name', {}, u.title), h('span', {}, done ? '✓' : open ? '▶' : '🔒')));
      })),
      h('div.menu', {},
        h('button', { onclick: () => ctx.go('#/grammar') }, '📘', h('br'), '文法ノート'),
        h('button', { onclick: () => ctx.go('#/review') }, '🃏', h('br'), '単語の復習'),
        h('button', { onclick: () => ctx.go('#/settings') }, '⚙', h('br'), '設定')),
    ),
  );
}
