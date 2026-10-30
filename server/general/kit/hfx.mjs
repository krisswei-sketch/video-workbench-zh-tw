import {sampleArgs} from '../../../shared/browser-launch.cjs';
// hfx — OpenTake's tools for a HyperFrames film, usable inside the agent's sandbox (offline, nothing to install, no port).
//   hfx check        HyperFrames' own lint, plus OpenTake's rules: every visual change is its own clip, sound has a role
//   hfx look [n]     n frames (default 12), drawn exactly as OpenTake's export draws them, tiled into look/sheet.jpg
import {sampleBrowser, sampleResponse, sampleFontStatus} from './hfx-support.mjs';
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url'; import { createRequire } from 'node:module'; import { execFileSync } from 'node:child_process';
const NM = process.env.CW_NODE_MODULES, BIN = process.env.LINKREADER_BIN_DIR, CHROME = process.env.CW_CHROME;
const root = process.env.CW_WORK || process.cwd(), [cmd, arg] = process.argv.slice(2);
const imp = p => import(pathToFileURL(path.join(NM, p)).href);
const say = (...l) => console.log(l.join('\n'));
const tool = name => path.join(BIN, name);
const limits = seconds => ({ min: Math.max(2, Math.floor(seconds / 5)), max: Math.max(8, seconds * 0.5) });
if (cmd === 'plan') {
  const seconds = Number(arg);
  if (!Number.isFinite(seconds) || seconds <= 0) { say('用法：hfx plan <總秒數>'); process.exit(1); }
  const { min, max } = limits(seconds);
  const count = Math.max(min, Math.ceil(seconds / Math.min(5, max)));
  say(`切段規則：至少 ${min} 個畫面子頁面，每段最多 ${max} 秒（重疊也按各段自身長度計算）。`);
  say('建議按講述變化切開，先定片段起止再寫畫面；下面是可調整的時間骨架，不是內容分鏡：');
  say(JSON.stringify(Array.from({ length: count }, (_, i) => ({ file: `compositions/scene-${i + 1}.html`, start: +(i * seconds / count).toFixed(3), end: +((i + 1) * seconds / count).toFixed(3) })), null, 2));
  process.exit(0);
}
if (!fs.existsSync(path.join(root, 'index.html'))) { say('還沒有 index.html（片子的根頁面）'); process.exit(1); }
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

async function clips() {
  const { parseHTML } = await imp('linkedom/esm/index.js');
  const { topLevelElements, trackKindOf, isTimedElement } = await imp('@hyperframes/parsers/dist/index.js');
  const { document } = parseHTML(html);
  const node = el => ({ tag: el.tagName.toLowerCase(), attrs: Object.fromEntries([...el.attributes].map(a => [a.name, a.value])), children: [...el.children].map(node) });
  const rootEl = document.querySelector('[data-composition-id]');
  if (!rootEl) { say('index.html 裡沒有根節點（data-composition-id）'); process.exit(1); }
  return { rootEl, list: topLevelElements(node(rootEl)).filter(isTimedElement).map(n => ({ id: n.attrs.id || n.attrs['data-hf-id'] || n.tag, kind: trackKindOf(n).kind, role: n.attrs['data-ot-role'] || '', start: +n.attrs['data-start'] || 0, dur: +n.attrs['data-duration'] || 0, sub: !!n.attrs['data-composition-src'] })) };
}

