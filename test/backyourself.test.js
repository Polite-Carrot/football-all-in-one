const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function load() {
  const store = {};
  const ctx = vm.createContext({ console, Math, Date, Set, Map, JSON, Promise, parseInt, Number, String, Object, Array });
  ctx.window = ctx;
  ctx.Store = { read: k => store[k] || null, write: (k, v) => { store[k] = v; } };
  ctx.UI = {};
  ctx.Games = { register: d => { ctx.BY = d; } };
  for (const f of ['js/daily.js', 'js/data/db.js', 'js/data/categories.js', 'js/data/ladders.js', 'js/footy.js', 'js/games/backyourself.js']) {
    vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  }
  return ctx;
}
const ctx = load();
const { BY, Daily, Footy } = ctx;

function idsOf(label) { return Footy.search('player', label, 40).filter(h => h.label === label).map(h => h.id); }

test('every round has five ladders of three rungs with four distinct options', () => {
  for (let i = 0; i < 40; i++) {
    const ladders = BY.pickLadders({ mode: 'practice', rand: Daily.rng('shape' + i) });
    assert.equal(ladders.length, 5);
    for (const l of ladders) {
      assert.equal(l.q.length, 3, l.topic);
      for (const q of l.q) {
        assert.equal(q.length, 5, q[0]);
        assert.equal(new Set(q.slice(1).map(Footy.norm)).size, 4, q[0]);
      }
    }
  }
});

test('generated "played for" answers are right and the wrong options are wrong', () => {
  const clubs = Object.fromEntries(Footy.teamKeys().map(k => Footy.team(k)).filter(t => t && !t.nt).map(t => [t.n, t]));
  let checked = 0;
  for (let i = 0; i < 40; i++) {
    for (const l of BY.pickLadders({ mode: 'practice', rand: Daily.rng('truth' + i) })) {
      for (const q of l.q) {
        const m = /^Which of these played for (.+)\?$/.exec(q[0]);
        if (!m || !clubs[m[1]]) continue;
        const team = clubs[m[1]];
        assert.ok(idsOf(q[1]).some(id => team._set.has(id)), q[1] + ' played for ' + m[1]);
        for (const wrong of q.slice(2)) assert.ok(idsOf(wrong).every(id => !team._set.has(id)), wrong + ' never played for ' + m[1]);
        checked++;
      }
    }
  }
  assert.ok(checked > 20, 'checked ' + checked);
});

test('both phones in a versus match get the same ladders', () => {
  const a = BY.pickLadders({ mode: 'versus', rand: Daily.rng('match-seed') });
  const b = BY.pickLadders({ mode: 'versus', rand: Daily.rng('match-seed') });
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
});

test('back-to-back practice rounds rarely repeat a question', () => {
  let prev = null, repeats = 0, total = 0;
  for (let i = 0; i < 60; i++) {
    const texts = BY.pickLadders({ mode: 'practice', rand: Daily.rng('rep' + i) }).flatMap(l => l.q.map(q => q[0] + '|' + q[1]));
    if (prev) { repeats += texts.filter(t => prev.has(t)).length; total += texts.length; }
    prev = new Set(texts);
  }
  assert.ok(repeats / total < 0.03, (100 * repeats / total).toFixed(1) + '% repeated');
});
