# スペイン語学習アプリ（初版10ユニット） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iPhone のホーム画面に置いて通勤中に使う、日本語の文法解説つきスペイン語学習 PWA を、最初の10ユニット分作って GitHub Pages に公開する。

**Architecture:** ビルドなしの素の HTML/CSS/JS（ES modules）。ロジック（復習間隔・答え合わせ・保存・教材の検査）は DOM に触らない小さなモジュールに分けて Node の組み込みテストで試し、画面は `js/views/` の関数が DOM を組み立てる。教材はユニットごとの JSON で、`tools/validate-content.mjs` が形と中身を機械で検査する。Service Worker が全ファイルを先読みして圏外でも動かす。

**Tech Stack:** HTML/CSS/JavaScript（ES2022 modules、依存ライブラリなし）、Node 24 の `node --test`（テストのみ）、Web Speech API（speechSynthesis / webkitSpeechRecognition）、Service Worker、GitHub Pages。

**Spec:** `docs/superpowers/specs/2026-10-24-spanish-app-design.md`

## Global Constraints

- リポジトリのルート＝`Desktop\Claude\020スペイン語学習`（この中で `git init`。上位の Desktop\Claude リポジトリとは別）。GitHub アカウント `yuasaru-afk`、公開リポジトリ、Pages は main ブランチのルートから配信。ルートに `.nojekyll`
- 依存パッケージなし（npm install しない）。外部 CDN も使わない（圏外で動かすため）
- 画面の文言・解説はすべて日本語。**スペイン語にカタカナ読みを付けない**。教材 JSON の `es` 系フィールドにカタカナが入っていたら検査で落とす
- スペイン本国が基本。中南米で違うものは `latam` に入れ、画面では「🌎 中南米では …」と表示
- 例文・単語・フレーズには必ず 🔊 読み上げボタン（`lang="es-ES"`）
- 学習記録は端末の localStorage のみ。キー `es-app-v1`。外部送信しない
- 設定：文字サイズ `s|m|l|xl`（既定 `m`）、テーマ `auto|light|dark`（既定 `auto`）、発音練習 `true|false`（既定 `false`）、読み上げ速さ `0.7|0.9|1.0`（既定 `0.9`）
- 1ユニットの流れは「解説 → 練習 → 単語 → フレーズ（あるユニットのみ）→ 発音（設定オン時のみ）」。どの時点で閉じても次回は同じ所から
- 選択問題は選択肢ごとに `why`、並べ替え・穴埋めは問題ごとの `why`（文法ルールの説明）を必ず持つ
- 例文は自作。外部教材から流用しない

## Review Focus

1. **電車で途中で閉じた／iOS がアプリを落とした** → 次に開くと同じユニットの同じ問題から再開。回答のたびに保存（Task 2 の `resume` テスト）
2. **日本語キーボードで穴埋めに答える**（アクセント記号なし・全角スペース・先頭大文字・末尾の「.」）→ 記号違いは「おしい（アクセント記号に注意）」、空白や大文字は正解扱い（Task 3 のテスト）
3. **教材を足して再公開した後、圏外で開く** → 新しいユニットも開ける。全ファイルが先読み一覧に入っていること（Task 5 の `check-precache` テスト）
4. **壊れたファイル・別アプリのファイルを「読み込み」** → エラー表示のみで今の記録は無傷（Task 2 のテスト）
5. **音声認識がない／マイク拒否／圏外** → 落ちずに「聞いて自分で言う（判定なし）」に切り替わる（Task 4 のテスト）

---

## File Structure

