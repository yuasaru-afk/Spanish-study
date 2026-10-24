// 目視確認用の撮影（使い捨て）。Edge を CDP で操り、iPhone 幅で撮る。
// node spike/shot.mjs <jobs.json>
// jobs: [{ "out": "out/x.png", "hash": "#/", "state": {...}|null, "steps": ["JS式", ...], "dark": false }]
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://127.0.0.1:8765/';
const PORT = 9333;
const jobs = JSON.parse(readFileSync(process.argv[2], 'utf8'));

const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'edge-'))}`, '--no-first-run', 'about:blank']);
const wait = ms => new Promise(r => setTimeout(r, ms));

let ws;
for (let i = 0; i < 50 && !ws; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    const page = list.find(t => t.type === 'page');
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch { await wait(200); }
}
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) console.log('JS error:', expr, r.result.exceptionDetails.exception?.description);
  return r.result?.result?.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

for (const job of jobs) {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: job.dark ? 'dark' : 'light' }] });
  await send('Page.navigate', { url: BASE + 'manifest.webmanifest' });
  await wait(600);
  await evalJs(`localStorage.clear(); localStorage.setItem('es-app-install-hint','1'); ${job.state ? `localStorage.setItem('es-app-v1', ${JSON.stringify(JSON.stringify(job.state))});` : ''} true`);
  await send('Page.navigate', { url: BASE + (job.hash || '#/') });
  await send('Page.reload');
  await wait(900);
  for (const step of job.steps || []) { await evalJs(step); await wait(400); }
  console.log(await evalJs("(window.__h1||\"\")+\" | after: \"+location.hash+\" \"+localStorage.getItem(\"es-app-v1\")"));
  const errs = await evalJs('window.__errors || []');
  if (errs?.length) console.log('page errors:', errs);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  mkdirSync(dirname(job.out), { recursive: true });
  writeFileSync(job.out, Buffer.from(shot.result.data, 'base64'));
  console.log('saved', job.out);
}
ws.close();
edge.kill();
