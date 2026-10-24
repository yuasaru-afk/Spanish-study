import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultState, load, save, setResume, setPosition, finishUnit, touchStreak, exportJson, importJson,
  addXp, recordAnswer, checkWord, completeLesson, completeReview, migrateStage,
} from '../js/store.js';

const fake = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test('初期状態の設定値', () => assert.deepEqual(defaultState().settings, { fontSize: 'm', theme: 'auto', speak: false, rate: 0.9 }));

test('保存データがなければ初期状態', () => assert.deepEqual(load(fake()), defaultState()));

test('壊れた保存データは初期状態', () => assert.deepEqual(load(fake({ 'es-app-v1': '{oops' })), defaultState()));

test('resume を保存して読み直すと同じ位置', () => {
  const s = fake();
  save(s, setResume(defaultState(), 'u03', 'practice', 4));
  assert.deepEqual(load(s).resume, { unitId: 'u03', stage: 'practice', index: 4 });
});

test('setResume は元の状態を変えない', () => {
  const st = defaultState();
  setResume(st, 'u01', 'explain', 0);
  assert.equal(st.resume, null);
});

test('finishUnit で resume が消え done', () => {
  const st = finishUnit(setResume(defaultState(), 'u02', 'words', 3), 'u02');
  assert.equal(st.resume, null);
  assert.deepEqual(st.units.u02, { done: true });
});

test('streak: 同日据え置き・翌日+1・間が空くと1', () => {
  let st = touchStreak(defaultState(), 100);
  assert.deepEqual(st.streak, { lastDay: 100, count: 1 });
  st = touchStreak(st, 100); assert.equal(st.streak.count, 1);
  st = touchStreak(st, 101); assert.equal(st.streak.count, 2);
  st = touchStreak(st, 105); assert.deepEqual(st.streak, { lastDay: 105, count: 1 });
});

test('書き出し→読み込みで同じ', () => {
  const st = setResume(defaultState(), 'u02', 'words', 1);
  st.cards.hola = { step: 2, due: 120 };
  assert.deepEqual(importJson(exportJson(st)), st);
});

test('別物のファイルは例外、元データは無傷', () => {
  const s = fake();
  const st = setResume(defaultState(), 'u02', 'words', 1);
  save(s, st);
  assert.throws(() => importJson('{"foo":1}'), /読み込めません/);
  assert.throws(() => importJson('not json'), /読み込めません/);
  assert.throws(() => importJson('{"version":2,"settings":{},"units":{},"cards":{},"streak":{}}'), /読み込めません/);
  assert.deepEqual(load(s), st);
});

test('setPosition は未完了ユニットの再開位置と続きからを更新', () => {
  const st = setPosition(defaultState(), 'u04', 'practice', 5);
  assert.deepEqual(st.units.u04.pos, { stage: 'practice', index: 5 });
  assert.deepEqual(st.resume, { unitId: 'u04', stage: 'practice', index: 5 });
});

test('終わったユニットを見直しても続きからは消えない', () => {
  let st = setPosition(defaultState(), 'u04', 'practice', 5);
  st = { ...st, units: { ...st.units, u02: { done: true } } };
  st = setPosition(st, 'u02', 'explain', 0);
  assert.deepEqual(st.resume, { unitId: 'u04', stage: 'practice', index: 5 });
  assert.deepEqual(st.units.u02.pos, { stage: 'explain', index: 0 });
});

test('別の未完了ユニットを開いても元のユニットの位置は残る', () => {
  let st = setPosition(defaultState(), 'u04', 'practice', 5);
  st = setPosition(st, 'u05', 'explain', 0);
  assert.deepEqual(st.units.u04.pos, { stage: 'practice', index: 5 });
});

test('finishUnit は他ユニットの続きからを消さない', () => {
  let st = setPosition(defaultState(), 'u04', 'practice', 5);
  st = finishUnit(st, 'u02');
  assert.deepEqual(st.resume, { unitId: 'u04', stage: 'practice', index: 5 });
});

test('中身の壊れた記録は直して読み込む（null のカード・範囲外の設定・壊れた再開位置）', () => {
  const st = importJson(JSON.stringify({ ...defaultState(),
    settings: { fontSize: 3, theme: 'pink', speak: 'yes', rate: 9 },
    cards: { ok: { step: 1, due: 10 }, bad: null, bad2: { step: 'x', due: 1 } },
    units: { u01: { done: true }, u02: null, u03: { done: 'yes' } },
    resume: { unitId: 'u03', stage: 'x', index: -1 } }));
  assert.deepEqual(st.settings, defaultState().settings);
  assert.deepEqual(st.cards, { ok: { step: 1, due: 10 } });
  assert.deepEqual(st.units, { u01: { done: true } });
  assert.equal(st.resume, null);
});

test('load も同じく直す', () => {
  const s = fake({ 'es-app-v1': JSON.stringify({ ...defaultState(), cards: { bad: null } }) });
  assert.deepEqual(load(s).cards, {});
});

