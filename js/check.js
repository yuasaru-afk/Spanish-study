// 答え合わせ。アクセント記号の抜けは「おしい」として不正解と分ける

export function normalize(s) {
  // NFKC：全角の英字・記号・空白を半角に、分解されたアクセントを1文字にまとめる
  return String(s)
    .normalize('NFKC')
    .trim()
    .replace(/^[¿¡]+/, '')
    .replace(/[.!?。]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// á→a などを外す。ñ は別の文字なので残す
export function stripAccents(s) {
  return s.replace(/[áàéèíìóòúùü]/gi, ch => ch.normalize('NFD')[0]);
}

export function checkChoice(q, optionIndex) {
  const o = q.options[optionIndex];
  return { ok: o.correct === true, why: o.why };
}

export function checkOrder(q, tokens) {
  const same = seq => seq.length === tokens.length && seq.every((t, i) => t === tokens[i]);
  return { ok: [q.tokens, ...(q.accept || [])].some(same), why: q.why };
}

export function checkFill(q, input) {
  const got = normalize(input);
  const answers = q.answers.map(normalize);
  if (answers.includes(got)) return { ok: true, nearly: false, why: q.why };
  const nearly = answers.some(a => stripAccents(a) === stripAccents(got));
  return { ok: false, nearly, why: q.why };
}

const words = s => stripAccents(normalize(s)).replace(/[¿¡.,!?;:"]/g, ' ').split(/\s+/).filter(Boolean);

export function matchSpoken(target, heard) {
  const t = words(target);
  const h = new Set(words(heard));
  const rate = t.length ? t.filter(w => h.has(w)).length / t.length : 0;
  if (rate >= 0.8) return 'great';
  if (rate >= 0.5) return 'close';
  return 'retry';
}

// 穴埋めの答えを入れた完成文（表示と読み上げ用）。文頭なら大文字に、（ヒント）は外す
export function fillSentence(es, word) {
  const s = es.replace(/（[^）]*）/g, '');
  const atStart = /^[¿¡]?___/.test(s);
  return s.replace('___', atStart ? word.charAt(0).toUpperCase() + word.slice(1) : word);
}

// 読み上げてよいスペイン語の文か（日本語の文字を含むものは読まない）
export function isSpanish(s) {
  return !/[぀-ヿ㐀-鿿！-｠]/.test(s);
}