```
020スペイン語学習/
  index.html              画面の器・manifest/SW 登録・iOS 用 meta
  manifest.webmanifest    名前「スペイン語」、display: standalone、アイコン
  sw.js                   先読みとキャッシュ（PRECACHE 一覧は tools/gen-precache.mjs が書く）
  .nojekyll
  icons/                  icon-192.png, icon-512.png, apple-touch-icon.png（180px）
  css/app.css             色トークン・ダーク・文字サイズ・部品
  js/main.js              起動・画面切替（hash ルーティング）・設定適用
  js/store.js             記録の読み書き・書き出し/読み込み・再開位置
  js/srs.js               単語の復習間隔
  js/check.js             答え合わせ（選択・並べ替え・穴埋め）・音声認識結果の判定
  js/speech.js            読み上げ・音声認識（使えない時の判定）
  js/content.js           教材 JSON の読み込み
  js/views/home.js        ホーム
  js/views/lesson.js      ユニット（解説/練習/単語/フレーズ/発音の各段）
  js/views/review.js      今日の単語復習
  js/views/grammar.js     文法ノート
  js/views/settings.js    設定・書き出し/読み込み
  js/views/install.js     「ホーム画面に追加」の案内
  content/units.json      ユニット一覧
  content/u01.json … u10.json
  tools/validate-content.mjs
  tools/gen-precache.mjs
  tests/*.test.mjs
```

## 教材データの形（全タスク共通）

`content/units.json`: `[{ "id": "u01", "no": 1, "title": "あいさつ", "file": "u01.json" }, …]`

`content/uNN.json`:

```json
{
  "id": "u07", "no": 7, "title": "否定文と疑問文", "summary": "一行の要約",
  "explain": [ { "title": "…", "body": "**太字**可の日本語", "examples": [ { "es": "No hablo inglés.", "ja": "…", "note": "任意" } ] } ],
  "practice": [
    { "type": "choice", "prompt": "空欄に入るのは？", "es": "La sopa ___ fría.", "ja": "スープが冷めている",
      "options": [ { "text": "está", "correct": true, "why": "…" }, { "text": "es", "correct": false, "why": "…" } ] },
    { "type": "order", "prompt": "並べ替え", "ja": "…", "tokens": ["¿", "Hablas", "español", "?"], "accept": [], "why": "…" },
    { "type": "fill", "prompt": "…", "es": "Yo ___ japonés.", "ja": "…", "answers": ["soy"], "why": "…" }
  ],
  "words":   [ { "id": "ordenador", "es": "ordenador", "art": "el", "ja": "パソコン", "latam": { "es": "computadora", "art": "la" } } ],
  "phrases": [ { "es": "La cuenta, por favor.", "ja": "お会計お願いします", "scene": "レストラン", "latam": null } ],
  "speak":   [ { "es": "La cuenta, por favor.", "ja": "…", "tip": "日本語で一言（任意）" } ]
}
```

`art` は `el|la|null`（名詞以外は null）。`words[].id` は全ユニットで一意。`phrases` と `speak` は空配列可。

## 初版10ユニット（Claude の判断、設計書4章の構成案を確定）

1 あいさつ／2 発音とつづりのきまり／3 名詞の男女と冠詞／4 ser（〜です）と主語／5 -ar 動詞の現在形／6 estar と ser・estar の使い分け／7 否定文と疑問文／8 数字・時刻・曜日／9 gustar（好き嫌い）／10 レストランで

---

### Task 1: リポジトリと教材検査ツール

**Files:**
- Create: `tools/validate-content.mjs`, `tests/validate-content.test.mjs`, `tests/fixtures/good-unit.json`, `.gitignore`（`.superpowers/`）, `.nojekyll`
- Modify: なし（`git init` はこのタスクで）

**Interfaces:**
- Produces: `validateUnit(unit: object, seenWordIds: Set<string>) -> string[]`（エラー文の配列、空なら合格）、`validateAll(dir: string) -> string[]`。CLI: `node tools/validate-content.mjs content` は合格で exit 0、不合格でエラーを1行ずつ出して exit 1

- [ ] **Step 1: `git init`、`.gitignore` と `.nojekyll` を置く**
- [ ] **Step 2: 失敗するテストを書く**（`tests/validate-content.test.mjs`、fixture を読み込んで一部を壊したものを渡す）

