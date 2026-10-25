import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stagesFor, nextPosition, stageLength, isUnlocked, pickCheckWords, buildReview, grammarQuiz, startPosition, prevPosition } from '../js/flow.js';

const base = JSON.parse(readFileSync(new URL('./fixtures/good-unit.json', import.meta.url), 'utf8'));
const words = n => Array.from({ length: n }, (_, i) => ({ id: `w${i}`, es: `p${i}`, art: null, ja: 'x' }));
const u = { ...base, points: { lines: ['a'], examples: [] }, words: words(10) };

test('段の順は 文法→練習→単語', () => assert.deepEqual(stagesFor(u, ['w0']), ['points', 'practice', 'words']));

test('単語の対象が無ければ単語段を出さない', () => assert.deepEqual(stagesFor(u, []), ['points', 'practice']));

test('points が無い教材は練習から', () => assert.deepEqual(stagesFor({ ...u, points: undefined }, ['w0']), ['practice', 'words']));

test('pickCheckWords: 記録のある語を除いて最大8', () => {
  assert.deepEqual(pickCheckWords(u, { w1: { step: 0, due: 1 } }), ['w0', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8']);
});

test('単語段の長さは段に入った時の ids で決まる（記録が付いてもずれない）', () => {
  const ids = pickCheckWords(u, {});
  assert.equal(stageLength(u, 'words', ids), 8);
  assert.deepEqual(nextPosition(u, ids, { stage: 'words', index: 6 }), { stage: 'words', index: 7 });
  assert.equal(nextPosition(u, ids, { stage: 'words', index: 7 }), 'done');
});

test('文法の要点は1画面、その次は練習の0', () => {
  assert.equal(stageLength(u, 'points', []), 1);
  assert.deepEqual(nextPosition(u, ['w0'], { stage: 'points', index: 0 }), { stage: 'practice', index: 0 });
});

test('練習の最後の次は単語の0、単語が無ければ done', () => {
  const last = { stage: 'practice', index: u.practice.length - 1 };
  assert.deepEqual(nextPosition(u, ['w0'], last), { stage: 'words', index: 0 });
  assert.equal(nextPosition(u, [], last), 'done');
});

test('u01 は常に開放、他は前が done で開放', () => {
  const index = [{ id: 'u01' }, { id: 'u02' }];
  assert.equal(isUnlocked(index, {}, 'u01'), true);
  assert.equal(isUnlocked(index, {}, 'u02'), false);
  assert.equal(isUnlocked(index, { u01: { done: true } }, 'u02'), true);
});

const unitWith = (id, nq, wordIds) => ({ id, practice: Array.from({ length: nq }, () => ({ type: 'choice' })), words: wordIds.map(w => ({ id: w })) });

test('buildReview: 間違い6問＋復習の単語4語', () => {
  const doneUnits = [unitWith('u01', 10, ['a', 'b', 'c', 'd', 'e'])];
  const mistakes = Array.from({ length: 8 }, (_, i) => `u01:${i}`);
  const cards = { a: { step: 0, due: 100 }, b: { step: 0, due: 99 }, c: { step: 0, due: 100 }, d: { step: 1, due: 100 }, e: { step: 0, due: 101 } };
  const items = buildReview({ mistakes, cards, doneUnits, today: 100 });
  assert.equal(items.filter(x => x.kind === 'q').length, 6);
  assert.deepEqual(items.filter(x => x.kind === 'w').map(x => x.wordId), ['b', 'a', 'c', 'd']);
  assert.deepEqual(items[0], { kind: 'q', qid: 'u01:0', unitId: 'u01', index: 0 });
});

test('buildReview: 間違いも単語も無ければ終えたユニットの問題で10問', () => {
  const items = buildReview({ mistakes: [], cards: {}, doneUnits: [unitWith('u01', 6, []), unitWith('u02', 6, [])], today: 100 });
  assert.equal(items.length, 10);
  assert.equal(new Set(items.map(x => x.qid)).size, 10);
});

test('buildReview: 終えたユニットが無ければ空', () => assert.deepEqual(buildReview({ mistakes: ['u01:1'], cards: {}, doneUnits: [], today: 100 }), []));

test('buildReview: 終えたユニットに無い問題の間違いは使わない', () => {
  const items = buildReview({ mistakes: ['u05:1'], cards: {}, doneUnits: [unitWith('u01', 3, [])], today: 100 });
  assert.ok(items.every(x => x.unitId === 'u01'));
  assert.equal(items.length, 3);
});

test('grammarQuiz: 同じ日は同じ3問、少なければ全部', () => {
  const q = grammarQuiz(unitWith('u01', 9, []), 100);
  assert.equal(q.length, 3);
  assert.deepEqual(q, grammarQuiz(unitWith('u01', 9, []), 100));
  assert.deepEqual(grammarQuiz(unitWith('u01', 2, []), 100), [0, 1]);
});

test('startPosition: 記録がなければ最初の段', () => assert.deepEqual(
  startPosition(u, null, {}), { pos: { stage: 'points', index: 0 }, wordIds: pickCheckWords(u, {}) }));

test('startPosition: 単語段で ids を持っていればそのまま', () => assert.deepEqual(
  startPosition(u, { stage: 'words', index: 1, ids: ['w3', 'w4'] }, {}), { pos: { stage: 'words', index: 1 }, wordIds: ['w3', 'w4'] }));

test('startPosition: 単語段なのに確認する語が残っていなければ finish（最初に戻さない）', () => {
  const cards = Object.fromEntries(u.words.map(w => [w.id, { step: 0, due: 1 }]));
  assert.equal(startPosition(u, { stage: 'words', index: 0 }, cards), 'finish');
});

test('prevPosition: 段の中は1つ前、段の先頭は前の段の最後、最初は null', () => {
  const ids = ['w0', 'w1'];
  assert.deepEqual(prevPosition(u, ids, { stage: 'practice', index: 2 }), { stage: 'practice', index: 1 });
  assert.deepEqual(prevPosition(u, ids, { stage: 'words', index: 0 }), { stage: 'practice', index: u.practice.length - 1 });
  assert.deepEqual(prevPosition(u, ids, { stage: 'practice', index: 0 }), { stage: 'points', index: 0 });
  assert.equal(prevPosition(u, ids, { stage: 'points', index: 0 }), null);
});
