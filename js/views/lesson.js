// ユニット画面：解説 → 練習 → 単語 → フレーズ → 発音。「次へ」のたびに再開位置を保存する
import { h, rich } from '../dom.js';
import { setPosition, finishUnit } from '../store.js';
import { dayNumber } from '../srs.js';
import { stagesFor, nextPosition, stageLength, STAGE_NAMES } from '../flow.js';
import { checkChoice, checkOrder, matchSpoken, fillSentence, isSpanish } from '../check.js';
import { speak as say } from '../speech.js';
import { canListen, listen, shouldFallback } from '../speech.js';
import { esLine, sayButton, latamBox, withArt, topbar, progressBar } from './common.js';

export async function render(root, ctx, unitId) {
  const unit = await ctx.content.loadUnit(unitId);
  if (!root.isConnected) return;
  const settings = ctx.state.settings;
  const stages = stagesFor(unit, settings);
  // 位置はユニットごと。古い記録（resume だけ持っている）からも読む
  const r = ctx.state.resume;
  const saved = ctx.state.units[unitId]?.pos || (r?.unitId === unitId ? r : null);
  const pos = saved && stages.includes(saved.stage) && saved.index < stageLength(unit, saved.stage)
    ? { stage: saved.stage, index: saved.index } : { stage: 'explain', index: 0 };
  const cur = ctx.state.units[unitId]?.pos;
  if (!cur || cur.stage !== pos.stage || cur.index !== pos.index || (!ctx.state.units[unitId]?.done && r?.unitId !== unitId)) {
    ctx.setState(st => setPosition(st, unitId, pos.stage, pos.index), { redraw: false });
  }

  // 次へ：単語の段では見た単語を「今日の復習」に登録してから進む
  const advance = () => {
    const next = nextPosition(unit, settings, pos);
    ctx.setState(st => {
      let s = st;
      if (pos.stage === 'words') {
        const w = unit.words[pos.index];
        if (!s.cards[w.id]) s = { ...s, cards: { ...s.cards, [w.id]: { step: -1, due: dayNumber(new Date()) } } };
      }
      return next === 'done' ? finishUnit(s, unitId) : setPosition(s, unitId, next.stage, next.index);
    }, { redraw: next !== 'done', top: true });
    if (next === 'done') ctx.go(`#/done/${unitId}`);
  };

  const total = stages.reduce((n, s) => n + stageLength(unit, s), 0);
  const doneSoFar = stages.slice(0, stages.indexOf(pos.stage)).reduce((n, s) => n + stageLength(unit, s), 0) + pos.index;
  const body = h('div.body');
  const actions = h('div.actions');
  root.append(
    topbar(ctx, `${unit.no} ${unit.title}`, `${STAGE_NAMES[pos.stage]} ${pos.index + 1}/${stageLength(unit, pos.stage)}`),
    progressBar(doneSoFar / total), body, actions);

  const nextBtn = (label = '次へ') => h('button.btn', { onclick: advance }, label);
  const view = { explain, practice, words, phrases, speak }[pos.stage];
  view(ctx, unit, unit[pos.stage][pos.index], body, actions, nextBtn, advance);
}

function explain(ctx, unit, item, body, actions, nextBtn) {
  body.append(
    h('h1', {}, item.title),
    h('p', { html: rich(item.body) }),
    item.examples?.length ? h('div.note', {}, item.examples.map(ex => h('div', { style: 'margin:6px 0' },
      esLine(ctx, ex.es), h('div', {}, ex.ja), ex.note ? h('div.muted', {}, ex.note) : null))) : null,
  );
  actions.append(nextBtn());
}

// 答え合わせの結果欄
function resultBox(ok, title, lines) {
  return h(ok ? 'div.ok' : 'div.ng', {}, h('b', {}, title), ...lines.filter(Boolean).map(l => h('div', { html: rich(l) })));
}

