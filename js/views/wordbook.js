// 単語集：開いたユニットの単語（状態つき）とフレーズ。レッスンの単語チェックと同じ記録を使う
import { h } from '../dom.js';
import { dayNumber, dueWordIds } from '../srs.js';
import { wordStatus } from '../progress.js';
import { esLine, latamBox, withArt, topbar } from './common.js';
import { renderSpeakPanel } from './speakpanel.js';

const STATUS = { learned: ['覚えた', 'chip-ok'], shaky: ['あやしい', 'chip-mid'], new: ['まだ', 'chip-new'] };

// 開いたことのあるユニット（着手・完了）の教材。未開放のユニットは含めない
export async function openedUnits(ctx) {
  const index = await ctx.content.loadIndex();
  const ids = index.filter(u => ctx.state.units[u.id]).map(u => u.id);
  return Promise.all(ids.map(id => ctx.content.loadUnit(id)));
}

export async function render(root, ctx, tab) {
  const units = await openedUnits(ctx);
  if (!root.isConnected) return;
  const phrases = tab === 'phrases';
  const cards = ctx.state.cards;
  const all = units.flatMap(u => u.words);
  const due = dueWordIds(cards, dayNumber(new Date())).filter(id => all.some(w => w.id === id)).length;
  const fresh = all.filter(w => !cards[w.id]).length;
  const count = s => all.filter(w => wordStatus(cards[w.id]) === s).length;

  root.append(
    topbar(ctx, '単語集'),
    h('div.seg', {},
      h('button', { 'aria-pressed': String(!phrases), onclick: () => ctx.go('#/words') }, '単語'),
      h('button', { 'aria-pressed': String(phrases), onclick: () => ctx.go('#/words/phrases') }, 'フレーズ')),
  );
  const body = h('div.body');
  root.append(body);
  if (!units.length) {
    body.append(h('p.muted', {}, 'レッスンを始めると、ここに単語とフレーズがたまります。'));
    return;
  }

  if (!phrases) {
    body.append(
      h('p.muted', {}, `覚えた ${count('learned')}／あやしい ${count('shaky')}／まだ ${count('new')}（全 ${all.length}語）`),
      h('div.wordbtns', {},
        h('button.btn', { disabled: !due, onclick: () => ctx.go('#/review') }, `今日の復習 ${due}語`),
        h('button.btn2', { disabled: !fresh, onclick: () => ctx.go('#/words/new') }, `新しい単語を覚える（${Math.min(fresh, 8)}語）`)),
      ...units.map(u => h('section', {},
        h('h2', {}, `${u.no} ${u.title}`),
        h('ul.wordlist', {}, u.words.map(w => {
          const [label, cls] = STATUS[wordStatus(cards[w.id])];
          return h('li', {}, esLine(ctx, withArt(w.art, w.es)), h('div.wmeta', {}, h('span', {}, w.ja), h(`span.chip.${cls}`, {}, label)), latamBox(w.latam));
        })))));
    return;
  }

  const speakOn = ctx.state.settings.speak;
  body.append(
    h('p.muted', {}, speakOn ? '🎤 で発音練習ができます。' : '設定で「発音練習」をオンにすると、🎤 で発音練習ができます。'),
    ...units.filter(u => u.phrases.length).map(u => h('section', {},
      h('h2', {}, `${u.no} ${u.title}`),
      h('ul.wordlist', {}, u.phrases.map((p, i) => h('li', {},
        esLine(ctx, p.es, speakOn ? h('button.say', { onclick: () => ctx.go(`#/speak/${u.id}/${i}`) }, '🎤') : null),
        h('div', {}, p.ja), p.scene ? h('div.muted', {}, `場面：${p.scene}`) : null, latamBox(p.latam)))))));
}

export async function renderSpeak(root, ctx, unitId, i) {
  const unit = await ctx.content.loadUnit(unitId);
  if (!root.isConnected) return;
  const p = unit.phrases[Number(i)];
  const body = h('div.body');
  root.append(topbar(ctx, '発音練習', `${unit.no} ${unit.title}`, '#/words/phrases'), body,
    h('div.actions', {}, h('button.btn2', { onclick: () => ctx.go('#/words/phrases') }, 'フレーズ一覧へ')));
  if (p) renderSpeakPanel(ctx, { es: p.es, ja: p.ja }, body);
}
