'use strict';
const fs = require('fs');
const path = require('path');

// Keep the plain-script entry point derived from the installed, pinned package.
module.exports = function syncDependencies() {
  const target = path.join(__dirname, 'vendor/unity-ads.js');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  /* The website build (CI) cannot install the private package, and js/ads.js stays inert on the web anyway. */
  if (process.env.WEB_ONLY) {
    fs.writeFileSync(target, '/* Web build: Unity Ads is native-only. */\n');
    return;
  }
  fs.copyFileSync(require.resolve('@politecarrot/capacitor-unity-ads'), target);
};
