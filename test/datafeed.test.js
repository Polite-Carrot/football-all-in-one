const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

/* Package the real data the way the weekly job does. */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feed-'));
execFileSync(process.execPath, ['tools/publish-feed.js', dir]);
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const body = fs.readFileSync(path.join(dir, manifest.file), 'utf8');

/* The page's data scripts plus the updater, with fetch answering from `files`. */
function setup(files, bundledBuilt) {
  const fetched = [];
  const context = vm.createContext({
    console, Math, Date, Set, Map, JSON, Promise, Uint8Array, TextEncoder, setTimeout, clearTimeout,
    crypto: globalThis.crypto,
    fetch: async url => {
      fetched.push(url);
      const name = url.slice(url.lastIndexOf('/') + 1);
      if (!(name in files)) return { ok: false, status: 404 };
      return { ok: true, status: 200, text: async () => files[name] };
    }
  });
  context.window = context;
  for (const f of ['js/data/db.js', 'js/data/categories.js', 'js/data/lists.js', 'js/data/ladders.js', 'js/data/seasons.js']) {
    vm.runInContext(fs.readFileSync(f, 'utf8'), context, { filename: f });
  }
  if (bundledBuilt) context.FA_DB.built = bundledBuilt;
  for (const f of ['js/footy.js', 'js/datafeed.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), context, { filename: f });
  return { F: context.DataFeed, Footy: context.Footy, ctx: context, fetched };
}

const OLDER = '2020-01-01T00:00:00Z';

test('the published build passes the app\'s own checks', () => {
  const d = JSON.parse(body);
  const { F } = setup({});
  assert.equal(F.valid(d), true);
  assert.equal(d.built, manifest.built);
  assert.match(manifest.file, /^data-[0-9a-f]{16}\.json$/);
});

test('a newer build is downloaded, verified and swapped in', async () => {
  const { F, Footy, ctx } = setup({ 'manifest.json': JSON.stringify(manifest), [manifest.file]: body }, OLDER);
  assert.equal(Footy.built, OLDER);
  const d = await F.check();
  assert.ok(d, 'newer build accepted');
  const marker = JSON.parse(body);
  marker.db.names = 'Zzyzx Testplayer|' + marker.db.names.slice(marker.db.names.indexOf('|') + 1);
  F.install(Object.assign(marker, { sha: 'x' }));
  assert.equal(Footy.built, manifest.built);
  assert.equal(Footy.search('player', 'zzyzx', 1)[0].label, 'Zzyzx Testplayer', 'search index rebuilt from the new data');
  assert.equal(ctx.FA_LISTS.length, marker.lists.length);
});

test('nothing is downloaded when the app already has that build', async () => {
  const { F, fetched } = setup({ 'manifest.json': JSON.stringify(manifest), [manifest.file]: body });
  assert.equal(await F.check(), null);
  assert.deepEqual(fetched.map(u => u.slice(u.lastIndexOf('/') + 1)), ['manifest.json']);
});

test('a tampered, broken or mislabelled build is refused', async () => {
  const tampered = body.replace('"Lionel Messi', '"Lionel Mess');
  assert.equal(await setup({ 'manifest.json': JSON.stringify(manifest), [manifest.file]: tampered }, OLDER).F.check(), null);

  const empty = Object.assign({}, manifest, { file: 'data-0000000000000000.json' });
  assert.equal(await setup({ 'manifest.json': JSON.stringify(empty), 'data-0000000000000000.json': '{"format":1}' }, OLDER).F.check(), null);

  const odd = Object.assign({}, manifest, { file: '../evil.js' });
  assert.equal(await setup({ 'manifest.json': JSON.stringify(odd) }, OLDER).F.check(), null);

  const future = Object.assign({}, manifest, { format: 99 });
  assert.equal(await setup({ 'manifest.json': JSON.stringify(future), [manifest.file]: body }, OLDER).F.check(), null);
});

test('offline or a missing feed leaves the built-in data in place', async () => {
  const { F, Footy } = setup({}, OLDER);
  assert.equal(await F.check(), null);
  assert.equal(await F.restore(), null);
  assert.equal(Footy.built, OLDER);
});
