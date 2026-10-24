# 第2版（レッスン区切り・単語集・XP/レベル） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1ユニット＝1レッスン（文法の要点→練習→単語チェック8語）に組み替え、単語集・振り返りレッスン・文法ノートの確認問題・XP/レベル/バッジ/学習記録を足す。

**Architecture:** 初版の構成（素の ES modules、純粋ロジックは Node テスト、画面は `js/views/`）を踏襲。新しい純粋ロジックは `js/progress.js`（XP・レベル・バッジ・単語の状態）と `js/store.js`（記録の更新）と `js/flow.js`（レッスンの段・単語チェックの選び方・振り返りの組み立て）に置く。画面はテストせず、最小限のヘッドレス撮影で確認する。

**Tech Stack:** 初版と同じ（依存なし、`node --test`）。

**Spec:** `docs/superpowers/specs/2026-10-24-v2-lessons-progress-design.md`（初版 spec `2026-10-24-spanish-app-design.md` も有効）

## Global Constraints

- 記録キーは `es-app-v1` のまま。初版の記録を読めること（sanitize で新項目を既定値で埋める）
- XP：正解 10／間違い 2／単語チェック1語 2／レッスン完了 +20（初回のみ）／振り返り完了 +30／文法ノートの確認問題の正解 5。練習・確認問題の XP は1問につき1日1回まで
- レベル n→n+1 に必要な XP ＝ 100 + 20×(n−1)。レベル1から
- バッジ：単語 25/50/100/200、連続 3/7/30日、ユニット 3/5/10完了、振り返り 1/5回
- 単語の状態：記録なし＝まだ／step −1〜0＝あやしい／step 1以上＝覚えた
- 間違えた問題：id は `uNN:問題番号`。どこかで1回正解で外す。新しい順に最大50
- 振り返り：初回完了レッスンが3回たまったらホームに1回分出す。任意（進行は止めない）。10問程度
- 単語チェック：そのユニットの記録なしの語から最大8語。✗忘れてた＝again、○覚えてた＝good
- 単語集の範囲：`units[id]` があるユニット（開いたことがある）の単語のみ
- 画面撮影は最小限、撮影後に残り Edge を数える（spike/shot.mjs が最後に cleanup-edge.ps1 を回す）

## Review Focus

1. **初版の記録を持った iPhone で新版を開く**（練習・単語・フレーズ段の途中、完了済みユニットあり）→ 落ちずに、完了は残り、途中のユニットは spec 4章の移行どおり再開（Task 2 の移行テスト）
2. **単語チェックの途中で閉じて開き直す** → 同じ8語の続きから（記録が付いた語が対象から外れて並びがずれない）（Task 3 のテスト）
3. **同じユニットを何度もやり直す** → XP は1問1日1回、完了ボーナス・振り返りカウント・バッジは増えない（Task 2 のテスト）
4. **振り返りの材料が少ない**（間違いゼロ・忘れた単語ゼロ）→ 終えたユニットの問題で埋めて10問程度、材料が全く無ければ振り返りを出さない（Task 3 のテスト）
5. **日付をまたいで使う**（夜にレッスン→翌朝）→ カレンダー・連続日数・1日1回の XP 上限が現地日付で切り替わる（Task 2 のテスト）

---

## 記録データ（State）の追加項目

```
xp: number                         累計 XP
daily: { [day:number]: number }    日ごとの XP（直近 60 日だけ残す）
answered: { [qid]: day }           練習・確認問題で XP を付けた日（1問1日1回の判定）
mistakes: string[]                 間違えた問題 id（新しい順、最大50）
badges: string[]                   取ったバッジ id
firstDone: number                  初回完了したレッスン数（バッジ・振り返り用）
sinceReview: number                前回の振り返り以降に初回完了したレッスン数
reviews: number                    振り返り完了回数
units[id].pos.ids?: string[]       単語チェック段の対象語 id（段に入った時に確定）
```

レッスンの段：`points`（文法の要点）→ `practice` → `words`。初版の段名の移行：`explain`→`points`、`phrases`/`speak`→`words`。

教材の追加：各ユニットに `"points": { "lines": ["…", "…", "…"], "examples": [{ "es": "…", "ja": "…" }] }`。

---

### Task 1: XP・レベル・バッジ・単語の状態（js/progress.js）

**Files:** Create `js/progress.js`, `tests/progress.test.mjs`

