// 学習記録。端末の localStorage だけに置く。状態は毎回新しいオブジェクトで返す
const KEY = 'es-app-v1';

export function defaultState() {
  return {
    version: 1,
    settings: { fontSize: 'm', theme: 'auto', speak: false, rate: 0.9 },
    units: {},
    resume: null,
    cards: {},
    streak: { lastDay: null, count: 0 },
  };
}

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function looksLikeState(s) {
  return isObj(s) && s.version === 1 && isObj(s.settings) && isObj(s.units)
    && isObj(s.cards) && isObj(s.streak) && (s.resume === null || isObj(s.resume));
}

// 保存データに無い設定項目（後から足したもの）は初期値で埋める
function withDefaults(s) {
  const d = defaultState();
  return { ...d, ...s, settings: { ...d.settings, ...s.settings }, streak: { ...d.streak, ...s.streak } };
}

export function load(storage) {
  try {
    const s = JSON.parse(storage.getItem(KEY));
    return looksLikeState(s) ? withDefaults(s) : defaultState();
  } catch {
    return defaultState();
  }
}

export function save(storage, state) {
  storage.setItem(KEY, JSON.stringify(state));
}

export function setResume(state, unitId, stage, index) {
  return { ...state, resume: { unitId, stage, index } };
}

export function finishUnit(state, unitId) {
  return { ...state, units: { ...state.units, [unitId]: { done: true } }, resume: null };
}

export function touchStreak(state, today) {
  const { lastDay, count } = state.streak;
  if (lastDay === today) return state;
  return { ...state, streak: { lastDay: today, count: lastDay === today - 1 ? count + 1 : 1 } };
}

export function exportJson(state) {
  return JSON.stringify(state, null, 1);
}

export function importJson(text) {
  let s;
  try { s = JSON.parse(text); } catch { s = null; }
  if (!looksLikeState(s)) throw new Error('このファイルは読み込めません');
  return withDefaults(s);
}
