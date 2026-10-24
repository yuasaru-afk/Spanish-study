import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canSpeak, speak, canListen, listen } from '../js/speech.js';

// 音声認識の偽物。behavior: {result} | {error} | {} （何も起きない）
function fakeWin(behavior) {
  class Rec {
    start() {
      this.started = true;
      setTimeout(() => {
        if (behavior.result) this.onresult?.({ results: [[{ transcript: behavior.result }]] });
        else if (behavior.error) this.onerror?.({ error: behavior.error });
        if (behavior.result || behavior.error) this.onend?.();
      }, 1);
    }
    abort() { this.aborted = true; }
    stop() {}
  }
  return { webkitSpeechRecognition: Rec };
}

test('API がなければ unsupported', async () => {
  assert.equal(canListen({}), false);
  assert.deepEqual(await listen({}), { ok: false, reason: 'unsupported' });
});

test('webkit 版があれば canListen', () => assert.equal(canListen(fakeWin({})), true));

test('マイク拒否は denied', async () => assert.deepEqual(await listen(fakeWin({ error: 'not-allowed' })), { ok: false, reason: 'denied' }));

test('サービス拒否も denied', async () => assert.deepEqual(await listen(fakeWin({ error: 'service-not-allowed' })), { ok: false, reason: 'denied' }));

test('圏外は network', async () => assert.deepEqual(await listen(fakeWin({ error: 'network' })), { ok: false, reason: 'network' }));

test('聞き取れなければ nomatch', async () => assert.deepEqual(await listen(fakeWin({ error: 'no-speech' })), { ok: false, reason: 'nomatch' }));

test('結果が来れば text', async () => assert.deepEqual(await listen(fakeWin({ result: 'la cuenta' })), { ok: true, text: 'la cuenta' }));

test('何も来なければ timeout', async () => assert.deepEqual(await listen(fakeWin({}), { timeoutMs: 10 }), { ok: false, reason: 'timeout' }));

test('start が例外でも unsupported で返る', async () => {
  const win = { webkitSpeechRecognition: class { start() { throw new Error('x'); } abort() {} } };
  assert.deepEqual(await listen(win), { ok: false, reason: 'unsupported' });
});

test('speak は es-ES の声を選び lang と速さを渡す', () => {
  const spoken = [];
  const voices = [{ lang: 'en-US', name: 'a' }, { lang: 'es-MX', name: 'b' }, { lang: 'es-ES', name: 'c' }];
  const win = {
    speechSynthesis: { getVoices: () => voices, cancel() {}, speak: u => spoken.push(u) },
    SpeechSynthesisUtterance: class { constructor(t) { this.text = t; } },
  };
  assert.equal(canSpeak(win), true);
  speak(win, 'Hola', 0.9);
  assert.equal(spoken[0].text, 'Hola');
  assert.equal(spoken[0].lang, 'es-ES');
  assert.equal(spoken[0].rate, 0.9);
  assert.equal(spoken[0].voice.name, 'c');
});

test('speak は es-ES がなければ他の es 声', () => {
  const spoken = [];
  const win = {
    speechSynthesis: { getVoices: () => [{ lang: 'es-MX', name: 'b' }], cancel() {}, speak: u => spoken.push(u) },
    SpeechSynthesisUtterance: class { constructor(t) { this.text = t; } },
  };
  speak(win, 'Hola', 1);
  assert.equal(spoken[0].voice.name, 'b');
});

test('読み上げがない環境では何もしない', () => {
  assert.equal(canSpeak({}), false);
  assert.doesNotThrow(() => speak({}, 'Hola', 1));
});
