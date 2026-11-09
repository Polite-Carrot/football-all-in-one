'use strict';
/* Capacitor loads this by requiring it, so the side effects below run before
 * every `cap` command that reads the config — sync, copy, update, open, run.
 * `npx cap sync` alone therefore stays honest: the Firebase files are checked
 * and www/ is rebuilt from the current sources first. */
const path = require('path');
const { execFileSync } = require('child_process');

for (const script of ['tools/check-firebase.js', 'sync-web.js']) {
  try {
    execFileSync(process.execPath, [path.join(__dirname, script)], {
      stdio: 'inherit',
      cwd: __dirname
    });
  } catch (err) {
    console.error('capacitor.config.js: ' + script + ' failed');
    process.exit(1);
  }
}

module.exports = {
  appId: 'com.politecarrot.footballallinone',
  appName: 'Football All-in-One',
  webDir: 'www',
  backgroundColor: '#04110a',
  ios: {
    contentInset: 'never',
    backgroundColor: '#04110a',
    scrollEnabled: false
  },
  android: {
    backgroundColor: '#04110a'
  }
};
