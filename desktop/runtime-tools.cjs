const fs = require('node:fs');
const path = require('node:path');
// Per-app tool paths only. Never load arbitrary environment variables or secrets.
const KEYS = ['LINKREADER_PYTHON', 'LINKREADER_BIN_DIR', 'OPENSCREEN_BIN'];
function runtimeToolEnvironment(profile, base = process.env) {
 const file = path.join(profile, 'runtime-tools.json');
 if (!fs.existsSync(file)) return { ...base };
 const config = JSON.parse(fs.readFileSync(file, 'utf8'));
 if (!config || typeof config !== 'object' || Array.isArray(config)) throw Error('工具設定檔格式錯誤');
 const env = { ...base };
 for (const key of KEYS) {
  if (base[key] || config[key] === undefined || config[key] === '') continue;
  const value = config[key];
  if (typeof value !== 'string' || !path.isAbsolute(value)) throw Error(`${key} 必須使用完整路徑`);
  if (key === 'LINKREADER_BIN_DIR') {
   if (!fs.statSync(value).isDirectory()) throw Error('FFmpeg 工具路徑必須是資料夾');
   for (const name of ['ffmpeg', 'ffprobe']) fs.accessSync(path.join(value, name), fs.constants.X_OK);
  } else {
   if (!fs.statSync(value).isFile()) throw Error(`${key} 必須是執行檔`);
   fs.accessSync(value, fs.constants.X_OK);
  }
  env[key] = value;
 }
 return env;
}
module.exports = { runtimeToolEnvironment };
