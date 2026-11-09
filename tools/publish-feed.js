#!/usr/bin/env node
/* publish-feed.js — package the current data for the in-app updater.
 *
 *   node tools/publish-feed.js [outDir]      (default: _site/feed/v1)
 *
 * Reads js/data/* the way the app does and writes one JSON file named by its
 * hash, plus manifest.json pointing at it. js/datafeed.js reads these.
 * The weekly workflow (.github/workflows/data-feed.yml) runs this after
 * rebuilding the data and passing the content tests. */

'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FORMAT = 1;
const out = path.resolve(process.argv[2] || path.join(ROOT, '_site/feed/v1'));

const ctx = vm.createContext({});
ctx.window = ctx;
for (const f of ['db', 'categories', 'lists', 'ladders', 'seasons']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
}

const built = ctx.FA_DB && ctx.FA_DB.built;
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(built || '')) {
  throw new Error('FA_DB.built must be a full ISO time (rebuild with npm run data): ' + built);
}

const payload = {
  format: FORMAT,
  built,
  db: ctx.FA_DB,
  sets: ctx.FA_SETS,
  lists: ctx.FA_LISTS,
  ladders: ctx.FA_LADDERS,
  seasons: ctx.FA_SEASONS
};
const body = JSON.stringify(payload);
const sha256 = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
const file = 'data-' + sha256.slice(0, 16) + '.json';

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, file), body);
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ format: FORMAT, built, file, sha256, bytes: Buffer.byteLength(body) }, null, 2) + '\n');
console.log('feed ' + built + ' → ' + path.relative(ROOT, out) + '/' + file + ' (' + (Buffer.byteLength(body) / 1024).toFixed(0) + ' KB)');
