const {app, BrowserWindow, Menu, dialog, desktopCapturer, ipcMain, session, shell, systemPreferences} = require('electron');
const {spawn} = require('node:child_process');
const {killTree,buildTarget} = require('./platform.cjs');
const path = require('node:path');
const fs = require('node:fs');
const {APP_NAME, APP_ID, sameOrigin, userDataPath, rememberedPort} = require('./policy.cjs');
app.setName(APP_NAME);
app.setPath('userData', userDataPath(app.getPath('appData')));
app.setAppUserModelId(APP_ID);
let win, child, origin, closing = false;
const root = path.resolve(__dirname, '..');
const trusted = event => Boolean(win && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame && sameOrigin(event.senderFrame.url, origin));
function stopService() {
 if (!child?.pid) return;
 // The service owns a separate process group, including media workers. Never kill unrelated tools.
 if(child.connected)child.disconnect();
 const owned=child;const timer=setTimeout(()=>{if(owned.exitCode===null)killTree(owned.pid);},2000);timer.unref();
}
function permissions() {
 const ses = session.defaultSession;
 ses.setPermissionCheckHandler((contents, permission, requestingOrigin) => contents === win?.webContents && sameOrigin(requestingOrigin, origin) && ['display-capture','media'].includes(permission));
 ses.setPermissionRequestHandler((contents, permission, callback, details) => callback(contents === win?.webContents && sameOrigin(details.requestingUrl || contents.getURL(), origin) && ['display-capture','media'].includes(permission)));
 ses.setDisplayMediaRequestHandler(async (request, callback) => {
  if (!win || request.frame !== win.webContents.mainFrame || !sameOrigin(request.securityOrigin, origin) || !request.userGesture) return callback({});
  try {
   const sources = await desktopCapturer.getSources({types:['window','screen'],thumbnailSize:{width:0,height:0}});
   if (!sources.length) return callback({});
   const result = await dialog.showMessageBox(win,{type:'question',title:'選擇錄製內容',message:'選擇要錄製的視窗或螢幕',detail:'只錄製你準備展示的內容。',buttons:[...sources.map(s=>s.name),'取消'],cancelId:sources.length,noLink:true});
   const source = sources[result.response]; callback(source ? {video:source} : {});
  } catch { callback({}); }
 }, {useSystemPicker:false});
 ipcMain.handle('standard:screen-help', async event => {
  if (!trusted(event)) throw Error('無效視窗');
  if(process.platform==='win32'){await dialog.showMessageBox(win,{type:'info',title:'螢幕錄製',message:'請在錄製視窗中選擇要共享的螢幕或視窗。',detail:'如果被系統或組織政策封鎖，請檢查 Windows 的螢幕擷取權限。'});return;}
  const result = await dialog.showMessageBox(win,{type:'info',title:'開啟螢幕錄製權限',message:'請允許 剪輯工作台（非官方繁中版） 錄製螢幕',detail:'開啟「系統設定 → 隱私與安全性 → 螢幕與系統音訊錄製」，允許 剪輯工作台（非官方繁中版），然後結束並重新開啟。開發模式下名稱可能顯示為 Electron。',buttons:['開啟系統設定','稍後'],cancelId:1});
  if (result.response === 0) await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
 });
 ipcMain.handle('standard:screen-status', event => {
  if (!trusted(event)) throw Error('無效視窗');
  return process.platform === 'darwin' ? systemPreferences.getMediaAccessStatus('screen') : 'unknown';
 });
}
async function start() {
 if(process.platform==='win32')buildTarget();
 const profile = app.getPath('userData');
 fs.mkdirSync(profile,{recursive:true});
 const env = {...require('./runtime-tools.cjs').runtimeToolEnvironment(profile),ELECTRON_RUN_AS_NODE:'1',
  OPENTAKE_STANDARD_USER_DATA:profile,
  LINKREADER_SYSTEM_SETTINGS_FILE:process.env.LINKREADER_SYSTEM_SETTINGS_FILE || path.join(profile,'system-settings.json'),
  LINKREADER_AGENT_SETTINGS_FILE:process.env.LINKREADER_AGENT_SETTINGS_FILE || path.join(profile,'agent-settings.json')};
 let previous;try{previous=JSON.parse(fs.readFileSync(path.join(profile,'startup.json'),'utf8'))}catch{}
 child = spawn(process.execPath,[path.join(__dirname,'service.mjs'),app.isPackaged?'production':'development',String(rememberedPort(previous))],{cwd:root,env,detached:true,stdio:['ignore','inherit','inherit','ipc']});
 origin = await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('本機服務啟動逾時，請檢查依賴安裝。')),60000);
  child.once('error',reject);child.once('exit',()=>{clearTimeout(timer);reject(Error('本機服務未能啟動。'))});
  child.on('message',message=>{if(message?.ready&&/^http:\/\/127\.0\.0\.1:\d+$/.test(message.ready)){clearTimeout(timer);resolve(message.ready)}});
 });
 child.on('exit',()=>{if(!closing){dialog.showErrorBox('本機服務已退出','請結束並重新開啟 剪輯工作台（非官方繁中版）。已有專案仍儲存在磁碟。');app.quit()}});
 win = new BrowserWindow({title:APP_NAME,width:1320,height:900,minWidth:640,minHeight:620,backgroundColor:'#202827',icon:path.join(root,'public/community-icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 if(process.platform==='darwin')app.dock.setIcon(path.join(root,'public/community-icon.png'));
 permissions();
 require('./client-update.cjs').installUpdateIPC({app,ipcMain,trusted,root,getOrigin:()=>origin});
 win.webContents.on('will-navigate',(event,url)=>{if(!sameOrigin(url,origin))event.preventDefault()});
 win.webContents.setWindowOpenHandler(({url})=>{if(sameOrigin(url,origin))void win.loadURL(url);return {action:'deny'}});
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:APP_NAME,submenu:[{role:'about',label:'關於剪輯工作台（非官方繁中版）'},{type:'separator'},{role:'hide',label:'隱藏剪輯工作台'},{role:'quit',label:'結束剪輯工作台'}]},{label:'編輯',submenu:[{role:'undo',label:'復原'},{role:'redo',label:'重做'},{type:'separator'},{role:'cut',label:'剪下'},{role:'copy',label:'複製'},{role:'paste',label:'貼上'},{role:'selectAll',label:'全選'}]},{label:'顯示',submenu:[{role:'reload',label:'重新載入'},{role:'resetZoom',label:'原始大小'},{role:'zoomIn',label:'放大'},{role:'zoomOut',label:'縮小'},{role:'togglefullscreen',label:'切換全螢幕'}]},{label:'視窗',submenu:[{role:'minimize',label:'縮小視窗'},{role:'close',label:'關閉視窗'}]}]));
 await win.loadURL(origin);
 if(process.env.OPENTAKE_UPDATE_READY){const file=process.env.OPENTAKE_UPDATE_READY;setTimeout(async()=>{try{const r=await fetch(origin+'/api/upgrade/preferences');if(!r.ok||win.isDestroyed()||child.exitCode!==null)return;if(!await win.webContents.executeJavaScript('Boolean(document.getElementById("root")?.children.length)'))return;fs.writeFileSync(file,JSON.stringify({pid:process.pid,version:app.getVersion()}));}catch{}},10000);}
 // Local diagnostic state contains no credentials; used to identify this exact runtime.
 fs.writeFileSync(path.join(profile,'startup.json'),JSON.stringify({pid:process.pid,servicePid:child.pid,url:origin,packaged:app.isPackaged,appId:APP_ID}));
}
if(!app.requestSingleInstanceLock())app.quit();
else {
 app.on('second-instance',()=>{win?.show();win?.focus()});
 app.whenReady().then(start).catch(error=>{dialog.showErrorBox('剪輯工作台（非官方繁中版） 無法啟動',error.message);app.quit()});
 app.on('window-all-closed',()=>app.quit());
 app.on('before-quit',()=>{closing=true;stopService()});
 process.on('SIGTERM',()=>app.quit());process.on('SIGINT',()=>app.quit());
}
