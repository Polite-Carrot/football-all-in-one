/* daily.js — dates, streaks and the seeded picks behind the daily challenges.
 *
 * Every daily is chosen on the phone from the local date, so everybody gets
 * the same challenge on the same day with no server. Pools are walked in a
 * shuffled order that is reshuffled each time round, so a question never
 * comes back until the whole pool has been used. */
(function (g) {
  'use strict';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function key(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function shift(d, days) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + days);
    return x;
  }
  function streak(done, from) {
    var d = from, n = 0;
    if (!done[key(d)]) d = shift(d, -1);
    while (done[key(d)]) { n++; d = shift(d, -1); }
    return n;
  }

  /* Daily #1 is 1 November 2026. Rounded, because a day with a clock change
     in it is 23 or 25 hours long. */
  var EPOCH = new Date(2026, 10, 1);
  function number(d) {
    var day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((day - EPOCH) / 86400000) + 1;
  }

  /* FNV-1a, then mulberry32: small, fast, and identical on every engine. */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    var a = typeof seed === 'number' ? seed >>> 0 : hash(String(seed));
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(list, rand) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Index into a pool of `size` for the given day: every index once per
     cycle, a fresh order each cycle. */
  function pick(size, salt, d) {
    var n = number(d || new Date()) - 1;
    var cycle = Math.floor(n / size);
    var order = [];
    for (var i = 0; i < size; i++) order.push(i);
    order = shuffle(order, rng(salt + ':' + cycle));
    return order[((n % size) + size) % size];
  }

  g.Daily = { key: key, shift: shift, streak: streak, number: number, hash: hash, rng: rng, shuffle: shuffle, pick: pick };
})(typeof window !== 'undefined' ? window : globalThis);
