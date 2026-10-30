// Bound file probing during signing: @electron/osx-sign otherwise opens every
// resource concurrently, which exhausts file descriptors on a large loose bundle.
// This changes only this packaging process; it does not skip any file or mutate
// the installed dependency, signing options, or the system's resource limits.
const { createRequire } = require('node:module');
const path = require('node:path');
const signingRequire = createRequire(require.resolve('@electron/osx-sign'));
const binary = signingRequire('isbinaryfile');
const inspect = binary.isBinaryFile;
const queue = [];
let active = 0;
function drain() {
 while (active < 16 && queue.length) {
  const { args, resolve, reject } = queue.shift();
  active++;
  Promise.resolve().then(() => inspect(...args)).then(resolve, reject).finally(() => { active--; drain(); });
 }
}
binary.isBinaryFile = (...args) => new Promise((resolve, reject) => { queue.push({ args, resolve, reject }); drain(); });
require(path.join(__dirname, '..', 'node_modules', 'electron-builder', 'cli.js'));
