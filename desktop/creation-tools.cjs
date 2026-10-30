// macOS creation preflight shared by doctor and the local API. Never installs software.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const installations = require('./agent-installation.cjs');
const media = require('./media-tools.cjs');
const exec = promisify(execFile);
const executable = file => { try { fs.accessSync(file, fs.constants.X_OK); return path.isAbsolute(file) && fs.statSync(file).isFile(); } catch { return false; } };
const PYTHON_ENV = {PYTHONNOUSERSITE:'1', PYTHONDONTWRITEBYTECODE:'1', PYTHONPATH:''};
const {SAMPLE_ARGS, sampleArgs, renderArgs} = require('../shared/browser-launch.cjs');
const fixes = {
 python: 'macOS：brew install python；然後 python3 -m venv "$HOME/.opentake-venv" && "$HOME/.opentake-venv/bin/python3" -m pip install numpy。啟動 OpenTake 前設定 LINKREADER_PYTHON 為該直譯器的絕對路徑。',
 chromium: '在 Standard 原始碼目錄執行：npx --no-install playwright-core install chromium。若指定了瀏覽器路徑，請先核對或清除 CW_HFX_CHROME、CW_CHROME、PLAYWRIGHT_CHROMIUM_EXECUTABLE 的舊值；需要自選時，僅設定 PLAYWRIGHT_CHROMIUM_EXECUTABLE 為相容 Chromium 的絕對路徑。已安裝仍失敗時，請保留失敗階段與路徑交給維護者檢查，再點“重新檢查”；不要關閉 Codex 沙盒或自行放寬系統許可權。',
 ffmpeg: 'macOS：brew install ffmpeg。需要同時包含 ffmpeg 和 ffprobe；也可設定 LINKREADER_BIN_DIR 為兩者所在目錄。',
 codex: 'macOS：npm install -g @openai/codex，然後在終端執行 codex login；登入後重新檢查。'
};
// Default: only the agent sample mode. The server explicitly passes renderArgs().
async function probeBrowser(chromium, file, env, args = sampleArgs(env.CW_CHROME_GL)) {
 let browser;
 try {
  browser = await chromium.launch({executablePath:file, headless:true, args, env, timeout:10000});
  const page = await browser.newPage({viewport:{width:64,height:64}});
  page.setDefaultTimeout(5000);
  await page.setContent('<html><body>OpenTake</body></html>');
  await page.screenshot({timeout:5000});
 } finally { await browser?.close(); }
}
async function probeSandbox(codex,file,env) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'opentake-browser-check-'));
 const tmp=path.join(root,'tmp');fs.mkdirSync(tmp);
 try {
  const result=await exec(codex,['sandbox',
   '-c','sandbox_mode="workspace-write"',
   '-c','sandbox_workspace_write.network_access=false',
   '-c','sandbox_workspace_write.exclude_slash_tmp=true',
   '-c','sandbox_workspace_write.exclude_tmpdir_env_var=true',
   '--',process.execPath,path.join(__dirname,'probe-creation-browser.cjs'),file],
   {cwd:root,env:{...env,TMPDIR:tmp,...(process.versions.electron?{ELECTRON_RUN_AS_NODE:'1'}:{})},timeout:40000,maxBuffer:65536});
  if(!result.stdout.includes('OPENTAKE_BROWSER_READY'))throw Error('未完成截圖');
 } finally { fs.rmSync(root,{recursive:true,force:true}); }
}
async function doctor(options = {}) {
 const env = options.env || installations.loginEnvironment(process.env, true);
 const run = options.run || ((file,args,extra={}) => exec(file,args,{env,timeout:8000,maxBuffer:65536,...extra}));
 const items = [], tools = {};
 async function check(id,label,fn) {
  try { const result = await fn(); items.push({id,label,ok:true,...result}); }
  catch(e) { items.push({id,label,ok:false,message:e.message,install:fixes[id],color:'#9869dc'}); }
 }
 await check('codex','Codex 登入',async()=>{
  let file;
  try { file = options.codexPath ? options.codexPath() : installations.resolveAgent('codex','',{env}); }
  catch { throw Error('未找到可執行的 Codex CLI'); }
  try { await run(file,['login','status']); }
  catch { throw Error('Codex 尚未登入，或無法讀取登入狀態'); }
  // Never expose login-status stdout/stderr: it can contain account information.
  tools.codex=file; return {path:file,version:'已登入'};
 });
 await check('python','Python 3 + numpy',async()=>{
  const configured = env.LINKREADER_PYTHON;
  const candidates = configured ? [configured] : [...new Set([
   path.join(env.HOME || require('node:os').homedir(),'.opentake-venv/bin/python3'),
   ...(env.PATH || '').split(':').filter(path.isAbsolute).map(dir=>path.join(dir,'python3')),
   '/opt/homebrew/bin/python3','/usr/local/bin/python3','/usr/bin/python3'
  ])];
  const failures = [];
  for(const file of candidates) {
   if(!executable(file)) { if(configured) failures.push(`${file} 不存在或不可執行`); continue; }
   try {
    const {stdout} = await run(file,['-c','import sys, numpy; assert sys.version_info.major == 3; print(sys.version.split()[0] + " / numpy " + numpy.__version__)'],{env:{...env,...PYTHON_ENV}});
    tools.python = file; return {path:file,version:stdout.trim()};
   } catch(e) { failures.push(`${file}：${/No module named ['"]numpy/.test(e.stderr || '') ? '缺少 numpy' : 'Python 或 numpy 無法執行'}`); }
  }
  throw Error(failures.join('；') || '未找到 Python 3');
 });
 await check('chromium','HyperFrames Chromium',async()=>{
  const chromium = options.chromium || require('playwright-core').chromium;
  const override = env.CW_HFX_CHROME || env.CW_CHROME || env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  // Let Playwright resolve its own installed headless-shell revision; never scan caches or temporary apps.
  const file = override || (options.browserPath || require('playwright-core/lib/coreBundle').registry.registry.findExecutable('chromium-headless-shell').executablePath());
  if(!file || !executable(file)) throw Error('Chromium 不存在或不可執行：'+file);
  try { await probeBrowser(chromium,file,env,renderArgs()); }
  catch { throw Error('Chromium 已找到，但服務端算圖模式啟動或頁面截圖失敗：'+file); }
  if(!tools.codex)throw Error('請先完成 Codex 安裝及登入，再重新檢查 Chromium');
  try { await (options.probeSandbox || probeSandbox)(tools.codex,file,env); }
  catch { throw Error('Chromium 在出片沙盒中無法啟動或截圖：'+file+'。請保留此提示交給維護者檢查；不會啟動AI 助理。'); }
  tools.chromium=file; return {path:file,version:'服務端算圖模式、出片沙盒單程序樣張模式均已完成截圖'};
 });
 await check('ffmpeg','FFmpeg / ffprobe',async()=>{
  const found = (options.findMedia || media.findTools)({env,loginEnv:env});
  const versions=[];
  for(const name of ['ffmpeg','ffprobe']) {
   try { const {stdout}=await run(found[name],['-version']); versions.push(stdout.split('\n')[0]); }
   catch { throw Error(name+' 已找到，但無法執行：'+found[name]); }
  }
  tools.ffmpeg=found.ffmpeg; tools.ffprobe=found.ffprobe;
  return {path:found.ffmpeg+'\n'+found.ffprobe,version:versions.join('\n')};
 });
 items.sort((a,b)=>['python','chromium','ffmpeg','codex'].indexOf(a.id)-['python','chromium','ffmpeg','codex'].indexOf(b.id));
 return {ok:items.every(item=>item.ok),checkedAt:new Date().toISOString(),items,...(items.every(item=>item.ok)?{tools}:{}),color:'#9869dc'};
}
module.exports={doctor,probeBrowser,probeSandbox,PYTHON_ENV,SAMPLE_ARGS};
