import fs from 'node:fs';import path from 'node:path';
export function pythonCandidates(platform:NodeJS.Platform,env:NodeJS.ProcessEnv){
 const p=platform==='win32'?path.win32:path.posix;
 if(env.LINKREADER_PYTHON)return [env.LINKREADER_PYTHON];
 const names=platform==='win32'?['python3.exe','python.exe']:['python3'];
 return (env.PATH||env.Path||'').split(platform==='win32'?';':':').filter(dir=>p.isAbsolute(dir)).flatMap(dir=>names.map(name=>p.join(dir,name)));
}
export function resolvePython(){
 for(const candidate of pythonCandidates(process.platform,process.env)){try{fs.accessSync(candidate,fs.constants.X_OK);if(fs.statSync(candidate).isFile())return candidate;}catch{/* next */}}
 throw Error('未找到 Python 3，暫不能校驗版本 ZIP；原檔案保留。請安裝 Python 或設定 LINKREADER_PYTHON。');
}
