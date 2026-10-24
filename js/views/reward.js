// 完了画面：もらった XP、レベル（上がったらお祝い）、新しいバッジ
import { h } from '../dom.js';
import { levelInfo, levelUp, BADGES } from '../progress.js';
import { topbar, progressBar } from './common.js';

// ctx.reward = { title, beforeXp, earned: badgeIds, buttons: [{label, hash, primary}] }
// 読み直し（リロード）で reward が無い時は、レベルだけの簡単な画面
export function renderReward(root, ctx) {
  const r = ctx.reward || { title: 'おつかれさま！', beforeXp: ctx.state.xp, earned: [], buttons: [{ label: 'ホームへ', hash: '#/', primary: true }] };
  const now = levelInfo(ctx.state.xp);
  const gained = ctx.state.xp - r.beforeXp;
  // レッスンの途中で上がった分もここで祝う（前に見せたレベルと比べる）
  const up = levelUp(ctx.state.shownLevel, ctx.state.xp) !== null;
  if (up) ctx.setState(st => ({ ...st, shownLevel: now.level }), { redraw: false });
  const labels = new Map(BADGES.map(b => [b.id, b.label]));
  root.append(
    topbar(ctx, r.title),
    h('div.body', { style: 'text-align:center;padding-top:8vh' },
      h('div', { style: 'font-size:3em' }, up ? '🎊' : '🎉'),
      h('h1', {}, r.title),
      gained > 0 ? h('div.xpgain', {}, `+${gained} XP`) : null,
      up ? h('div.levelup', {}, `レベルアップ！ レベル ${now.level}`) : null,
      h('div.levelbox', {}, h('div', {}, `レベル ${now.level}`), progressBar(now.into / now.need), h('div.muted', {}, `次のレベルまで ${now.need - now.into} XP`)),
      r.earned.length ? h('div.note', { style: 'text-align:left' }, h('b', {}, '🏅 新しいバッジ'), r.earned.map(id => h('div', {}, labels.get(id) || id))) : null),
    h('div.actions', {}, r.buttons.map(b => h(b.primary ? 'button.btn' : 'button.btn2', { onclick: () => ctx.go(b.hash) }, b.label))),
  );
  // 一度出したら消す（後で同じ画面を開いても、古い「+XP」を出さない）
  ctx.reward = null;
}