**Interfaces（Produces）:**
- `XP = { correct: 10, wrong: 2, word: 2, lesson: 20, review: 30, grammar: 5 }`
- `levelInfo(xp: number) -> { level, into, need }`（into＝今のレベルでたまった分、need＝次まで必要な総量）
- `wordStatus(card | undefined) -> 'new' | 'shaky' | 'learned'`
- `learnedCount(cards) -> number`
- `BADGES: [{ id, label, test(stats) }]`、`stats = { learned, streak, firstDone, reviews }`
- `newBadges(have: string[], stats) -> string[]`（まだ持っていない達成済みバッジ id）

- [ ] **Step 1: 失敗するテスト**：`levelInfo(0)={level:1,into:0,need:100}`、`levelInfo(100)={level:2,into:0,need:120}`、`levelInfo(219)={level:2,into:119,need:120}`、`levelInfo(220).level===3`／`wordStatus(undefined)==='new'`、`{step:-1}`・`{step:0}`→`shaky`、`{step:1}`→`learned`／`newBadges([], {learned:25,streak:3,firstDone:0,reviews:0})` が `['words25','streak3']`、既に持っているものは返さない
- [ ] **Step 2: FAIL 確認** → **Step 3: 実装** → **Step 4: `node --test` PASS** → **Step 5: Commit**

### Task 2: 記録の更新（js/store.js）

**Files:** Modify `js/store.js`, `tests/store.test.mjs`

**Interfaces（Produces）:**
- `defaultState()` に上記の追加項目（xp 0、daily {}、answered {}、mistakes []、badges []、firstDone 0、sinceReview 0、reviews 0）
- `addXp(state, amount, today) -> State`（xp と daily[today] を加算、daily は直近60日だけ残す）
- `recordAnswer(state, qid, correct, today, xpCorrect = XP.correct) -> State`：answered[qid] が today でなければ XP（正解 xpCorrect／間違い XP.wrong）を付けて answered[qid]=today。正解なら mistakes から外す。間違いなら mistakes の先頭へ（重複なし、50件まで）
- `checkWord(state, wordId, remembered, today) -> State`：cards を good/again で更新、XP.word を加算
- `completeLesson(state, unitId, today) -> State`：`finishUnit` ＋ 初回（units[unitId].done が false だった）なら XP.lesson、firstDone+1、sinceReview+1
- `completeReview(state, today) -> State`：XP.review、reviews+1、sinceReview=0
- `migrateStage(stage) -> 'points'|'practice'|'words'`
- sanitize：新項目を検査・既定値で埋める。`units[*].pos.stage` と `resume.stage` を migrateStage で移行。`pos.ids` は文字列配列のみ残す

- [ ] **Step 1: 失敗するテスト**：
  - 同じ qid を同日に2回正解しても XP は10だけ／翌日なら再び10
  - 間違いで mistakes 先頭に入り、正解で外れる／51件目で最古が落ちる
  - checkWord(○) で cards が `{step:0,due:today+1}`・XP+2、(✗) で `{step:0,due:today}`
  - completeLesson：初回 +20・firstDone 1・sinceReview 1、2回目は XP・カウント変わらず
  - completeReview：+30・reviews 1・sinceReview 0
  - daily：60日より古い日は消える
  - 初版の記録（xp 等なし、`units.u03.pos={stage:'explain',index:2}`、`resume.stage='speak'`）を load → xp 0、u03.pos.stage 'points'、resume.stage 'words'
- [ ] **Step 2: FAIL** → **Step 3: 実装** → **Step 4: PASS** → **Step 5: Commit**

### Task 3: レッスンの段・単語チェック・振り返り（js/flow.js）

**Files:** Modify `js/flow.js`, `tests/lesson-flow.test.mjs`

**Interfaces（Produces）:**
- `STAGE_NAMES = { points: '文法', practice: '練習', words: '単語' }`
- `stagesFor(unit, wordIds) -> Stage[]`（`points` は unit.points があれば、`words` は wordIds が空でなければ）
- `pickCheckWords(unit, cards, max = 8) -> string[]`（記録なしの語 id を教材順に最大8）
- `stageLength(unit, stage, wordIds)`、`nextPosition(unit, wordIds, pos)`（初版の settings 引数は不要になる）
- `buildReview({ mistakes, cards, doneUnits: Unit[], today, size = 10 }) -> Item[]`：`{kind:'q', qid, unitId, index}` と `{kind:'w', wordId}`。間違えた問題（最大6）→ 今日の復習対象の単語（again/期限切れ、最大4）→ 足りなければ終えたユニットの問題を決まった順で埋める。材料ゼロ（doneUnits 空）なら []
- `grammarQuiz(unit, today, n = 3) -> number[]`（その日に応じてずらした練習問題の番号）

