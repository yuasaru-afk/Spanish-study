// 答え合わせ。アクセント記号の抜けは「おしい」として不正解と分ける

export function normalize(s) {
  return String(s)
    .replace(/　/g, ' ')
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
