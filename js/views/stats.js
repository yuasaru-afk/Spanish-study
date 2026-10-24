// 学習記録：レベル、連続日数、直近5週間のカレンダー、覚えた単語、終えたユニット、バッジ
import { h } from '../dom.js';
import { dayNumber } from '../srs.js';
import { levelInfo, learnedCount, BADGES } from '../progress.js';
import { topbar, progressBar } from './common.js';

const WEEKS = 5;
const shade = xp => (xp >= 80 ? 'c3' : xp >= 30 ? 'c2' : xp > 0 ? 'c1' : 'c0');

export function render(root, ctx) {
  const st = ctx.state;
  const lv = levelInfo(st.xp);
  const today = dayNumber(new Date());
  // 今日を右下にして、月曜始まりの5週間
  const dow = (new Date().getDay() + 6) % 7;
  const start = today - dow - 7 * (WEEKS - 1);
  const days = Array.from({ length: 7 * WEEKS }, (_, k) => start + k);
  const doneUnits = Object.values(st.units).filter(u => u.done).length;

  root.append(
    topbar(ctx, '学習記録'),
    h('div.body', {},
      h('div.levelcard', {},
        h('div.lvrow', {}, h('b', {}, `レベル ${lv.level}`), h('span.muted', {}, `累計 ${st.xp} XP`)),
        progressBar(lv.into / lv.need), h('div.muted', {}, `次のレベルまで ${lv.need - lv.into} XP`)),
      h('div.statgrid', {},
        h('div', {}, h('b', {}, `🔥 ${st.streak.count}`), h('span', {}, '日連続')),
        h('div', {}, h('b', {}, learnedCount(st.cards)), h('span', {}, '覚えた単語')),
        h('div', {}, h('b', {}, doneUnits), h('span', {}, '終えたユニット'))),
      h('h2', {}, '最近5週間'),
      h('div.cal', {},
        ['月', '火', '水', '木', '金', '土', '日'].map(d => h('span.calhead', {}, d)),
        days.map(d => h(`span.calday.${d > today ? 'future' : shade(st.daily[d] || 0)}${d === today ? '.today' : ''}`, { title: `${st.daily[d] || 0} XP` }))),
      h('p.muted', {}, '色が濃いほど、その日に多く学習しました。'),
      h('h2', {}, 'バッジ'),
      h('ul.badges', {}, BADGES.map(b => h(`li${st.badges.includes(b.id) ? '.got' : ''}`, {}, st.badges.includes(b.id) ? '🏅' : '・', ' ', b.label)))),
  );
}