if (cmd === 'check') {
  const { lintProject } = await imp('@hyperframes/lint/dist/index.js');
  const r = await lintProject(root);
  const findings = (r.results || []).flatMap(x => (x.result?.findings || []).map(f => ({ ...f, file: x.file }))).filter(f => f.severity !== 'info');
  const { rootEl, list } = await clips();
  const total = +rootEl.getAttribute('data-duration') || Math.max(0, ...list.map(c => c.start + c.dur));
  const by = k => list.filter(c => c.kind === k);
  say(`長度 ${total} 秒；片段：影片 ${by('video').length}、畫面 ${by('graphics').length}、字幕 ${by('captions').length}、聲音 ${by('audio').length}`);
  for (const c of list) say(`  ${c.kind.padEnd(8)} ${c.start.toFixed(2).padStart(6)}–${(c.start + c.dur).toFixed(2).padStart(6)}  ${c.id}${c.role ? ` [${c.role}]` : ''}${c.sub ? ' (子頁面)' : ''}`);
  const problems = findings.filter(f => f.severity === 'error').map(f => `${f.code}: ${f.message}${f.elementId ? ` (#${f.elementId})` : ''}${f.file ? ` [${f.file}]` : ''}`);
  // the person edits the film clip by clip in OpenTake: every visual change has to be its own graphics clip
  const graphics = by('graphics');
  if (graphics.length < limits(total).min) problems.push(`畫面片段太少（${graphics.length} 個）：每一次畫面變化（一組字、一張卡、一個色塊編排、一個演示步驟）都要是根節點下單獨的片段（data-start/data-duration，做成子頁面），不要把整片動態效果寫在一個元素或一條時間線裡`);
  const long = graphics.filter(g => g.dur > limits(total).max);
  if (long.length) problems.push(`這些畫面片段太長，要按畫面變化拆開：${long.map(g => `${g.id}（${g.dur.toFixed(1)} 秒）`).join('、')}`);
  for (const a of by('audio')) if (!/^(voice|music|sfx)$/.test(a.role)) problems.push(`聲音片段 ${a.id} 要標 data-ot-role="voice|music|sfx"`);
  for (const f of findings.filter(f => f.severity === 'warning').slice(0, 12)) say(`提醒 ${f.code}: ${f.message}`);
  if (problems.length) { say(`切段完整規則：至少 ${limits(total).min} 個畫面子頁面；每段最多 ${limits(total).max} 秒。先按畫面變化規劃全部片段，可用 hfx plan ${total} 檢視時間骨架。`); say('', '要改：', ...problems.map(p => `- ${p}`)); process.exit(1); }
  say('', '檢查透過');
} else if (cmd === 'look') {
  const n = Math.max(1, Math.min(48, Number(arg) || 12));
  // no port inside the sandbox: HyperFrames' file server runs in-process (its handler is called directly)
  const { register } = await import('node:module'); register('./hf/hono-loader.mjs', import.meta.url);
  const { createFileServer } = await imp('@hyperframes/producer/dist/index.js');
  const { chromium } = createRequire(path.join(NM, 'x.js'))('playwright-core');
  await createFileServer({ projectDir: root, fps: 30, preHeadScripts: ['globalThis.__HF_RENDER_CAPTURE_MODE = true;'] });
  const shim = fs.readFileSync(new URL('../hf-render-shim.js', import.meta.url), 'utf8');
  const tmp = path.join(root, '.tmp', 'look'); fs.mkdirSync(tmp, { recursive: true });
  const videos = {};
  for (const m of html.matchAll(/<video\b[^>]*\bsrc="([^"]+)"/g)) {
    const page = decodeURIComponent(new URL(m[1], 'http://hf.localhost/').pathname), file = path.join(root, page);
    if (videos[page] || !fs.existsSync(file)) continue;
    const key = `v${Object.keys(videos).length}`, dir = path.join(tmp, key); fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(path.join(dir, '0.jpg'))) execFileSync(tool('ffmpeg'), ['-v', 'error', '-i', file, '-an', '-fps_mode', 'passthrough', '-q:v', '4', '-vf', 'scale=960:-2', '-start_number', '0', path.join(dir, '%d.jpg')]);
    const pts = execFileSync(tool('ffprobe'), ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'csv=p=0', file], { maxBuffer: 64 << 20 }).toString().trim().split('\n').map(l => parseFloat(l)).filter(Number.isFinite);
    videos[page] = { key, count: fs.readdirSync(dir).length, pts: pts.map(x => Math.round((x - pts[0]) * 1e6) / 1e6) };
  }
  // Full Chrome needs macOS application services unavailable inside the offline
  // agent sandbox. Without an override Playwright selects its headless shell.
  const sampleChrome = sampleBrowser(process.env);
  const browser = await chromium.launch({ executablePath: sampleChrome, args: sampleArgs(process.env.CW_CHROME_GL) });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    let resourceFailure;
    const compressedAssets = new Map();
    await page.route('**/*', async route => {
      try {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/__ot_frames/')) return route.fulfill({ body: fs.readFileSync(path.join(tmp, url.pathname.slice(13))), contentType: 'image/jpeg' });
      if (url.origin !== 'http://hf.localhost') return route.abort();
      if (/\.(mp4|mov|m4v|webm|wav|mp3|m4a|aac|ogg)$/i.test(url.pathname)) return route.fulfill({ body: '', contentType: 'application/octet-stream' });
      const r = await globalThis.__hfFetch(new Request(url.href, { headers: route.request().headers() }));
      let body = Buffer.from(await r.arrayBuffer());
      if (url.pathname === '/' || url.pathname === '/index.html') body = Buffer.from(String(body).replace(/<\/body>/i, `<script>window.__otFps=30;window.__otVideos=${JSON.stringify(videos)}</script><script>${shim}</script></body>`));
      if (r.status >= 400) throw Error(`樣張資源讀取失敗（${r.status}）：${url.pathname}`);
      const response = sampleResponse(body, Object.fromEntries(r.headers), url.href, compressedAssets);
      return await route.fulfill({ status: r.status, ...response });
      } catch(error) { resourceFailure = error; await route.abort().catch(() => {}); }

    });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://hf.localhost/index.html');
    if (resourceFailure) throw resourceFailure;
    await page.waitForFunction(() => window.__otRender, null, { timeout: 30000 });
    const comp = await page.evaluate(() => window.__otRender.select('main'));
    const fontAudit = [{frame: 0, fonts: await page.evaluate(sampleFontStatus)}];
    for (let i = 0; i < n; i++) {
      const frame = Math.min(comp.durationInFrames - 1, Math.round((i + 0.5) / n * comp.durationInFrames));
      await page.evaluate(f => window.__otRender.seek(f), frame);
      fontAudit.push({frame, fonts: await page.evaluate(sampleFontStatus)});
      await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 80 });
    }
    if (resourceFailure) throw resourceFailure;
    if (errors.length) throw Error('樣張頁面報錯：'+errors.slice(0,5).join('；'));
    fs.mkdirSync(path.join(root, 'look'), { recursive: true });
    fs.writeFileSync(path.join(root, 'look', 'font-audit.json'), JSON.stringify(fontAudit, null, 2) + '\n');
    const cols = 4, rows = Math.ceil(n / cols);
    execFileSync(tool('ffmpeg'), ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(tmp, 'f%02d.jpg'), '-vf', `scale=480:-2,tile=${cols}x${rows}`, '-frames:v', '1', path.join(root, 'look', 'sheet.jpg')]);
    say(`接觸表：look/sheet.jpg（${n} 幀，從左到右、從上到下，每 ${(comp.durationInFrames / 30 / n).toFixed(2)} 秒一幀）`, '用 view_image 開啟看一遍。');
  } finally { await browser.close(); }
} else say('用法：hfx check | hfx look [影格數]');
