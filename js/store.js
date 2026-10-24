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

const ALLOWED = { fontSize: ['s', 'm', 'l', 'xl'], theme: ['auto', 'light', 'dark'], speak: [false, true], rate: [0.7, 0.9, 1.0] };
const STAGES = ['explain', 'practice', 'words', 'phrases', 'speak'];
const isPos = p => isObj(p) && STAGES.includes(p.stage) && Number.isInteger(p.index) && p.index >= 0;
const isCount = n => Number.isInteger(n) && n >= -1;

// 形は合っていても中身がおかしい記録（手で直したファイルなど）を、壊れない値に直す。
// 無い設定項目（後から足したもの）も初期値で埋める
function sanitize(s) {
  const d = defaultState();
  const settings = Object.fromEntries(Object.entries(d.settings).map(([k, v]) => [k, ALLOWED[k].includes(s.settings[k]) ? s.settings[k] : v]));
  const cards = Object.fromEntries(Object.entries(s.cards).filter(([, c]) => isObj(c) && isCount(c.step) && Number.isFinite(c.due)));
  const units = {};
  for (const [id, u] of Object.entries(s.units)) {
    if (!isObj(u) || typeof u.done !== 'boolean') continue;
    units[id] = isPos(u.pos) ? { done: u.done, pos: { stage: u.pos.stage, index: u.pos.index } } : { done: u.done };
  }
  const r = s.resume;
  const resume = isPos(r) && typeof r.unitId === 'string' ? { unitId: r.unitId, stage: r.stage, index: r.index } : null;
  const streak = Number.isFinite(s.streak.lastDay) && Number.isInteger(s.streak.count) ? { lastDay: s.streak.lastDay, count: s.streak.count } : d.streak;
  return { version: 1, settings, units, resume, cards, streak };
}

export function load(storage) {
  try {
    const s = JSON.parse(storage.getItem(KEY));
    return looksLikeState(s) ? sanitize(s) : defaultState();
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

// ユニットごとに位置を持つ。「続きから」は終わっていないユニットだけを指す
export function setPosition(state, unitId, stage, index) {
  const unit = state.units[unitId] || { done: false };
  const next = { ...state, units: { ...state.units, [unitId]: { ...unit, pos: { stage, index } } } };
  return unit.done ? next : setResume(next, unitId, stage, index);
}

export function finishUnit(state, unitId) {
  return {
    ...state,
    units: { ...state.units, [unitId]: { done: true } },
    resume: state.resume?.unitId === unitId ? null : state.resume,
  };
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
  return sanitize(s);
}