function afterAnswer(ctx, unit, actions, nextBtn, box, body) {
  body.append(box);
  actions.replaceChildren(nextBtn('わかった・次へ'), h('button.btn2', { onclick: () => ctx.go(`#/grammar/${unit.id}/q`) }, '📘 文法ノートで見る'));
  box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function questionHead(ctx, q, body) {
  body.append(h('p', {}, q.prompt));
  if (q.es) body.append(h('div.es', { lang: 'es', style: 'margin:8px 0' }, q.es));
  body.append(h('div.muted', {}, q.ja));
}

function practice(ctx, unit, q, body, actions, nextBtn) {
  questionHead(ctx, q, body);
  if (q.type === 'choice') return choiceQ(ctx, unit, q, body, actions, nextBtn);
  return orderQ(ctx, unit, q, body, actions, nextBtn);
}

const filled = (q, word) => fillSentence(q.es, word);

function choiceQ(ctx, unit, q, body, actions, nextBtn) {
  const correct = q.options.find(o => o.correct);
  const buttons = q.options.map((o, i) => h('button.choice', { lang: 'es', onclick: () => pick(i) }, o.text));
  body.append(h('div', {}, buttons));
  actions.append(h('p.muted', { style: 'text-align:center' }, '答えをタップ'));
  function pick(i) {
    if (isSpanish(q.options[i].text)) say(window, q.options[i].text, ctx.state.settings.rate);
    const res = checkChoice(q, i);
    buttons.forEach((b, j) => { b.disabled = true; if (q.options[j].correct) b.classList.add('right'); });
    if (!res.ok) buttons[i].classList.add('wrong');
    const sentence = q.es ? filled(q, correct.text) : null;
    const box = res.ok
      ? resultBox(true, '◎ 正解', [res.why])
      : resultBox(false, `なぜ「${correct.text}」？`, [res.why, `正解の「${correct.text}」は：${correct.why}`]);
    if (sentence) box.append(esLine(ctx, sentence));
    afterAnswer(ctx, unit, actions, nextBtn, box, body);
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

function orderQ(ctx, unit, q, body, actions, nextBtn) {
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
    afterAnswer(ctx, unit, actions, nextBtn, box, body);
  }
}

function words(ctx, unit, w, body, actions, nextBtn) {
  const back = h('div', { hidden: true }, h('div', { style: 'font-size:1.15em;margin-top:10px' }, w.ja), latamBox(w.latam));
  const gender = w.art === 'el' ? '男性名詞' : w.art === 'la' ? '女性名詞' : '';
  const card = h('div.card.flash', { onclick: () => { back.hidden = false; tapHint.remove(); } },
    esLine(ctx, withArt(w.art, w.es)),
    gender ? h('div.muted', {}, gender) : null,
    back);
  card.querySelector('.esline').style.justifyContent = 'center';
  const tapHint = h('div.muted', { style: 'text-align:center' }, 'タップで意味を表示');
  body.append(h('p.muted', {}, 'このユニットの単語。見た単語は復習に入ります。'), card, tapHint);
  actions.append(nextBtn());
}

function phrases(ctx, unit, p, body, actions, nextBtn) {
  body.append(
    p.scene ? h('p.muted', {}, `場面：${p.scene}`) : null,
    h('div.card', {}, esLine(ctx, p.es), h('div', {}, p.ja), latamBox(p.latam)),
  );
  actions.append(nextBtn());
}

const FALLBACK = {
  unsupported: 'この端末では判定できないので、お手本を聞いて自分で声に出してみましょう。',
  denied: 'マイクが使えないので、判定なしで練習します。お手本を聞いて声に出してみましょう。',
  network: '圏外のため判定できません。お手本を聞いて声に出してみましょう。',
  silent: 'うまく聞き取れないので、判定なしで練習します。お手本を聞いて声に出してみましょう。',
};

function speak(ctx, unit, s, body, actions, nextBtn) {
  const result = h('div');
  let silent = 0;
  const mic = h('button.mic', { 'aria-label': '話す', onclick: talk }, '🎤');
  body.append(
    h('p', {}, 'お手本を聞いて、言ってみよう'),
    h('div.note', {}, h('div.esline', {}, h('span.es', { lang: 'es' }, s.es), sayButton(ctx, s.es, '🔊 ふつう'), sayButton(ctx, s.es, '🐢 ゆっくり', 0.7)), h('div', {}, s.ja)),
    s.tip ? h('p.muted', {}, `💡 ${s.tip}`) : null,
  );
  if (canListen(window)) body.append(mic); else showFallback('unsupported');
  body.append(result);
  actions.append(nextBtn(), h('button.btn2', { onclick: () => skipRest() }, '今は声を出せない → スキップ'));

  function showFallback(reason) {
    mic.remove();
    result.replaceChildren(h('div.note', {}, FALLBACK[reason]));
  }
  async function talk() {
    mic.classList.add('on');
    mic.disabled = true;
    result.replaceChildren(h('p.muted', {}, '聞いています…'));
    const r = await listen(window);
    mic.classList.remove('on');
    mic.disabled = false;
    if (!r.ok) {
      silent = FALLBACK[r.reason] ? silent : silent + 1;
      if (shouldFallback(r.reason, silent)) return showFallback(FALLBACK[r.reason] ? r.reason : 'silent');
      return result.replaceChildren(h('div.ng', {}, '聞き取れませんでした。もう一度どうぞ。'));
    }
    silent = 0;
    const grade = matchSpoken(s.es, r.text);
    const label = { great: '◎ 通じます！', close: '○ おしい！もう一度', retry: 'もう一度言ってみよう' }[grade];
    result.replaceChildren(h(grade === 'great' ? 'div.ok' : 'div.ng', {}, h('div', {}, '聞き取れた文：', h('span', { lang: 'es' }, `「${r.text}」`)), h('b', {}, label)));
  }
  function skipRest() {
    ctx.setState(st => finishUnit(st, unit.id), { redraw: false });
    ctx.go(`#/done/${unit.id}`);
  }
}

export async function renderDone(root, ctx, unitId) {
  const index = await ctx.content.loadIndex();
  if (!root.isConnected) return;
  const at = index.findIndex(u => u.id === unitId);
  const unit = index[at];
  const next = index[at + 1];
  root.append(
    topbar(ctx, unit ? `${unit.no} ${unit.title}` : ''),
    h('div.body', { style: 'text-align:center;padding-top:15vh' },
      h('div', { style: 'font-size:3em' }, '🎉'),
      h('h1', {}, 'ユニット完了！'),
      h('p.muted', {}, 'このユニットの単語は「単語の復習」に入りました。')),
    h('div.actions', {},
      next ? h('button.btn', { onclick: () => ctx.go(`#/u/${next.id}`) }, `次へ：${next.no} ${next.title}`) : null,
      h('button.btn2', { onclick: () => ctx.go('#/') }, 'ホームへ')),
  );
}
