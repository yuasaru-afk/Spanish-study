// レッスンの進み方・単語チェックの対象・振り返りの組み立て（DOM に触らない）
export const STAGE_NAMES = { points: '文法', practice: '練習', words: '単語' };

const CHECK_WORDS = 8;

// 単語チェックの対象：記録のまだ無い語を教材順に最大8。段に入った時に決めて pos.ids に保存する
export function pickCheckWords(unit, cards, max = CHECK_WORDS) {
  return unit.words.filter(w => !cards[w.id]).slice(0, max).map(w => w.id);
}

export function stagesFor(unit, wordIds) {
  const stages = [];
  if (unit.points) stages.push('points');
  if (unit.practice.length) stages.push('practice');
  if (wordIds.length) stages.push('words');
  return stages;
}

export function stageLength(unit, stage, wordIds) {
  if (stage === 'points') return 1;
  if (stage === 'words') return wordIds.length;
  return unit[stage]?.length ?? 0;
}

export function nextPosition(unit, wordIds, { stage, index }) {
  const stages = stagesFor(unit, wordIds);
  const at = stages.indexOf(stage);
  if (at === -1) return 'done';
  if (index + 1 < stageLength(unit, stage, wordIds)) return { stage, index: index + 1 };
  return at + 1 < stages.length ? { stage: stages[at + 1], index: 0 } : 'done';
}

export function isUnlocked(index, units, unitId) {
  const at = index.findIndex(u => u.id === unitId);
  return at === 0 || (at > 0 && Boolean(units[index[at - 1].id]?.done));
}

const REVIEW_MISTAKES = 6;
const REVIEW_WORDS = 4;

// 振り返り：間違えた問題 → 今日の復習の単語 → 足りなければ終えたユニットの問題（日ごとにずらす）
export function buildReview({ mistakes, cards, doneUnits, today, size = 10 }) {
  if (!doneUnits.length) return [];
  const byId = new Map(doneUnits.map(u => [u.id, u]));
  const q = qid => {
    const [unitId, i] = qid.split(':');
    return { kind: 'q', qid, unitId, index: Number(i) };
  };
  const items = mistakes.map(q).filter(x => byId.get(x.unitId)?.practice[x.index]).slice(0, REVIEW_MISTAKES);

  const unitWords = new Set(doneUnits.flatMap(u => u.words.map(w => w.id)));
  const dueWords = Object.entries(cards)
    .filter(([id, c]) => unitWords.has(id) && c.due <= today)
    .sort((a, b) => a[1].due - b[1].due)
    .slice(0, Math.min(REVIEW_WORDS, size - items.length))
    .map(([wordId]) => ({ kind: 'w', wordId }));

  const all = doneUnits.flatMap(u => u.practice.map((_, i) => `${u.id}:${i}`));
  const taken = new Set(items.map(x => x.qid));
  const fill = [];
  for (let k = 0; k < all.length && items.length + fill.length + dueWords.length < size; k++) {
    const qid = all[(today * 7 + k) % all.length];
    if (!taken.has(qid)) { taken.add(qid); fill.push(q(qid)); }
  }
  return [...items, ...fill, ...dueWords];
}

// 文法ノートの確認問題：その日に応じてずらした n 問の番号
export function grammarQuiz(unit, today, n = 3) {
  const len = unit.practice.length;
  if (len <= n) return unit.practice.map((_, i) => i);
  return Array.from({ length: n }, (_, k) => (today * n + k) % len);
}
