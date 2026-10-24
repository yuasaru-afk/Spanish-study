// 学習記録。端末の localStorage だけに置く。状態は毎回新しいオブジェクトで返す
import { XP } from './progress.js';
import { gradeCard } from './srs.js';

const KEY = 'es-app-v1';

export function defaultState() {
  return {
    version: 1,
    settings: { fontSize: 'm', theme: 'auto', speak: false, rate: 0.9 },
    units: {},
    resume: null,
    cards: {},
    streak: { lastDay: null, count: 0 },
    xp: 0,
    daily: {},
    answered: {},
    mistakes: [],
    badges: [],
    firstDone: 0,
    sinceReview: 0,
    reviews: 0,
  };
}

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function looksLikeState(s) {
  return isObj(s) && s.version === 1 && isObj(s.settings) && isObj(s.units)
    && isObj(s.cards) && isObj(s.streak) && (s.resume === null || isObj(s.resume));
}

// 初版の段名（explain/words/phrases/speak）も受け付けて、第2版の段名に移す
export function migrateStage(stage) {
  if (stage === 'explain') return 'points';
  if (stage === 'phrases' || stage === 'speak') return 'words';
  return stage;
}

const ALLOWED = { fontSize: ['s', 'm', 'l', 'xl'], theme: ['auto', 'light', 'dark'], speak: [false, true], rate: [0.7, 0.9, 1.0] };
const STAGES = ['points', 'practice', 'words', 'explain', 'phrases', 'speak'];
const isPos = p => isObj(p) && STAGES.includes(p.stage) && Number.isInteger(p.index) && p.index >= 0;
const isCount = n => Number.isInteger(n) && n >= -1;
const nat = n => (Number.isInteger(n) && n >= 0 ? n : 0);
const strings = a => (Array.isArray(a) ? a.filter(x => typeof x === 'string') : []);

function cleanPos(p) {
  const pos = { stage: migrateStage(p.stage), index: p.index };
  if (Array.isArray(p.ids)) pos.ids = strings(p.ids);
  return pos;
}

// 形は合っていても中身がおかしい記録（手で直したファイルなど）を、壊れない値に直す。
// 無い項目（初版の記録・後から足した項目）は初期値で埋める
function sanitize(s) {
  const d = defaultState();
  const settings = Object.fromEntries(Object.entries(d.settings).map(([k, v]) => [k, ALLOWED[k].includes(s.settings[k]) ? s.settings[k] : v]));
  const cards = Object.fromEntries(Object.entries(s.cards).filter(([, c]) => isObj(c) && isCount(c.step) && Number.isFinite(c.due)));
  const units = {};
  for (const [id, u] of Object.entries(s.units)) {
    if (!isObj(u) || typeof u.done !== 'boolean') continue;
    units[id] = isPos(u.pos) ? { done: u.done, pos: cleanPos(u.pos) } : { done: u.done };
  }
  const r = s.resume;
  const resume = isPos(r) && typeof r.unitId === 'string' ? { unitId: r.unitId, stage: migrateStage(r.stage), index: r.index } : null;
  const streak = Number.isFinite(s.streak.lastDay) && Number.isInteger(s.streak.count) ? { lastDay: s.streak.lastDay, count: s.streak.count } : d.streak;
  const dayMap = m => (isObj(m) ? Object.fromEntries(Object.entries(m).filter(([, v]) => Number.isFinite(v))) : {});
  return {
    version: 1, settings, units, resume, cards, streak,
    xp: nat(s.xp),
    daily: dayMap(s.daily),
    answered: dayMap(s.answered),
    mistakes: strings(s.mistakes).slice(0, MAX_MISTAKES),
    badges: strings(s.badges),
    firstDone: nat(s.firstDone),
    sinceReview: nat(s.sinceReview),
    reviews: nat(s.reviews),
  };
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

// ユニットごとに位置を持つ。「続きから」は終わっていないユニットだけを指す。
// ids は単語チェック段の対象語（段に入った時に決めたもの）
export function setPosition(state, unitId, stage, index, ids) {
  const unit = state.units[unitId] || { done: false };
  const pos = ids ? { stage, index, ids } : { stage, index };
  const next = { ...state, units: { ...state.units, [unitId]: { ...unit, pos } } };
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

const KEEP_DAYS = 60;
const MAX_MISTAKES = 50;

export function addXp(state, amount, today) {
  const daily = Object.fromEntries(Object.entries(state.daily).filter(([d]) => Number(d) > today - KEEP_DAYS));
  daily[today] = (daily[today] || 0) + amount;
  return { ...state, xp: state.xp + amount, daily };
}

// 練習・確認問題の答え。XP は1問につき1日1回まで。間違えた問題は1回正解で外す
export function recordAnswer(state, qid, correct, today, xpCorrect = XP.correct) {
  let s = state;
  if (s.answered[qid] !== today) {
    s = addXp({ ...s, answered: { ...s.answered, [qid]: today } }, correct ? xpCorrect : XP.wrong, today);
  }
  const rest = s.mistakes.filter(m => m !== qid);
  return { ...s, mistakes: correct ? rest : [qid, ...rest].slice(0, MAX_MISTAKES) };
}

export function checkWord(state, wordId, remembered, today) {
  const cards = { ...state.cards, [wordId]: gradeCard(state.cards[wordId], remembered ? 'good' : 'again', today) };
  return addXp({ ...state, cards }, XP.word, today);
}

// 完了ボーナス・バッジ・振り返りの数え上げは初回完了の時だけ
export function completeLesson(state, unitId, today) {
  const first = !state.units[unitId]?.done;
  const s = finishUnit(state, unitId);
  if (!first) return s;
  return addXp({ ...s, firstDone: s.firstDone + 1, sinceReview: s.sinceReview + 1 }, XP.lesson, today);
}

export function completeReview(state, today) {
  return addXp({ ...state, reviews: state.reviews + 1, sinceReview: 0 }, XP.review, today);
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
