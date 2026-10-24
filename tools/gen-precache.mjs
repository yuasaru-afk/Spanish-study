// sw.js の VERSION と PRECACHE を配信ファイルから書き直す。
// node tools/gen-precache.mjs [--check] [root]   --check はずれていれば exit 1
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const TOP_FILES = ['index.html', 'manifest.webmanifest'];
const DIRS = ['css', 'js', 'content', 'icons'];

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

export function listFiles(root) {
  const files = TOP_FILES.filter(f => existsSync(join(root, f)));
  for (const d of DIRS) if (existsSync(join(root, d))) files.push(...walk(join(root, d)).map(p => relative(root, p).split('\\').join('/')));
  return files.sort();
}

export function build(root) {
  const files = listFiles(root);
  const hash = createHash('sha1');
  for (const f of files) hash.update(f).update(readFileSync(join(root, f)));
  const version = hash.digest('hex').slice(0, 8);
  const sw = readFileSync(join(root, 'sw.js'), 'utf8')
    .replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`)
    .replace(/const PRECACHE = \[[^\]]*\];/, `const PRECACHE = ${JSON.stringify(['./', ...files])};`);
  return sw;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const root = args.find(a => a !== '--check') || '.';
  const next = build(root);
  const current = readFileSync(join(root, 'sw.js'), 'utf8');
  if (check) {
    if (next !== current) { console.log('sw.js が古い: node tools/gen-precache.mjs を実行'); process.exit(1); }
    console.log('OK');
  } else {
    writeFileSync(join(root, 'sw.js'), next);
    console.log('sw.js を更新');
  }
}
