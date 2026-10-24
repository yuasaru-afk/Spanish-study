import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XP, levelInfo, wordStatus, learnedCount, newBadges, BADGES, levelUp } from '../js/progress.js';

test('XP の値', () => assert.deepEqual(XP, { correct: 10, wrong: 2, word: 2, lesson: 20, review: 30, grammar: 5 }));

test('levelInfo: 0XP はレベル1、次まで100', () => assert.deepEqual(levelInfo(0), { level: 1, into: 0, need: 100 }));

test('levelInfo: 100XP でレベル2、次まで120', () => assert.deepEqual(levelInfo(100), { level: 2, into: 0, need: 120 }));

test('levelInfo: 219XP はレベル2の途中', () => assert.deepEqual(levelInfo(219), { level: 2, into: 119, need: 120 }));

test('levelInfo: 220XP でレベル3', () => assert.equal(levelInfo(220).level, 3));

test('wordStatus', () => {
  assert.equal(wordStatus(undefined), 'new');
  assert.equal(wordStatus({ step: -1, due: 1 }), 'shaky');
  assert.equal(wordStatus({ step: 0, due: 1 }), 'shaky');
  assert.equal(wordStatus({ step: 1, due: 1 }), 'learned');
});

test('learnedCount は step 1 以上を数える', () => assert.equal(
  learnedCount({ a: { step: 0, due: 1 }, b: { step: 1, due: 1 }, c: { step: 4, due: 1 } }), 2));

test('バッジは12種類（単語4・連続3・ユニット3・振り返り2）', () => assert.equal(BADGES.length, 12));

test('newBadges: 達成したものだけ', () => assert.deepEqual(
  newBadges([], { learned: 25, streak: 3, firstDone: 0, reviews: 0 }), ['words25', 'streak3']));

test('newBadges: 持っているものは返さない', () => assert.deepEqual(
  newBadges(['words25'], { learned: 60, streak: 0, firstDone: 3, reviews: 1 }), ['words50', 'units3', 'review1']));

test('levelUp: 前に見せたレベルより上がっていれば新しいレベル、そうでなければ null', () => {
  assert.equal(levelUp(1, 100), 2);
  assert.equal(levelUp(2, 150), null);
  assert.equal(levelUp(1, 50), null);
});
