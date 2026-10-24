// iPhone の Safari で開いている時だけ、初回に「ホーム画面に追加」を案内する
import { h } from '../dom.js';

const KEY = 'es-app-install-hint';

export function maybeShowInstallHint(win) {
  const ua = win.navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/.test(ua);
  if (!ios || win.navigator.standalone) return;
  try { if (win.localStorage.getItem(KEY)) return; } catch { /* 保存できなくても案内は出す */ }
  const box = h('div.hint', {},
    h('b', {}, 'ホーム画面に追加してください'),
    h('p', {}, '下の共有ボタン（□に↑）→「ホーム画面に追加」。アプリのように開けて、圏外でも使えます。追加しないと、しばらく使わない間に学習記録が消えることがあります。'),
    h('button.btn2', { onclick: () => { try { win.localStorage.setItem(KEY, '1'); } catch { /* 次回また出るだけ */ } box.remove(); } }, 'わかった'),
  );
  win.document.body.append(box);
}