```js
test('合格する見本', () => assert.deepEqual(validateUnit(good(), new Set()), []));
test('choice の正解が1つでない', () => { const u = good(); u.practice[0].options.forEach(o => o.correct = true);
  assert.match(validateUnit(u, new Set()).join(), /正解はちょうど1つ/); });
test('選択肢に why がない', () => { const u = good(); delete u.practice[0].options[1].why;
  assert.match(validateUnit(u, new Set()).join(), /why/); });
test('order/fill に why がない', …同様に /why/);
test('fill の answers が空', … /answers/);
test('es にカタカナ', () => { const u = good(); u.explain[0].examples[0].es = 'Hola（オラ）';
  assert.match(validateUnit(u, new Set()).join(), /カタカナ/); });
test('単語 id の重複（ユニットをまたぐ）', () => { const seen = new Set(['ordenador']);
  assert.match(validateUnit(good(), seen).join(), /重複/); });
test('art が el/la/null 以外', … /art/);
```

- [ ] **Step 3: `node --test tests/` を実行し、未実装で FAIL することを確認**
- [ ] **Step 4: `validateUnit` / `validateAll` を実装**。カタカナ判定は `/[゠-ヿ]/` を `es` を含む全フィールド（examples.es, practice.es, tokens, options.text, answers, words.es, latam.es, phrases.es, speak.es）に当てる
- [ ] **Step 5: `node --test tests/` が PASS**
- [ ] **Step 6: Commit** `git commit -m "feat: content validator"`

### Task 2: 記録の保存・再開・書き出し（store.js）と復習間隔（srs.js）

**Files:**
- Create: `js/store.js`, `js/srs.js`, `tests/store.test.mjs`, `tests/srs.test.mjs`

**Interfaces:**
- Produces（srs.js）:
  - `dayNumber(date: Date) -> number`（端末の現地日付で数える通し日。現地の0時で切り替わる）
  - `LADDER = [1, 3, 7, 14, 30, 60]`
  - `gradeCard(card: {step:number, due:number} | undefined, grade: 'again'|'hard'|'good', today: number) -> {step, due}`
    - 新規は `{step:-1}` 扱い。good: step+1（上限 5）、due = today + LADDER[step]。hard: step 据え置き（最低 0）、due = today + LADDER[step]。again: step 0、due = today（今日の復習の最後にもう一度出す）
  - `dueWordIds(cards: Record<string,{step,due}>, today: number) -> string[]`（due ≤ today、due の古い順）
- Produces（store.js）: storage は `{getItem,setItem}` を引数で受ける（テストで偽物を渡すため）
  - `defaultState() -> State`。`State = { version: 1, settings: {fontSize:'m', theme:'auto', speak:false, rate:0.9}, units: Record<unitId,{done:boolean}>, resume: {unitId, stage:'explain'|'practice'|'words'|'phrases'|'speak', index:number} | null, cards: Record<wordId,{step,due}>, streak: {lastDay:number|null, count:number} }`
  - `load(storage) -> State`（無い・壊れている時は `defaultState()`）、`save(storage, state) -> void`（キー `es-app-v1`）
  - `setResume(state, unitId, stage, index) -> State`、`finishUnit(state, unitId) -> State`（done=true、resume=null）
  - `touchStreak(state, today) -> State`（同日は変化なし、前日なら+1、それ以外は1）
  - `exportJson(state) -> string`、`importJson(text) -> State`（`version !== 1` や形の違いは `Error('このファイルは読み込めません')` を投げる）

- [ ] **Step 1: 失敗するテストを書く**

