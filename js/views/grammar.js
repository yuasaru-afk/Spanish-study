// 文法ノート：各ユニットの解説を後から引き直す
import { h, rich } from '../dom.js';
import { esLine, topbar } from './common.js';

export async function renderList(root, ctx) {
  const index = await ctx.content.loadIndex();
  if (!root.isConnected) return;
  root.append(
    topbar(ctx, '文法ノート'),
    h('div.body', {}, h('ul.units', {}, index.map(u => h('li', {},
      h('button.unit', { onclick: () => ctx.go(`#/grammar/${u.id}`) }, h('span.no', {}, u.no), h('span.name', {}, u.title), h('span', {}, '›')))))),
  );
}

export async function renderUnit(root, ctx, unitId) {
  const unit = await ctx.content.loadUnit(unitId);
  if (!root.isConnected) return;
  root.append(
    h('div.topbar', {}, h('button.back', { onclick: () => history.length > 1 ? history.back() : ctx.go('#/grammar') }, '‹ 戻る'), h('span.title', {}, `文法ノート：${unit.no} ${unit.title}`)),
    h('div.body', {},
      h('p.muted', {}, unit.summary),
      unit.explain.map(x => h('section', {},
        h('h2', {}, x.title),
        h('p', { html: rich(x.body) }),
        x.examples?.length ? h('div.note', {}, x.examples.map(ex => h('div', { style: 'margin:6px 0' }, esLine(ctx, ex.es), h('div', {}, ex.ja), ex.note ? h('div.muted', {}, ex.note) : null))) : null))),
  );
}
