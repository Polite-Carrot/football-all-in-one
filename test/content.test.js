const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

/* Loads the data and the data layer the way the page does, script by script. */
function load() {
  const context = vm.createContext({ console, Math, Date, Set, Map, JSON, Promise, parseInt, Number, String });
  context.window = context;
  for (const f of ['js/daily.js', 'js/data/db.js', 'js/data/categories.js', 'js/data/lists.js',
    'js/data/ladders.js', 'js/data/seasons.js', 'js/footy.js']) {
    vm.runInContext(fs.readFileSync(f, 'utf8'), context, { filename: f });
  }
  return context;
}
const ctx = load();
const { Footy } = ctx;

test('every Top-10 answer can be found in the search box and matches itself', () => {
  const missing = [];
  for (const list of ctx.FA_LISTS) {
    assert.equal(list.a.length, 10, list.id + ' has ten answers');
    for (const [, answer] of list.a) {
      const hits = Footy.search(list.type, answer, 30);
      if (!hits.some(h => Footy.same(list.type, h, answer))) missing.push(list.id + ': ' + answer);
    }
  }
  assert.deepEqual(missing, []);
});

test('no board repeats an answer', () => {
  for (const list of ctx.FA_LISTS) {
    const keys = list.a.map(p => (list.type === 'club' ? Footy.clubKey(p[1]) : Footy.norm(p[1])));
    assert.equal(new Set(keys).size, keys.length, list.id);
  }
});

test('board ids are unique', () => {
  const ids = ctx.FA_LISTS.map(l => l.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('Back Yourself ladders have three rungs of four distinct options', () => {
  for (const l of ctx.FA_LADDERS) {
    assert.equal(l.q.length, 3, l.topic);
    for (const q of l.q) {
      assert.equal(q.length, 5, q[0]);
      assert.equal(new Set(q.slice(1)).size, 4, q[0]);
    }
  }
});

test('38-0 squads use known positions and sensible ratings', () => {
  const POS = new Set(['GK', 'RB', 'CB', 'LB', 'DM', 'CM', 'AM', 'RW', 'LW', 'ST']);
  for (const s of ctx.FA_SEASONS) {
    assert.ok(s.p.length >= 12, s.club + ' ' + s.season);
    assert.ok(s.p.some(p => p[1] === 'GK'), s.club + ' has a keeper');
    for (const [name, pos, rating] of s.p) {
      assert.ok(POS.has(pos), name + ' ' + pos);
      assert.ok(rating >= 50 && rating <= 99, name);
    }
  }
});

test('question sets and 501 boards resolve to real players', () => {
  for (const s of Footy.sets()) {
    const members = Footy.setMembers(s);
    assert.ok(members.length >= 10, s.id + ' has ' + members.length);
    assert.ok(Footy.setText(s).length > 10, s.id);
  }
  for (const b of Footy.boards()) {
    const t = Footy.team(b.a);
    assert.ok(t && t._former.size >= 80, b.id);
    let finishers = 0;
    t._former.forEach((v, p) => { if (Footy.boardValue(b, p).value <= 180) finishers++; });
    assert.ok(finishers >= 40, b.id + ' has ' + finishers + ' usable numbers');
  }
});

test('search finds players by surname, without accents, famous first', () => {
  const hits = Footy.search('player', 'henry', 5).map(h => h.label);
  assert.equal(hits[0], 'Thierry Henry');
  assert.ok(Footy.search('player', 'aguero', 3).some(h => h.label === 'Sergio Ag\u00fcero'));
  assert.ok(Footy.search('player', 'ngolo', 3).some(h => /Kant/.test(h.label)));
  assert.ok(Footy.search('club', 'man utd', 3).some(h => /Manchester United/.test(h.label)));
  assert.ok(Footy.search('nation', 'west germany', 3).some(h => h.label === 'Germany' || h.label === 'West Germany'));
});
