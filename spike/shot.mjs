// 目視確認用の撮影（使い捨て）。撮影ごとに Edge を起動し直し、CDP で iPhone 幅に撮る。
// 1つの Edge で画面を次々開くと、社内PCでは読み込みが時々止まるため（原因不明）。
// node spike/shot.mjs <jobs.json>   事前に node spike/serve.mjs 8766
// jobs: [{ "out": "out/x.png", "hash": "#/", "state": {...}|null, "steps": ["JS式", ...], "dark": false }]
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://127.0.0.1:8766/';
const jobs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const wait = ms => new Promise(r => setTimeout(r, ms));

async function shoot(job, port) {
  const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'edge-'))}`, '--no-first-run', '--no-proxy-server', 'about:blank']);
  try {
    let ws;
    for (let i = 0; i < 100 && !ws; i++) {
      if (i) await wait(200);
      try {
        const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page');
        if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
      } catch { /* まだ起動中 */ }
    }
    await new Promise(r => ws.addEventListener('open', r, { once: true }));
    let id = 0;
    const pending = new Map();
    ws.addEventListener('message', e => {
      const m = JSON.parse(e.data);
      if (m.method === 'Runtime.exceptionThrown') console.log('EXC', m.params.exceptionDetails.exception?.description?.slice(0, 200));
      if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    });
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    const evalJs = async expr => {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) console.log('JS error:', expr.slice(0, 80), r.result.exceptionDetails.exception?.description?.slice(0, 120));
      return r.result?.result?.value;
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: job.dark ? 'dark' : 'light' }] });
    await send('Page.navigate', { url: BASE + 'manifest.webmanifest' });
    await wait(500);
    await evalJs(`localStorage.clear(); localStorage.setItem('es-app-install-hint','1'); ${job.state ? `localStorage.setItem('es-app-v1', ${JSON.stringify(JSON.stringify(job.state))});` : ''} true`);
    await send('Page.navigate', { url: BASE + (job.hash || '#/') });
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) { ready = await evalJs("!!document.querySelector('#app .topbar')"); if (!ready) await wait(150); }
    if (!ready) console.log('NOT READY', job.out, await evalJs("document.readyState + ' ' + document.getElementById('app').textContent.slice(0, 30)"));
    await wait(300);
    for (const step of job.steps || []) { await evalJs(step); await wait(400); }
    const errs = await evalJs('window.__errors || []');
    if (errs?.length) console.log('page errors:', errs);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    mkdirSync(dirname(job.out), { recursive: true });
    writeFileSync(job.out, Buffer.from(shot.result.data, 'base64'));
    console.log('saved', job.out);
    ws.close();
  } finally {
    // edge.kill() は起動役だけ止めて子プロセス（数百個）が残る。木ごと止める
    spawnSync('taskkill', ['/PID', String(edge.pid), '/T', '/F']);
  }
}

for (const [i, job] of jobs.entries()) await shoot(job, 9333 + i);

// taskkill /T でも子 Edge が残ることがある（2026-10-24 に20個残った）。最後に一時フォルダで絞って全部止める
const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('./cleanup-edge.ps1', import.meta.url))], { encoding: 'utf8' });
console.log((r.stdout || '').trim() || r.stderr);