test('第2版の追加項目の初期値', () => {
  const d = defaultState();
  assert.deepEqual([d.xp, d.daily, d.answered, d.mistakes, d.badges, d.firstDone, d.sinceReview, d.reviews], [0, {}, {}, [], [], 0, 0, 0]);
});

test('addXp は累計と日ごとに足し、60日より古い日を消す', () => {
  let st = { ...defaultState(), daily: { 30: 5 } };
  st = addXp(st, 10, 100);
  assert.equal(st.xp, 10);
  assert.deepEqual(st.daily, { 100: 10 });
  st = addXp(st, 4, 100);
  assert.deepEqual([st.xp, st.daily[100]], [14, 14]);
});

test('recordAnswer: 同じ問題は同じ日に1回だけ XP、翌日はまた付く', () => {
  let st = recordAnswer(defaultState(), 'u01:0', true, 100);
  st = recordAnswer(st, 'u01:0', true, 100);
  assert.equal(st.xp, 10);
  st = recordAnswer(st, 'u01:0', true, 101);
  assert.equal(st.xp, 20);
});

test('recordAnswer: 間違いは2XPで、間違えた問題に入り、正解で外れる', () => {
  let st = recordAnswer(defaultState(), 'u01:3', false, 100);
  assert.equal(st.xp, 2);
  assert.deepEqual(st.mistakes, ['u01:3']);
  st = recordAnswer(st, 'u01:3', true, 100);
  assert.deepEqual(st.mistakes, []);
});

test('recordAnswer: 確認問題は正解 XP を変えられる', () => assert.equal(recordAnswer(defaultState(), 'u01:0', true, 100, 5).xp, 5));

test('間違えた問題は新しい順で50件まで、重複しない', () => {
  let st = defaultState();
  for (let i = 0; i < 51; i++) st = recordAnswer(st, `u01:${i}`, false, 100);
  st = recordAnswer(st, 'u01:10', false, 101);
  assert.equal(st.mistakes.length, 50);
  assert.equal(st.mistakes[0], 'u01:10');
  assert.ok(!st.mistakes.includes('u01:0'));
  assert.equal(st.mistakes.filter(m => m === 'u01:10').length, 1);
});

test('checkWord: 覚えてた＝明日、忘れてた＝今日、どちらも2XP', () => {
  const a = checkWord(defaultState(), 'hola', true, 100);
  assert.deepEqual([a.cards.hola, a.xp], [{ step: 0, due: 101 }, 2]);
  const b = checkWord(defaultState(), 'hola', false, 100);
  assert.deepEqual(b.cards.hola, { step: 0, due: 100 });
});

test('completeLesson: 初回だけボーナスと数え上げ', () => {
  let st = setPosition(defaultState(), 'u01', 'practice', 3);
  st = completeLesson(st, 'u01', 100);
  assert.deepEqual([st.xp, st.firstDone, st.sinceReview, st.units.u01.done, st.resume], [20, 1, 1, true, null]);
  st = completeLesson(st, 'u01', 101);
  assert.deepEqual([st.xp, st.firstDone, st.sinceReview], [20, 1, 1]);
});

test('completeReview: +30・回数+1・数え直し', () => {
  const st = completeReview({ ...defaultState(), sinceReview: 3 }, 100);
  assert.deepEqual([st.xp, st.reviews, st.sinceReview], [30, 1, 0]);
});

test('migrateStage: 初版の段名を第2版へ', () => {
  assert.deepEqual(['explain', 'practice', 'words', 'phrases', 'speak', 'points'].map(migrateStage),
    ['points', 'practice', 'words', 'words', 'words', 'points']);
});

test('初版の記録を読むと段名が移り、XP は0', () => {
  const v1 = { version: 1, settings: { fontSize: 'l', theme: 'auto', speak: false, rate: 0.9 },
    units: { u01: { done: true }, u03: { done: false, pos: { stage: 'explain', index: 2 } } },
    resume: { unitId: 'u03', stage: 'speak', index: 1 }, cards: { hola: { step: 1, due: 5 } }, streak: { lastDay: 99, count: 4 } };
  const st = load(fake({ 'es-app-v1': JSON.stringify(v1) }));
  assert.equal(st.xp, 0);
  assert.deepEqual(st.units.u03.pos, { stage: 'points', index: 2 });
  assert.equal(st.resume.stage, 'words');
  assert.deepEqual([st.units.u01, st.cards.hola, st.streak.count, st.settings.fontSize], [{ done: true }, { step: 1, due: 5 }, 4, 'l']);
});

test('単語段の対象語 ids は残し、壊れた中身は捨てる', () => {
  const s = { ...defaultState(), units: { u02: { done: false, pos: { stage: 'words', index: 1, ids: ['casa', 3, 'mesa'] } } },
    xp: 'x', mistakes: ['u01:1', 5], badges: ['words25', null], answered: { 'u01:1': 100, bad: 'x' } };
  const st = importJson(JSON.stringify(s));
  assert.deepEqual(st.units.u02.pos, { stage: 'words', index: 1, ids: ['casa', 'mesa'] });
  assert.deepEqual([st.xp, st.mistakes, st.badges, st.answered], [0, ['u01:1'], ['words25'], { 'u01:1': 100 }]);
});
