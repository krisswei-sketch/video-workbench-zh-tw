import platform from './platform.cjs';
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!JSON.parse(fs.readFileSync(path.join(root,'edition.json'),'utf8')).updatesEnabled)console.log('正在建置非官方繁中版；自動更新已停用。');
const target=platform.buildTarget();
const run=(command,args)=>{const r=spawnSync(command,args,{cwd:root,stdio:'inherit',env:{...process.env,CSC_IDENTITY_AUTO_DISCOVERY:'false'}});if(r.error)throw r.error;if(r.status!==0)throw Error(command+' 失敗')};
if(target==='mac'){
const icons=path.join(root,'release','OpenTake.iconset');fs.mkdirSync(icons,{recursive:true});
for(const size of [16,32,128,256,512])for(const scale of [1,2])run('sips',['-z',String(size*scale),String(size*scale),'public/community-icon.png','--out',path.join(icons,`icon_${size}x${size}${scale===2?'@2x':''}.png`)]);
run('iconutil',['-c','icns',icons,'-o','release/OpenTake.icns']);
// Sign outside File Provider folders (for example iCloud Documents), which can
// reattach Finder metadata during signing. ZIP preserves the finished bundle.
const staging=fs.mkdtempSync(path.join(os.tmpdir(),'video-workbench-mac-'));
run(process.execPath,['desktop/package-mac.cjs','--config','desktop/builder.config.cjs','--mac','dir','--publish','never',`--config.directories.output=${staging}`]);
const bundle=path.join(staging,`mac-${process.arch}`,'剪輯工作台（非官方繁中版）.app');
run('codesign',['--verify','--deep','--strict',bundle]);
run('ditto',['-c','-k','--sequesterRsrc','--keepParent',bundle,`release/video-workbench-tw-mac-${process.arch}.zip`]);
}else{
run(process.execPath,['node_modules/electron-builder/cli.js','--config','desktop/builder.config.cjs','--win','dir','--x64','--publish','never','--config.directories.output=release/'+target]);
}
console.log(target==='mac'?'App ZIP 已生成在 release 下，使用本機臨時簽章。尚未經 Apple 開發者簽署或公證；請先驗收，保留外部媒體工具的安裝說明。':`本地 Windows 測試程式已生成在 release/${target}，尚未透過 Windows 實機驗收，不可發布。`);
