// 練習問題の部品（レッスン・振り返り・文法ノートの確認問題で共通）
import { h, rich } from '../dom.js';
import { checkChoice, checkOrder, fillSentence, isSpanish } from '../check.js';
import { speak } from '../speech.js';
import { esLine } from './common.js';

// 答えたら onAnswer(ok) を呼び、結果と next ボタン（＋文法ノートへのリンク）を出す
// opts: { next: {label, onclick}, grammarHash?: string, onAnswer(ok) }
export function renderQuestion(ctx, q, body, actions, opts) {
  body.append(h('p', {}, q.prompt));
  if (q.es) body.append(h('div.es', { lang: 'es', style: 'margin:8px 0' }, q.es));
  body.append(h('div.muted', {}, q.ja));
  const done = (ok, box) => {
    opts.onAnswer(ok);
    body.append(box);
    actions.replaceChildren(
      h('button.btn', { onclick: opts.next.onclick }, opts.next.label),
      opts.grammarHash ? h('button.btn2', { onclick: () => ctx.go(opts.grammarHash) }, '📘 文法ノートで見る') : null);
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  if (q.type === 'order') orderQ(ctx, q, body, actions, done);
  else choiceQ(ctx, q, body, actions, done);
}

function resultBox(ok, title, lines) {
  return h(ok ? 'div.ok' : 'div.ng', {}, h('b', {}, title), ...lines.filter(Boolean).map(l => h('div', { html: rich(l) })));
}

function choiceQ(ctx, q, body, actions, done) {
  const correct = q.options.find(o => o.correct);
  const buttons = q.options.map((o, i) => h('button.choice', { lang: 'es', onclick: () => pick(i) }, o.text));
  body.append(h('div', {}, buttons));
  actions.append(h('p.muted', { style: 'text-align:center' }, '答えをタップ'));
  function pick(i) {
    if (isSpanish(q.options[i].text)) speak(window, q.options[i].text, ctx.state.settings.rate);
    const res = checkChoice(q, i);
    buttons.forEach((b, j) => { b.disabled = true; if (q.options[j].correct) b.classList.add('right'); });
    if (!res.ok) buttons[i].classList.add('wrong');
    const box = res.ok
      ? resultBox(true, '◎ 正解', [res.why])
      : resultBox(false, `なぜ「${correct.text}」？`, [res.why, `正解の「${correct.text}」は：${correct.why}`]);
    if (q.es) box.append(esLine(ctx, fillSentence(q.es, correct.text)));
    done(res.ok, box);
  }
}

// 並べ替えの出題順。正解と同じ並びにならないよう決まった手順で崩す
function scramble(tokens) {
  const out = tokens.map((t, i) => ({ t, i }));
  for (let i = out.length - 1; i > 0; i--) {
    const j = (i * 7 + 3) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (out.every((x, i) => x.i === i)) out.reverse();
  return out;
}

function orderQ(ctx, q, body, actions, done) {
  const answer = h('div.tokens', { 'aria-label': 'あなたの答え' });
  const pool = h('div.tokens', { style: 'border-style:solid' });
  const chosen = [];
  const pieces = scramble(q.tokens);
  const check = h('button.btn', { disabled: true, onclick: submit }, '答え合わせ');
  body.append(h('div.muted', {}, 'タップした順に並びます（もう一度タップで戻す）'), answer, pool);
  actions.append(check);
  function draw() {
    answer.replaceChildren(...chosen.map((p, k) => h('button.token', { lang: 'es', onclick: () => { chosen.splice(k, 1); draw(); } }, p.t)));
    pool.replaceChildren(...pieces.filter(p => !chosen.includes(p)).map(p => h('button.token', { lang: 'es', onclick: () => { chosen.push(p); draw(); } }, p.t)));
    check.disabled = chosen.length !== pieces.length;
  }
  draw();
  function submit() {
    const res = checkOrder(q, chosen.map(p => p.t));
    answer.querySelectorAll('button').forEach(b => (b.disabled = true));
    const sentence = q.tokens.join(' ').replace(/¿ /g, '¿').replace(/¡ /g, '¡').replace(/ ([?!.,])/g, '$1');
    const box = resultBox(res.ok, res.ok ? '◎ 正解' : 'なぜ？', [res.ok ? null : '正解の並び：', res.why]);
    box.insertBefore(esLine(ctx, sentence), box.children[1] || null);
    done(res.ok, box);
  }
}
