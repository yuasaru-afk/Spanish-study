// ユニット内の進み方（DOM に触らない）
export const STAGE_NAMES = { explain: '解説', practice: '練習', words: '単語', phrases: 'フレーズ', speak: '発音' };

export function stagesFor(unit, settings) {
  const stages = ['explain', 'practice', 'words'];
  if (unit.phrases.length) stages.push('phrases');
  if (settings.speak && unit.speak.length) stages.push('speak');
  return stages;
}

export const stageLength = (unit, stage) => unit[stage].length;

export function nextPosition(unit, settings, { stage, index }) {
  const stages = stagesFor(unit, settings);
  const at = stages.indexOf(stage);
  if (at === -1) return 'done';
  if (index + 1 < stageLength(unit, stage)) return { stage, index: index + 1 };
  return at + 1 < stages.length ? { stage: stages[at + 1], index: 0 } : 'done';
}

export function isUnlocked(index, units, unitId) {
  const at = index.findIndex(u => u.id === unitId);
  return at === 0 || (at > 0 && Boolean(units[index[at - 1].id]?.done));
}