- [ ] **Step 1: 失敗するテスト**：
  - pickCheckWords は記録のある語を除き最大8
  - 単語段に入った時の ids を pos に保存しておけば、記録が付いた後も stageLength が変わらない（nextPosition が ids を使う）
  - stagesFor は wordIds 空なら words を除く
  - buildReview：間違い6＋単語4、間違い0なら単語と埋め問題で10、doneUnits 空なら []
  - grammarQuiz は同じ日なら同じ番号、問題数が3未満なら全部
- [ ] **Step 2: FAIL** → **Step 3: 実装** → **Step 4: PASS** → **Step 5: Commit**

### Task 4: 教材に「文法の要点」を足す

**Files:** Modify `content/u01〜u10.json`、`tools/validate-content.mjs`、`tests/validate-content.test.mjs`、`tests/fixtures/good-unit.json`

- [ ] **Step 1: 失敗するテスト**：points が無い／lines が空／examples の es にカタカナ → エラー
- [ ] **Step 2: FAIL** → **Step 3: validator 実装**
- [ ] **Step 4: 10ユニットに points を書く**（lines 3行前後・各40字以内、examples 1〜2）
- [ ] **Step 5: validate exit 0、別エージェントでスペイン語の見直し（points と、前回3択化で増えた誤答選択肢の why）→ 直す**
- [ ] **Step 6: gen-precache、`node --test` PASS、Commit**

### Task 5: レッスン画面の組み替え・完了画面・文法ノートの確認問題

**Files:** Modify `js/views/lesson.js`, `js/views/grammar.js`, `js/views/common.js`, `css/app.css`

- レッスン：段は `points` → `practice` → `words`。points 画面は lines と examples（🔊）。practice は回答時に `recordAnswer(state, 'uNN:i', ok, today)`（redraw なし）。words 段：入る時に `pickCheckWords` で ids を確定して pos に保存、カードをタップで意味→「✗ 忘れてた／○ 覚えてた」で `checkWord` して次へ
- 完了：`completeLesson`。完了画面に「+XP」「レベル n（次まで x）」、レベルが上がっていれば 🎉 レベルアップ表示、新しいバッジがあれば表示（`newBadges` → badges に追加）
- 初版の phrases/speak 段の画面関数は単語集（Task 6）へ移す
- 文法ノート：ユニット解説の下に「確認問題を解く（3問）」。`grammarQuiz` の問題を練習と同じ部品で出し、`recordAnswer(..., XP.grammar)`。終わったら文法ノートへ戻る
- [ ] 実装 → `node --test` PASS → 撮影（points／単語チェック／完了＋レベルアップ／確認問題の4枚、撮影後に Edge 残り0を確認）→ Commit

### Task 6: ホーム・単語集・振り返り・学習記録

**Files:** Modify `js/views/home.js`, `js/views/review.js`, `js/main.js`; Create `js/views/wordbook.js`, `js/views/stats.js`, `js/views/recap.js`

- ホーム：上部に レベル・XP バー・🔥連続日数。`sinceReview >= 3` かつ `buildReview` が空でなければ「振り返りレッスン」カード。メニュー：文法ノート／単語集／記録／設定
- 単語集 `#/words`：切り替え「単語｜フレーズ」。単語は開いたユニット順に一覧（状態バッジ：覚えた／あやしい／まだ）。上に「今日の復習 N」（既存 `#/review`）と「新しい単語を覚える」（`#/words/new`：範囲内の記録なし語を最大8、checkWord）。フレーズは開いたユニットの phrases を一覧（🔊、🌎）、設定で発音オンなら各フレーズに「🎤 発音練習」（初版の speak 画面を流用）
- 振り返り `#/recap`：`buildReview` の10問を順に（問題は練習と同じ部品、単語はカードで ○/✗）。終わったら `completeReview`、完了画面は Task 5 と同じ部品。途中で閉じたら最初から（記録しない）
- 記録 `#/stats`：levelInfo のバー、連続日数、直近5週間のカレンダー（daily の XP で濃さ3段階）、覚えた単語数、終えたユニット数、バッジ一覧（取った／まだ）
- [ ] 実装 → `node --test` PASS → 撮影（ホーム／単語集／振り返り1問／記録の4枚、Edge 残り0）→ Commit

### Task 7: 仕上げ

- [ ] HANDOFF.md・CLAUDE.md を第2版に更新、iPhone の確認項目を差し替え
- [ ] 全体レビュー（別エージェント）→ 重要な指摘を修正
- [ ] push → 公開反映を確認
