// 読み上げ（端末内蔵の声）と音声認識。win は window（テストでは偽物）

export function canSpeak(win) {
  return Boolean(win.speechSynthesis && win.SpeechSynthesisUtterance);
}

function pickVoice(win) {
  const voices = win.speechSynthesis.getVoices() || [];
  return voices.find(v => v.lang === 'es-ES') || voices.find(v => /^es[-_]/i.test(v.lang)) || null;
}

export function speak(win, text, rate) {
  if (!canSpeak(win)) return;
  const u = new win.SpeechSynthesisUtterance(text);
  u.lang = 'es-ES';
  u.rate = rate;
  const voice = pickVoice(win);
  if (voice) u.voice = voice;
  win.speechSynthesis.cancel();
  win.speechSynthesis.speak(u);
}

const recognizer = win => win.SpeechRecognition || win.webkitSpeechRecognition;

export function canListen(win) {
  return Boolean(recognizer(win));
}

const REASONS = {
  'not-allowed': 'denied',
  'service-not-allowed': 'denied',
  network: 'network',
  'no-speech': 'nomatch',
  'aborted': 'nomatch',
  'audio-capture': 'denied',
};

// 判定なしの練習に切り替えるか。黙ったまま返事がないのも2回続いたら切り替える
export function shouldFallback(reason, consecutive) {
  if (['unsupported', 'denied', 'network'].includes(reason)) return true;
  return consecutive >= 2;
}

// 例外は投げず、必ず {ok:true,text} か {ok:false,reason} で返す。
// timeoutMs は録音が始まって（onstart）から数える。初回のマイク許可の確認を待つ間は数えない
export function listen(win, { timeoutMs = 6000, limitMs = 15000 } = {}) {
  const Rec = recognizer(win);
  if (!Rec) return Promise.resolve({ ok: false, reason: 'unsupported' });
  return new Promise(resolve => {
    let done = false;
    let rec;
    let timer;
    const finish = r => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearTimeout(limit);
      resolve(r);
    };
    const giveUp = () => {
      try { rec?.abort(); } catch { /* 止められなくても結果は返す */ }
      finish({ ok: false, reason: 'timeout' });
    };
    const limit = setTimeout(giveUp, limitMs);
    try {
      rec = new Rec();
      rec.lang = 'es-ES';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = () => { clearTimeout(timer); timer = setTimeout(giveUp, timeoutMs); };
      rec.onresult = e => finish({ ok: true, text: e.results[0][0].transcript });
      rec.onerror = e => finish({ ok: false, reason: REASONS[e.error] || 'nomatch' });
      rec.onend = () => finish({ ok: false, reason: 'nomatch' });
      rec.start();
    } catch {
      finish({ ok: false, reason: 'unsupported' });
    }
  });
}
