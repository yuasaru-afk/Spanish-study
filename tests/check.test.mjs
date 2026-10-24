import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, stripAccents, checkChoice, checkOrder, checkFill, matchSpoken } from '../js/check.js';

test('normalize: 全角空白・大文字・¿¡・末尾記号', () => assert.equal(normalize('　¿Hablas  ESPAÑOL? '), 'hablas español'));

test('stripAccents は ñ を残す', () => assert.equal(stripAccents('está año pingüino'), 'esta año pinguino'));

test('大文字・全角空白・末尾ピリオドは正解', () => assert.equal(checkFill({ answers: ['soy'], why: 'w' }, '　Soy. ').ok, true));

test('アクセント抜けは おしい', () => assert.deepEqual(checkFill({ answers: ['está'], why: 'w' }, 'esta'), { ok: false, nearly: true, why: 'w' }));

test('違う語は不正解', () => assert.deepEqual(checkFill({ answers: ['soy'], why: 'w' }, 'es'), { ok: false, nearly: false, why: 'w' }));

test('ñ は n で代用できない', () => assert.equal(checkFill({ answers: ['año'], why: 'w' }, 'ano').nearly, false));

test('answers の別解も正解', () => assert.equal(checkFill({ answers: ['soy', 'yo soy'], why: 'w' }, 'Yo soy').ok, true));

const choice = { options: [{ text: 'está', correct: true, why: 'W-ok' }, { text: 'es', correct: false, why: 'W-ng' }] };

test('choice は選んだ選択肢の why（誤答）', () => assert.deepEqual(checkChoice(choice, 1), { ok: false, why: 'W-ng' }));

test('choice は選んだ選択肢の why（正解）', () => assert.deepEqual(checkChoice(choice, 0), { ok: true, why: 'W-ok' }));

const order = { tokens: ['Yo', 'no', 'hablo', 'inglés'], accept: [['No', 'hablo', 'inglés', 'yo']], why: 'W' };

test('order は正しい並びで正解', () => assert.equal(checkOrder(order, ['Yo', 'no', 'hablo', 'inglés']).ok, true));

test('order は accept の別順も正解', () => assert.equal(checkOrder(order, ['No', 'hablo', 'inglés', 'yo']).ok, true));

test('order の誤りは why 付きで不正解', () => assert.deepEqual(checkOrder(order, ['no', 'Yo', 'hablo', 'inglés']), { ok: false, why: 'W' }));

test('matchSpoken: 句読点と大小は無視して great', () => assert.equal(matchSpoken('La cuenta, por favor.', 'la cuenta por favor'), 'great'));

test('matchSpoken: アクセント違いも great', () => assert.equal(matchSpoken('¿Dónde está?', 'donde esta'), 'great'));

test('matchSpoken: 半分で close', () => assert.equal(matchSpoken('La cuenta, por favor.', 'la cuenta'), 'close'));

test('matchSpoken: ずれは retry', () => assert.equal(matchSpoken('La cuenta, por favor.', 'hola'), 'retry'));
