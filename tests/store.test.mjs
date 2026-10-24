import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultState, load, save, setResume, setPosition, finishUnit, touchStreak, exportJson, importJson,
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
