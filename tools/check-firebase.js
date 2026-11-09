#!/usr/bin/env node
/* check-firebase.js — refuse to sync a native build that would crash.
 *
 * The Firebase Analytics plugin calls FirebaseApp.configure() from its load(),
 * which runs at bridge startup — so an iOS app bundled without
 * GoogleService-Info.plist builds fine and then CRASHES on launch. Android's
 * google-services Gradle plugin fails the build instead. Both files are per
 * app, downloaded from the Firebase console (Project settings > Your apps).
 *
 * Set ALLOW_NO_FIREBASE=1 to sync anyway, e.g. for a web-only check. */

'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const wanted = [
  ['android/app/google-services.json', 'Android'],
  ['ios/App/App/GoogleService-Info.plist', 'iOS']
];

const missing = wanted.filter(([rel]) => !fs.existsSync(path.join(root, rel)));
if (!missing.length) process.exit(0);

if (process.env.ALLOW_NO_FIREBASE === '1') {
  for (const [rel, os] of missing) console.warn('! ' + os + ' has no ' + rel + ' — analytics will not report');
  process.exit(0);
}

console.error('');
console.error('Firebase is wired up but not configured. Missing:');
for (const [rel, os] of missing) console.error('  ' + rel + '   (' + os + ')');
console.error('');
console.error('Download them from the Firebase console for the');
console.error('com.politecarrot.footballallinone app on each platform and put them at');
console.error('those paths. The iOS one is already registered in project.pbxproj.');
console.error('');
console.error('An iOS build without its plist CRASHES ON LAUNCH, so this is a stop');
console.error('rather than a warning. ALLOW_NO_FIREBASE=1 npm run sync to go ahead anyway.');
console.error('');
process.exit(1);
