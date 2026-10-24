import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayNumber, gradeCard, dueWordIds, LADDER } from '../js/srs.js';

test('LADDER は 1,3,7,14,30,60', () => assert.deepEqual(LADDER, [1, 3, 7, 14, 30, 60]));

test('good を重ねると 1,3,7 日後', () => {
  let c;
  c = gradeCard(c, 'good', 100); assert.equal(c.due, 101);
  c = gradeCard(c, 'good', 101); assert.equal(c.due, 104);
  c = gradeCard(c, 'good', 104); assert.equal(c.due, 111);
});

test('新規登録 {step:-1} からの good は 1 日後', () => assert.deepEqual(gradeCard({ step: -1, due: 100 }, 'good', 100), { step: 0, due: 101 }));

test('hard は step 据え置き', () => assert.deepEqual(gradeCard({ step: 2, due: 90 }, 'hard', 100), { step: 2, due: 107 }));

test('新規の hard は step 0', () => assert.deepEqual(gradeCard(undefined, 'hard', 100), { step: 0, due: 101 }));

test('again は step 0・今日', () => assert.deepEqual(gradeCard({ step: 3, due: 90 }, 'again', 100), { step: 0, due: 100 }));

test('上限は 60 日', () => assert.equal(gradeCard({ step: 5, due: 0 }, 'good', 100).due, 160));

test('dueWordIds は古い順で未来を含まない', () => assert.deepEqual(
  dueWordIds({ a: { step: 1, due: 99 }, b: { step: 0, due: 95 }, c: { step: 0, due: 101 } }, 100), ['b', 'a']));

test('dayNumber は現地0時で切替', () => {
  assert.equal(dayNumber(new Date(2026, 9, 24, 23, 59)) + 1, dayNumber(new Date(2026, 9, 25, 0, 1)));
  assert.equal(dayNumber(new Date(2026, 9, 24, 0, 1)), dayNumber(new Date(2026, 9, 24, 23, 59)));
});
