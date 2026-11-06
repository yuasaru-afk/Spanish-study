import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chime } from '../js/sound.js';

// Web Audio の偽物。鳴らした音の高さを記録する
function fakeWin() {
  const played = [];
  class AC {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
    resume() { this.state = 'running'; }
    createOscillator() {
      const osc = { frequency: {}, connect: g => g, start: () => played.push(osc.frequency.value), stop() {} };
      return osc;
    }
    createGain() {
      return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: d => d };
    }
  }
  return { win: { AudioContext: AC }, played };
}

test('Web Audio がなければ鳴らさない', () => assert.equal(chime({}), false));

test('ピン（高）→ポン（低）の2音を鳴らす', () => {
  const { win, played } = fakeWin();
  assert.equal(chime(win), true);
  assert.equal(played.length, 2);
  assert.ok(played[0] > played[1]);
});
