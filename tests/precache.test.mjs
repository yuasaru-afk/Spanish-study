import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tool = fileURLToPath(new URL('../tools/gen-precache.mjs', import.meta.url));
const repo = fileURLToPath(new URL('..', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' });

function miniSite() {
  const root = mkdtempSync(join(tmpdir(), 'es-site-'));
  writeFileSync(join(root, 'sw.js'), "const VERSION = 'x';\nconst PRECACHE = [];\n");
  writeFileSync(join(root, 'index.html'), '<!doctype html>');
  writeFileSync(join(root, 'manifest.webmanifest'), '{}');
  mkdirSync(join(root, 'content'));
  writeFileSync(join(root, 'content', 'u01.json'), '{}');
  return root;
}

test('生成すると全ファイルが一覧に入る', () => {
  const root = miniSite();
  assert.equal(run(root).status, 0);
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  for (const f of ['./', 'index.html', 'manifest.webmanifest', 'content/u01.json']) assert.ok(sw.includes(`"${f}"`), f);
  assert.doesNotMatch(sw, /VERSION = 'x'/);
});

test('生成後の --check は 0、教材を足すと 1', () => {
  const root = miniSite();
  run(root);
  assert.equal(run('--check', root).status, 0);
  writeFileSync(join(root, 'content', 'u02.json'), '{}');
  assert.equal(run('--check', root).status, 1);
});

test('中身を直すと VERSION が変わり --check は 1', () => {
  const root = miniSite();
  run(root);
  writeFileSync(join(root, 'content', 'u01.json'), '{"a":1}');
  assert.equal(run('--check', root).status, 1);
});

test('このリポジトリの sw.js は最新', () => assert.equal(run('--check', repo).status, 0));
