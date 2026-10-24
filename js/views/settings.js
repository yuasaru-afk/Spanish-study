import { h } from '../dom.js';
import { exportJson, importJson } from '../store.js';
import { speak } from '../speech.js';

const FONTS = [['s', '小'], ['m', '中'], ['l', '大'], ['xl', '特大']];
const THEMES = [['auto', '自動'], ['light', 'オフ'], ['dark', 'オン']];
const SPEAK = [[false, 'オフ'], [true, 'オン']];
const RATES = [[0.7, 'ゆっくり'], [0.9, 'ふつう'], [1.0, '速め']];

function seg(options, current, onPick) {
  return h('div.seg', {}, options.map(([value, label]) =>
    h('button', { 'aria-pressed': String(value === current), onclick: () => onPick(value) }, label)));
}

async function exportBackup(win, state, msg) {
  const json = exportJson(state);
  const name = `spanish-backup-${new Date().toISOString().slice(0, 10)}.json`;
  try {
    const file = new win.File([json], name, { type: 'application/json' });
    if (win.navigator.canShare?.({ files: [file] })) {
      await win.navigator.share({ files: [file] });
      msg.textContent = '書き出しました。';
      return;
    }
  } catch (err) {
    if (err?.name === 'AbortError') return;
  }
  const a = h('a', { href: URL.createObjectURL(new Blob([json], { type: 'application/json' })), download: name });
  a.click();
  msg.textContent = '書き出しました。';
}

export function render(root, ctx) {
  const s = ctx.state.settings;
  const set = patch => ctx.setState(st => ({ ...st, settings: { ...st.settings, ...patch } }));
  const msg = h('p.msg.muted');
  const fileInput = h('input', {
    type: 'file', accept: '.json,application/json', hidden: true,
    onchange: async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        const next = importJson(await file.text());
        ctx.setState(() => next);
      } catch (err) {
        msg.textContent = err.message;
      }
      fileInput.value = '';
    },
  });

  root.append(
    h('div.topbar', {}, h('button.back', { onclick: () => ctx.go('#/') }, '‹ ホーム'), h('span.title', {}, '設定')),
    h('div.body', {},
      h('h2', {}, '文字の大きさ'), seg(FONTS, s.fontSize, v => set({ fontSize: v })),
      h('h2', {}, 'ダークモード'), seg(THEMES, s.theme, v => set({ theme: v })),
      h('h2', {}, '発音練習（声に出す）'), seg(SPEAK, s.speak, v => set({ speak: v })),
      h('h2', {}, '読み上げの速さ'), seg(RATES, s.rate, v => { set({ rate: v }); speak(window, 'Hola, ¿qué tal?', v); }),
      h('h2', {}, '学習記録のバックアップ'),
      h('p.muted', {}, '記録はこの iPhone の中だけにあります。機種変更の前などに書き出してください。'),
      h('button.btn2', { onclick: () => exportBackup(window, ctx.state, msg) }, '書き出す'),
      h('div', { style: 'height:8px' }),
      h('button.btn2', { onclick: () => fileInput.click() }, '読み込む'),
      fileInput, msg,
    ),
  );
}
