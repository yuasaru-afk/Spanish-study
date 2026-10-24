// 教材 JSON の形と中身を検査する。CLI: node tools/validate-content.mjs content
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const KATAKANA = /[゠-ヿ]/;
const ARTS = ['el', 'la', null];

const blank = v => typeof v !== 'string' || v.trim() === '';

// スペイン語が入るフィールドを [場所, 文字列] で列挙する
function spanishTexts(u) {
  const out = [];
  const add = (where, s) => { if (typeof s === 'string') out.push([where, s]); };
  (u.explain || []).forEach((e, i) => (e.examples || []).forEach((x, j) => add(`explain[${i}].examples[${j}].es`, x.es)));
  (u.points?.examples || []).forEach((x, j) => add(`points.examples[${j}].es`, x.es));
  (u.practice || []).forEach((q, i) => {
    add(`practice[${i}].es`, q.es);
    (q.tokens || []).forEach(t => add(`practice[${i}].tokens`, t));
    (q.accept || []).flat().forEach(t => add(`practice[${i}].accept`, t));
    (q.options || []).forEach(o => add(`practice[${i}].options.text`, o.text));
    (q.answers || []).forEach(a => add(`practice[${i}].answers`, a));
  });
  (u.words || []).forEach((w, i) => { add(`words[${i}].es`, w.es); add(`words[${i}].latam.es`, w.latam?.es); });
  (u.phrases || []).forEach((p, i) => { add(`phrases[${i}].es`, p.es); add(`phrases[${i}].latam.es`, p.latam?.es); });
  (u.speak || []).forEach((s, i) => add(`speak[${i}].es`, s.es));
  return out;
}

export function validateUnit(u, seenWordIds) {
  const e = [];
  for (const k of ['id', 'title', 'summary']) if (blank(u[k])) e.push(`${k} がない`);
  for (const k of ['explain', 'practice', 'words', 'phrases', 'speak']) if (!Array.isArray(u[k])) e.push(`${k} が配列でない`);
  if (e.length) return e;

  if (u.explain.length === 0) e.push('explain が空');
  // レッスン最初の「文法の要点」
  if (!u.points || !Array.isArray(u.points.lines) || u.points.lines.length === 0 || u.points.lines.some(blank)) e.push('points（文法の要点）の lines がない');
  else (u.points.examples || []).forEach((ex, j) => { if (blank(ex.es) || blank(ex.ja)) e.push(`points.examples[${j}] の es/ja がない`); });
  u.explain.forEach((x, i) => {
    if (blank(x.title) || blank(x.body)) e.push(`explain[${i}] の title/body がない`);
    (x.examples || []).forEach((ex, j) => { if (blank(ex.es) || blank(ex.ja)) e.push(`explain[${i}].examples[${j}] の es/ja がない`); });
  });

  if (u.practice.length === 0) e.push('practice が空');
  u.practice.forEach((q, i) => {
    const at = `practice[${i}]`;
    if (blank(q.prompt) || blank(q.ja)) e.push(`${at} の prompt/ja がない`);
    if (q.type === 'choice') {
      if (!Array.isArray(q.options) || q.options.length < 2) { e.push(`${at} の options は2つ以上`); return; }
      if (q.options.filter(o => o.correct === true).length !== 1) e.push(`${at} の正解はちょうど1つ`);
      q.options.forEach((o, j) => {
        if (blank(o.text)) e.push(`${at}.options[${j}] の text がない`);
        if (blank(o.why)) e.push(`${at}.options[${j}] の why がない`);
      });
    } else if (q.type === 'order') {
      if (!Array.isArray(q.tokens) || q.tokens.length < 2) e.push(`${at} の tokens は2つ以上`);
      if (blank(q.why)) e.push(`${at} の why がない`);
    } else if (q.type === 'fill') {
      e.push(`${at} は fill（キーボード入力）。使わないので choice にする`);
    } else {
      e.push(`${at} の type が不明: ${q.type}`);
    }
  });

  u.words.forEach((w, i) => {
    const at = `words[${i}]`;
    if (blank(w.id) || blank(w.es) || blank(w.ja)) e.push(`${at} の id/es/ja がない`);
    if (!ARTS.includes(w.art ?? null)) e.push(`${at} の art は el/la/null: ${w.art}`);
    if (w.latam && !ARTS.includes(w.latam.art ?? null)) e.push(`${at}.latam の art は el/la/null`);
    if (seenWordIds.has(w.id)) e.push(`${at} の id が重複: ${w.id}`);
    seenWordIds.add(w.id);
  });
  u.phrases.forEach((p, i) => { if (blank(p.es) || blank(p.ja)) e.push(`phrases[${i}] の es/ja がない`); });
  u.speak.forEach((s, i) => { if (blank(s.es) || blank(s.ja)) e.push(`speak[${i}] の es/ja がない`); });

  for (const [where, s] of spanishTexts(u)) if (KATAKANA.test(s)) e.push(`${where} にカタカナ: ${s}`);
  return e;
}

export function validateAll(dir) {
  const index = JSON.parse(readFileSync(join(dir, 'units.json'), 'utf8'));
  const seen = new Set();
  const errors = [];
  for (const entry of index) {
    let unit;
    try { unit = JSON.parse(readFileSync(join(dir, entry.file), 'utf8')); }
    catch (err) { errors.push(`${entry.id}: 読めない (${err.message})`); continue; }
    if (unit.id !== entry.id) errors.push(`${entry.id}: units.json と id が違う (${unit.id})`);
    for (const msg of validateUnit(unit, seen)) errors.push(`${entry.id}: ${msg}`);
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = validateAll(process.argv[2] || 'content');
  errors.forEach(m => console.log(m));
  console.log(errors.length ? `NG: ${errors.length} 件` : 'OK');
  process.exit(errors.length ? 1 : 0);
}