```js
// srs
test('good を重ねると 1,3,7 日後', () => { let c; c = gradeCard(c,'good',100); assert.equal(c.due,101);
  c = gradeCard(c,'good',101); assert.equal(c.due,104); c = gradeCard(c,'good',104); assert.equal(c.due,111); });
test('again は step 0・今日', () => assert.deepEqual(gradeCard({step:3,due:90},'again',100), {step:0,due:100}));
test('上限は 60 日', () => assert.equal(gradeCard({step:5,due:0},'good',100).due, 160));
test('dueWordIds は古い順で未来を含まない', () => assert.deepEqual(
  dueWordIds({a:{step:1,due:99},b:{step:0,due:95},c:{step:0,due:101}},100), ['b','a']));
test('dayNumber は現地0時で切替', () => assert.equal(
  dayNumber(new Date(2026,9,24,23,59)) + 1, dayNumber(new Date(2026,9,25,0,1))));
// store
test('壊れた保存データは初期状態', () => { const s = fake({'es-app-v1':'{oops'}); assert.deepEqual(load(s), defaultState()); });
test('resume を保存して読み直すと同じ位置', () => { const s = fake({}); save(s, setResume(defaultState(),'u03','practice',4));
  assert.deepEqual(load(s).resume, {unitId:'u03',stage:'practice',index:4}); });
test('finishUnit で resume が消え done', …);
test('streak: 同日据え置き・翌日+1・間が空くと1', …);
test('書き出し→読み込みで同じ', () => { const st = setResume(defaultState(),'u02','words',1);
  assert.deepEqual(importJson(exportJson(st)), st); });
test('別物のファイルは例外、元データは無傷', () => { const s = fake({}); const st = setResume(defaultState(),'u02','words',1); save(s, st);
  assert.throws(() => importJson('{"foo":1}'), /読み込めません/); assert.deepEqual(load(s), st); });
```

- [ ] **Step 2: `node --test tests/` で FAIL を確認**
- [ ] **Step 3: `js/srs.js` と `js/store.js` を上の署名どおり実装**（状態は毎回新しいオブジェクトを返す）
- [ ] **Step 4: `node --test tests/` が PASS**
- [ ] **Step 5: Commit** `git commit -m "feat: progress store and spaced repetition"`

### Task 3: 答え合わせ（check.js）

**Files:**
- Create: `js/check.js`, `tests/check.test.mjs`

**Interfaces:**
- Produces:
  - `normalize(s: string) -> string`：前後空白除去、全角スペース→半角、連続空白を1つ、小文字化、文末の `.!?。` と文頭の `¿¡` を除く（アクセントは残す）
  - `stripAccents(s: string) -> string`：á→a などを外す（ñ は n にしない）
  - `checkChoice(q, optionIndex: number) -> {ok: boolean, why: string}`（why は選んだ選択肢の why。正解時は正解選択肢の why）
  - `checkOrder(q, tokens: string[]) -> {ok, why}`（`q.tokens` か `q.accept` のどれかと一致）
  - `checkFill(q, input: string) -> {ok: boolean, nearly: boolean, why: string}`：normalize 後に answers と一致→ok。stripAccents 後だけ一致→ok:false, nearly:true（画面は「おしい：アクセント記号に注意」）
  - `matchSpoken(target: string, heard: string) -> 'great'|'close'|'retry'`：両方 normalize＋stripAccents して単語の一致率（target の単語のうち heard に含まれる割合）。≥0.8 great、≥0.5 close、他 retry

- [ ] **Step 1: 失敗するテストを書く**

```js
test('大文字・全角空白・末尾ピリオドは正解', () => assert.equal(checkFill({answers:['soy'],why:'w'},'　Soy. ').ok, true));
test('アクセント抜けは おしい', () => assert.deepEqual(checkFill({answers:['está'],why:'w'},'esta'), {ok:false,nearly:true,why:'w'}));
test('違う語は不正解', () => assert.equal(checkFill({answers:['soy'],why:'w'},'es').nearly, false));
test('ñ は n で代用できない', () => assert.equal(checkFill({answers:['año'],why:'w'},'ano').nearly, false));
test('choice は選んだ選択肢の why', …);
test('order は accept の別順も正解', …);
test('matchSpoken: 句読点と大小は無視して great', () => assert.equal(matchSpoken('La cuenta, por favor.','la cuenta por favor'),'great'));
test('matchSpoken: 半分で close、ずれは retry', …);
```

- [ ] **Step 2: FAIL を確認** → **Step 3: 実装** → **Step 4: `node --test tests/` PASS**
- [ ] **Step 5: Commit** `git commit -m "feat: answer checking"`

### Task 4: 読み上げと音声認識（speech.js）

**Files:**
- Create: `js/speech.js`, `tests/speech.test.mjs`

