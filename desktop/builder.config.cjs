module.exports = {
 appId:'community.tw.video-workbench',productName:'剪輯工作台（非官方繁中版）',asar:false,
 directories:{output:'release'},electronDist:'node_modules/electron/dist',
 files:['edition.json','desktop/**','dist/**','server/**','src/**','shared/**','!vendor/**','public/**','upgrade.json','vite.config.ts','package.json','LICENSE','NOTICE','TRADEMARK.md','THIRD-PARTY-LICENSES.json','licenses/**','!**/*.test.*','!desktop/build-app.mjs','!desktop/package-mac.cjs','!desktop/builder.config.cjs'],
 extraResources:[{from:'node_modules/electron/dist/LICENSE',to:'electron-LICENSE'},{from:'node_modules/electron/dist/LICENSES.chromium.html',to:'LICENSES.chromium.html'}],
 npmRebuild:false,
 // Finder may add a custom-icon attribute to the newly generated bundle in a
 // File Provider folder. Remove only that build artifact's Finder metadata
 // before signing; never change quarantine or any source/original app.
 afterPack: async (context) => {
  if (context.electronPlatformName !== 'darwin') return;
  const { execFileSync } = require('node:child_process');
  const path = require('node:path');
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync('xattr', ['-rd', 'com.apple.FinderInfo', app]);
 },
 win:{target:['dir'],icon:'public/community-icon.png',signAndEditExecutable:false},
 mac:{target:['dir'],identity:'-',notarize:false,icon:'release/OpenTake.icns',category:'public.app-category.video',extendInfo:{CFBundleDisplayName:'剪輯工作台（非官方繁中版）',CFBundleName:'剪輯工作台（非官方繁中版）',NSScreenCaptureUsageDescription:'錄製你選擇的螢幕或視窗，製作演示影片。'}},
};
