// 正解の「ピンポン」。音源ファイルを持たず Web Audio で2音を鳴らす。win は window（テストでは偽物）
let ctx = null;

function audio(win) {
  const AC = win.AudioContext || win.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(ac, freq, start, length) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + length);
}

export function chime(win) {
  const ac = audio(win);
  if (!ac) return false;
  const t = ac.currentTime;
  tone(ac, 1319, t, 0.35);        // ピン（ミ）
  tone(ac, 1047, t + 0.18, 0.6);  // ポン（ド）
  return true;
}