**Interfaces:**
- Produces（`win` は window。テストでは偽物を渡す）:
  - `canSpeak(win) -> boolean`、`speak(win, text: string, rate: number) -> void`（`lang='es-ES'`、es-ES の声があれば優先、なければ es-* の声、無ければ既定）
  - `canListen(win) -> boolean`（`SpeechRecognition` か `webkitSpeechRecognition` があるか）
  - `listen(win, {timeoutMs = 6000} = {}) -> Promise<{ok:true, text:string} | {ok:false, reason:'unsupported'|'denied'|'network'|'nomatch'|'timeout'}>`（例外を投げない。`lang='es-ES'`）

- [ ] **Step 1: 失敗するテストを書く**

```js
test('API がなければ unsupported', async () => { assert.equal(canListen({}), false);
  assert.deepEqual(await listen({}), {ok:false, reason:'unsupported'}); });
test('マイク拒否は denied', async () => assert.deepEqual(await listen(fakeWin({error:'not-allowed'})), {ok:false,reason:'denied'}));
test('圏外は network', async () => …{error:'network'}… );
test('結果が来れば text', async () => assert.deepEqual(await listen(fakeWin({result:'la cuenta'})), {ok:true,text:'la cuenta'}));
test('何も来なければ timeout', async () => …{timeoutMs:10}… );
```

- [ ] **Step 2: FAIL** → **Step 3: 実装**（`service-not-allowed` も denied に寄せる）→ **Step 4: PASS**
- [ ] **Step 5: Commit** `git commit -m "feat: speech synthesis and recognition wrappers"`

### Task 5: 画面の器・見た目・圏外対応（index.html / app.css / main.js / sw.js / install）

**Files:**
- Create: `index.html`, `manifest.webmanifest`, `sw.js`, `icons/*`, `css/app.css`, `js/main.js`, `js/content.js`, `js/views/install.js`, `js/views/settings.js`, `tools/gen-precache.mjs`, `tests/precache.test.mjs`

**Interfaces:**
- Consumes: Task 2 の `load/save/exportJson/importJson`
- Produces:
  - `js/content.js`：`loadIndex() -> Promise<UnitIndex[]>`、`loadUnit(id) -> Promise<Unit>`
  - `js/main.js`：hash ルート `#/`（ホーム）、`#/u/<id>`（ユニット）、`#/review`、`#/grammar`、`#/grammar/<id>`、`#/settings`。各 view は `render(root: HTMLElement, ctx) -> void`、`ctx = { state, setState(fn), go(hash), content }`。`setState` は保存まで行う
  - `applySettings(doc, settings)`：`<html data-font="s|m|l|xl" data-theme="auto|light|dark">`
  - `tools/gen-precache.mjs`：配信対象（index.html, manifest, css/, js/, content/, icons/）を列挙して `sw.js` の `const PRECACHE = [...]` と `const VERSION = '<内容のハッシュ先頭8桁>'` を書き換える。`--check` 付きは書き換えず、ずれていれば exit 1

- [ ] **Step 1: 失敗するテスト** `tests/precache.test.mjs`：`gen-precache.mjs --check` が exit 0 になること（新しいファイルを content/ に足すと exit 1 になることも一時ファイルで確認）
- [ ] **Step 2: FAIL を確認**
- [ ] **Step 3: 実装**
  - `app.css`：色はすべて `:root` のトークン。ダークは `@media (prefers-color-scheme: dark)` を `:root[data-theme=auto]` に、`:root[data-theme=dark]` に同じ値。文字サイズは `--fs` を s=15px / m=17px / l=20px / xl=23px。基調色はモックのオレンジ `#e8a33d`。片手操作のため主ボタンは画面下寄せ・高さ 48px 以上。`env(safe-area-inset-*)` を効かせる
  - `index.html`：`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`、`apple-mobile-web-app-capable`、`apple-touch-icon`、manifest、`<html lang="ja">`
  - `sw.js`：install で PRECACHE を全部 `cache.addAll`、activate で VERSION 違いの古いキャッシュを削除、fetch はキャッシュ優先・無ければネット
  - `install.js`：`navigator.standalone` が false の iPhone Safari では初回だけ「共有ボタン →『ホーム画面に追加』」の案内を出す（閉じたら `state.settings` ではなく localStorage の別キー `es-app-install-hint` に記録）
  - `settings.js`：文字サイズ・テーマ・発音練習・速さ。書き出しは `navigator.share({files:[new File([json],'spanish-backup.json',{type:'application/json'})]})`、使えなければ `<a download>`。読み込みは `<input type=file accept=".json,application/json">` → `importJson`、失敗は画面にメッセージのみ（記録は書き換えない）
  - アイコンは Python（Pillow）か手書き SVG→PNG で作る。オレンジ地に白で「Ñ」
