// XP・レベル・バッジ・単語の状態（DOM に触らない）
export const XP = { correct: 10, wrong: 2, word: 2, lesson: 20, review: 30, grammar: 5 };

// レベル n → n+1 に必要な XP は 100 + 20×(n−1)
export function levelInfo(xp) {
  let level = 1;
  let rest = xp;
  let need = 100;
  while (rest >= need) {
    rest -= need;
    level += 1;
    need = 100 + 20 * (level - 1);
  }
  return { level, into: rest, need };
}

// 記録なし＝まだ／step −1〜0＝あやしい／別の日にもう一度○（step 1 以上）＝覚えた
export function wordStatus(card) {
  if (!card) return 'new';
  return card.step >= 1 ? 'learned' : 'shaky';
}

export const learnedCount = cards => Object.values(cards).filter(c => wordStatus(c) === 'learned').length;

const badge = (id, label, key, n) => ({ id, label, test: s => s[key] >= n });

export const BADGES = [
  badge('words25', '単語 25語', 'learned', 25),
  badge('words50', '単語 50語', 'learned', 50),
  badge('words100', '単語 100語', 'learned', 100),
  badge('words200', '単語 200語', 'learned', 200),
  badge('streak3', '3日連続', 'streak', 3),
  badge('streak7', '7日連続', 'streak', 7),
  badge('streak30', '30日連続', 'streak', 30),
  badge('units3', 'ユニット 3 完了', 'firstDone', 3),
  badge('units5', 'ユニット 5 完了', 'firstDone', 5),
  badge('units10', 'ユニット 10 完了', 'firstDone', 10),
  badge('review1', '振り返り 1回', 'reviews', 1),
  badge('review5', '振り返り 5回', 'reviews', 5),
];

export function newBadges(have, stats) {
  return BADGES.filter(b => !have.includes(b.id) && b.test(stats)).map(b => b.id);
}
