import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateUnit, validateAll } from '../tools/validate-content.mjs';

const good = () => JSON.parse(readFileSync(new URL('./fixtures/good-unit.json', import.meta.url), 'utf8'));
const errs = (u, seen = new Set()) => validateUnit(u, seen).join('\n');

test('合格する見本', () => assert.deepEqual(validateUnit(good(), new Set()), []));

test('choice の正解が1つでない', () => {
  const u = good(); u.practice[0].options.forEach(o => (o.correct = true));
  assert.match(errs(u), /正解はちょうど1つ/);
});

test('選択肢に why がない', () => {
  const u = good(); delete u.practice[0].options[1].why;
  assert.match(errs(u), /why/);
});

test('order に why がない', () => {
  const u = good(); delete u.practice[1].why;
  assert.match(errs(u), /why/);
});

test('es にカタカナ', () => {
  const u = good(); u.explain[0].examples[0].es = 'Hola（オラ）';
  assert.match(errs(u), /カタカナ/);
});

test('単語の latam.es にカタカナ', () => {
  const u = good(); u.words[0].latam.es = 'コンピュータ';
  assert.match(errs(u), /カタカナ/);
});

test('単語 id の重複（ユニットをまたぐ）', () => {
  assert.match(errs(good(), new Set(['ordenador'])), /重複/);
});

test('art が el/la/null 以外', () => {
  const u = good(); u.words[0].art = 'los';
  assert.match(errs(u), /art/);
});

test('validateAll は units.json に載ったファイルを検査する', () => {
  const dir = mkdtempSync(join(tmpdir(), 'es-content-'));
  const u = good(); delete u.practice[2].options[1].why;
  writeFileSync(join(dir, 'u90.json'), JSON.stringify(u));
  writeFileSync(join(dir, 'units.json'), JSON.stringify([{ id: 'u90', no: 90, title: '見本', file: 'u90.json' }]));
  assert.match(validateAll(dir).join('\n'), /u90.*why/);
});

test('穴埋め（キーボード入力）は使わない', () => {
  const u = good(); u.practice.push({ type: 'fill', prompt: 'p', es: 'Yo ___.', ja: 'j', answers: ['soy'], why: 'w' });
  assert.match(errs(u), /fill/);
});