- [ ] **Step 4: `node tools/gen-precache.mjs` 実行後、`node --test tests/` PASS**
- [ ] **Step 5: 目視確認**：`python -m http.server 8080` で配信し、Edge ヘッドレスで 390×844 のスクショを設定画面・案内で撮る（`msedge --headless --screenshot=out.png --window-size=390,844 http://localhost:8080/#/settings`）。文字サイズ xl とダークで崩れないこと
- [ ] **Step 6: Commit** `git commit -m "feat: app shell, settings, offline cache"`

### Task 6: ホーム・ユニット・復習・文法ノートの画面

**Files:**
- Create: `js/views/home.js`, `js/views/lesson.js`, `js/views/review.js`, `js/views/grammar.js`, `tests/lesson-flow.test.mjs`, `content/units.json`, `content/u01.json`（このタスクでは画面確認用の短い仮版。Task 7 で本番に置き換え）
- Modify: `js/main.js`（ルート登録）

**Interfaces:**
- Consumes: Task 2〜5 の全部
- Produces: `lesson.js` 内の純粋関数 `stagesFor(unit, settings) -> Stage[]`（`explain`, `practice`, `words`, `phrases`（空なら除く）, `speak`（`settings.speak` が true の時のみ））、`nextPosition(unit, settings, {stage, index}) -> {stage, index} | 'done'`

- [ ] **Step 1: 失敗するテスト** `tests/lesson-flow.test.mjs`

```js
test('phrases が空なら飛ばす', () => assert.deepEqual(stagesFor({...u, phrases:[]}, {speak:false}), ['explain','practice','words']));
test('発音オンで speak が最後', () => assert.equal(stagesFor(u,{speak:true}).at(-1), 'speak'));
test('段の最後の次は次の段の0', () => assert.deepEqual(nextPosition(u,{speak:false},{stage:'explain',index:u.explain.length-1}), {stage:'practice',index:0}));
test('最後の段の最後は done', …);
```

- [ ] **Step 2: FAIL** → **Step 3: 実装**
  - ホーム：最上部に `state.resume` があれば「続きから：<ユニット名> の <段名> n/m」と「続ける ▶」。その下に「今日の復習：単語 N個」（`dueWordIds` の件数、0 なら出さない）。ユニット一覧は 済✓／次▶／未開放🔒（直前のユニットが done で開放。u01 は常に開放）。下に 文法ノート・単語復習・設定
  - ユニット：上部にユニット名・段名・n/m・進捗バー。**回答や「次へ」のたびに `setResume` して保存**。練習の結果は「なぜ？」欄に `why` を表示し、穴埋めの nearly は「おしい：アクセント記号に注意」。穴埋めの入力欄の下に á é í ó ú ñ ü ¿ ¡ のボタン、入力欄は `autocapitalize="off" autocorrect="off" spellcheck="false" lang="es"`。単語段は1枚ずつ（スペイン語＋冠詞→タップで訳と 🌎）、見終わった単語は `gradeCard(...,'good')` ではなく初回登録として `{step:-1,due:today}` 相当の「今日出す」状態で cards に入れる。発音段は `canListen` が false か `listen` が ok:false なら「お手本を聞いて自分で言う」表示に切り替え、`matchSpoken` の結果は great=◎通じます／close=○おしい／retry=もう一度。いつでも「今は声を出せない→スキップ」
  - 復習：`dueWordIds` を順に、表で スペイン語→タップで裏、忘れた／あやしい／覚えた = again/hard/good。again は今回の最後にもう一度
  - 文法ノート：全ユニットの `explain` をユニット順に一覧→タップで全文（例文の 🔊 付き）。練習の「📘 文法ノートで見る」は `#/grammar/<unitId>` へ
  - 最初に開いた日の `touchStreak` でホームに「🔥 N日連続」
