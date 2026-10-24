import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stagesFor, nextPosition, stageLength, isUnlocked } from '../js/flow.js';

const u = JSON.parse(readFileSync(new URL('./fixtures/good-unit.json', import.meta.url), 'utf8'));

test('基本の段の順', () => assert.deepEqual(stagesFor(u, { speak: false }), ['explain', 'practice', 'words', 'phrases']));

test('phrases が空なら飛ばす', () => assert.deepEqual(stagesFor({ ...u, phrases: [] }, { speak: false }), ['explain', 'practice', 'words']));

test('発音オンで speak が最後', () => assert.equal(stagesFor(u, { speak: true }).at(-1), 'speak'));

test('speak が空なら発音オンでも出さない', () => assert.ok(!stagesFor({ ...u, speak: [] }, { speak: true }).includes('speak')));

test('段の中は index+1', () => assert.deepEqual(
  nextPosition({ ...u, practice: [...u.practice] }, { speak: false }, { stage: 'practice', index: 0 }), { stage: 'practice', index: 1 }));

test('段の最後の次は次の段の0', () => assert.deepEqual(
  nextPosition(u, { speak: false }, { stage: 'explain', index: u.explain.length - 1 }), { stage: 'practice', index: 0 }));

test('最後の段の最後は done', () => assert.equal(
  nextPosition(u, { speak: false }, { stage: 'phrases', index: u.phrases.length - 1 }), 'done'));

test('発音を途中でオフにした再開位置は done 扱い', () => assert.equal(
  nextPosition(u, { speak: false }, { stage: 'speak', index: 0 }), 'done'));

test('stageLength は段の件数', () => assert.equal(stageLength(u, 'practice'), 3));

test('u01 は常に開放、他は前が done で開放', () => {
  const index = [{ id: 'u01' }, { id: 'u02' }, { id: 'u03' }];
  assert.equal(isUnlocked(index, {}, 'u01'), true);
  assert.equal(isUnlocked(index, {}, 'u02'), false);
  assert.equal(isUnlocked(index, { u01: { done: true } }, 'u02'), true);
  assert.equal(isUnlocked(index, { u01: { done: true } }, 'u03'), false);
});
