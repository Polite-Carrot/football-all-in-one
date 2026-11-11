/* leaderboard.js — a public leaderboard for every Versus match link, kept in
 * Cloud Firestore and reached over its REST API (no SDK).
 *
 * One board per match seed: boards/{seed}/entries/{playerId}. Each phone
 * posts its total once per match; firestore.rules checks the shape and
 * refuses updates, so a score cannot be changed after it is posted.
 * Everything here fails soft: no network, no board, the game carries on. */
(function (g) {
  'use strict';

  var PROJECT = 'football-all-in-one-8320a';
  var BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';
  var ID_KEY = 'footballaio.player.v1';
  var TIMEOUT = 8000;

  function playerId() {
    var id = g.Store.read(ID_KEY);
    if (id && /^[a-z0-9]{20}$/.test(id)) return id;
    id = '';
    var bytes = new Uint8Array(20);
    g.crypto.getRandomValues(bytes);
    for (var i = 0; i < bytes.length; i++) id += 'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(bytes[i] % 36);
    g.Store.write(ID_KEY, id);
    return id;
  }

  function int(n) { return { integerValue: String(Math.round(n)) }; }

  async function call(path, body) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT);
    try {
      var res = await fetch(BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      var json = await res.json().catch(function () { return null; });
      return { ok: res.ok, status: res.status, json: json };
    } finally {
      clearTimeout(timer);
    }
  }

  /* Resolves true once this phone's score is on the board (posted now or before). */
  async function submit(seed, name, scores) {
    var total = scores.reduce(function (s, v) { return s + v; }, 0);
    var doc = 'projects/' + PROJECT + '/databases/(default)/documents/boards/' + seed + '/entries/' + playerId();
    try {
      var r = await call(':commit', {
        writes: [{
          update: { name: doc, fields: {
            name: { stringValue: String(name).slice(0, 14) },
            total: int(total),
            rounds: int(scores.length),
            scores: { arrayValue: { values: scores.map(int) } }
          } },
          updateTransforms: [{ fieldPath: 'created', setToServerValue: 'REQUEST_TIME' }],
          currentDocument: { exists: false }
        }]
      });
      /* Already there: an earlier post from this phone counts. */
      return r.ok || ((r.status === 400 || r.status === 409) && /ALREADY_EXISTS|FAILED_PRECONDITION|exist/i.test(JSON.stringify(r.json || '')));
    } catch (e) {
      return false;
    }
  }

  function query(seed, extra) {
    var q = { from: [{ collectionId: 'entries' }] };
    Object.keys(extra).forEach(function (k) { q[k] = extra[k]; });
    return q;
  }

  async function top(seed, limit) {
    var r = await call('/boards/' + seed + ':runQuery', {
      structuredQuery: query(seed, { orderBy: [{ field: { fieldPath: 'total' }, direction: 'DESCENDING' }], limit: limit })
    });
    if (!r.ok || !Array.isArray(r.json)) throw new Error('leaderboard ' + r.status);
    return r.json.filter(function (x) { return x.document; }).map(function (x) {
      var f = x.document.fields || {};
      var scores = (f.scores && f.scores.arrayValue && f.scores.arrayValue.values) || [];
      return {
        id: x.document.name.split('/').pop(),
        name: (f.name && f.name.stringValue) || 'Player',
        total: Number(f.total && f.total.integerValue) || 0,
        rounds: Number(f.rounds && f.rounds.integerValue) || 0,
        scores: scores.map(function (v) { return Number(v.integerValue) || 0; })
      };
    });
  }

  async function count(seed, above) {
    var structured = query(seed, {});
    if (typeof above === 'number') {
      structured.where = { fieldFilter: { field: { fieldPath: 'total' }, op: 'GREATER_THAN', value: int(above) } };
    }
    var r = await call('/boards/' + seed + ':runAggregationQuery', {
      structuredAggregationQuery: { structuredQuery: structured, aggregations: [{ alias: 'n', count: {} }] }
    });
    if (!r.ok || !Array.isArray(r.json) || !r.json[0] || !r.json[0].result) throw new Error('leaderboard count ' + r.status);
    return Number(r.json[0].result.aggregateFields.n.integerValue) || 0;
  }

  /* The board as one snapshot: the top entries, how many have played, and
     (given a total) where that total ranks. Ties share a rank. */
  async function load(seed, limit, myTotal) {
    var results = await Promise.all([
      top(seed, limit),
      count(seed),
      typeof myTotal === 'number' ? count(seed, myTotal) : Promise.resolve(null)
    ]);
    return { top: results[0], players: results[1], rank: results[2] === null ? null : results[2] + 1 };
  }

  g.Leaderboard = { playerId: playerId, submit: submit, load: load };
})(typeof window !== 'undefined' ? window : globalThis);