- [ ] **Step 4: `node --test tests/` PASS**
- [ ] **Step 5: 目視確認**：Task 5 と同じ方法で ホーム・解説・練習（誤答後）・単語・発音（ヘッドレスは認識 API がないので判定なし表示になること）のスクショ。モック（ホーム／解説／練習／単語カード／発音の5枚）と流れが一致すること
- [ ] **Step 6: Commit** `git commit -m "feat: home, lesson, review and grammar views"`

### Task 7: 教材 ユニット1〜5

**Files:**
- Create/Replace: `content/u01.json` 〜 `content/u05.json`
- Modify: `content/units.json`

**Interfaces:**
- Consumes: 教材データの形、`tools/validate-content.mjs`

各ユニットの量：解説 3〜5 枚（各1〜2例文）、練習 8〜10問（選択・並べ替え・穴埋めを混ぜる。選択は全選択肢に why、誤答の why は「その答えだと意味がどう変わるか／なぜ文法的に成り立たないか」を書く）、新出単語 15〜25語、フレーズは場面のあるユニットのみ 5〜10、発音 3〜5文。通勤の1〜2駅（3〜5分）で1区切りになるよう、1段が長くなりすぎないこと。日本語話者のつまずき（名詞の性、活用、ser/estar、tú/usted、vosotros/ustedes）は特に丁寧に。vosotros は活用表に載せ「🌎 中南米では使わず ustedes」と添える。

- [ ] **Step 1: u01〜u05 を書く**
- [ ] **Step 2: `node tools/validate-content.mjs content` が exit 0**
- [ ] **Step 3: スペイン語の見直し**（別エージェントに `content/u01〜05.json` を渡し、活用・名詞の性と冠詞・アクセント記号・¿¡・中南米表記・日本語訳のずれ・why の正しさを1件ずつ指摘させる。指摘は本体が確かめてから直す）
- [ ] **Step 4: 直した後に再度 validate が exit 0、`node tools/gen-precache.mjs` 実行**
- [ ] **Step 5: Commit** `git commit -m "content: units 1-5"`

### Task 8: 教材 ユニット6〜10

Task 7 と同じ手順・同じ量で `content/u06.json` 〜 `content/u10.json`。u10（レストランで）はフレーズと発音を厚めに（フレーズ 10〜15）。

- [ ] **Step 1: 書く** → **Step 2: validate exit 0** → **Step 3: 別エージェントで見直し** → **Step 4: 修正・validate・gen-precache** → **Step 5: Commit** `git commit -m "content: units 6-10"`

### Task 9: GitHub Pages に公開して iPhone で確認

- [ ] **Step 1: ユーザーに GitHub でリポジトリ作成を依頼**（名前の提案：`spanish-study`、Public、README なし）
- [ ] **Step 2: `git remote add origin https://github.com/yuasaru-afk/spanish-study.git` → `git push -u origin main`**。認証で失敗したら VS Code の「ソース管理」→「プッシュ」をユーザーに依頼
- [ ] **Step 3: ユーザーに Settings → Pages → Branch: main / (root) → Save を依頼**
- [ ] **Step 4: `curl -s -o /dev/null -w "%{http_code}" https://yuasaru-afk.github.io/spanish-study/` が 200、`.../content/u10.json` も 200**
- [ ] **Step 5: ユーザーの iPhone 確認**（チェックリストを渡す）：Safari で開く→ホーム画面に追加→起動／u01 を途中まで→アプリを閉じて再起動で続きから／機内モードでも全ユニット開ける／🔊 がスペイン語で鳴る／発音練習オンでマイク判定（ダメなら判定なし表示）／文字サイズ特大・ダークモード／書き出しで「ファイル」に保存できる
- [ ] **Step 6: 結果を `020スペイン語学習/CLAUDE.md` の「状態」に反映し、`HANDOFF.md` に「1〜2週間使ってから調整・残りユニット追加」の次の一手を書く**。Commit・push
