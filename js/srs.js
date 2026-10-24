// 単語の復習間隔（日数）。good で1段上がり、hard は据え置き、again は最初から
export const LADDER = [1, 3, 7, 14, 30, 60];

// 端末の現地日付の通し日（現地の0時で切り替わる）
export function dayNumber(date) {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

export function gradeCard(card, grade, today) {
  const prev = card ? card.step : -1;
  if (grade === 'again') return { step: 0, due: today };
  const step = grade === 'good' ? Math.min(prev + 1, LADDER.length - 1) : Math.max(prev, 0);
  return { step, due: today + LADDER[step] };
}

export function dueWordIds(cards, today) {
  return Object.entries(cards)
    .filter(([, c]) => c.due <= today)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => id);
}
