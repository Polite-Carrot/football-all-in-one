#!/usr/bin/env node
/* sync-web.js — mirror the game's web assets into www/ for Capacitor.
 *
 * The game lives at the repo root next to package.json and node_modules, and
 * Capacitor copies its webDir wholesale. This pulls only the files the page
 * loads into a clean www/. Run before `npx cap sync`, or use `npm run sync`,
 * which does both. */

'use strict';
const fs = require('fs');
const path = require('path');
require('./sync-dependencies')();

const root = __dirname;
const out = path.join(root, 'www');

/* Every local file index.html names (scripts, styles, icons), taken from the
   page itself so a new module cannot silently miss the bundle. */
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const referenced = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
  .map(m => m[1])
  .filter(ref => !/^(https?:|data:|mailto:)/.test(ref) && !ref.startsWith('//'));

const files = new Set(['index.html', ...referenced]);
const folders = ['assets'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const rel of files) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) throw new Error('index.html refers to ' + rel + ', which is not there');
  const dst = path.join(out, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}
for (const rel of folders) {
  fs.cpSync(path.join(root, rel), path.join(out, rel), { recursive: true });
}

console.log('www/ populated with ' + files.size + ' files + ' + folders.join(', ') + '/');
