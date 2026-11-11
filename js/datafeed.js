/* datafeed.js — newer football data, picked up when the app opens.
 *
 * The app ships with its data built in (js/data/*). A weekly job
 * (.github/workflows/data-feed.yml) rebuilds it from Wikidata and publishes
 * one JSON file plus a small manifest. On launch the app reads the manifest;
 * if the build there is newer it downloads it, checks it, and keeps it in
 * IndexedDB so it is there offline and on later launches.
 * Data only: nothing downloaded is ever run as code. */
(function (g) {
  'use strict';

  var FEED = 'https://football-all-in-one.politecarrot.com/feed/v1/';
  var FORMAT = 1;
  var TIMEOUT_MS = 20000;
  var DB_NAME = 'footballaio-data';
  var STORE = 'feed';

  var active = { built: (g.FA_DB && g.FA_DB.built) || '', sha: 'bundled' };

  function open() {
    return new Promise(function (resolve, reject) {
      if (!g.indexedDB) { reject(new Error('no IndexedDB')); return; }
      var req = g.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function withStore(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var req = fn(t.objectStore(STORE));
        t.oncomplete = function () { db.close(); resolve(req.result); };
        t.onerror = t.onabort = function () { db.close(); reject(t.error); };
      });
    });
  }

  /* The shape every game relies on, at no less than today's size, so a broken build is never used. */
  function valid(d) {
    return !!(d && d.format === FORMAT && typeof d.built === 'string' &&
      d.db && d.db.v === 2 && typeof d.db.names === 'string' && d.db.names.length > 100000 &&
      typeof d.db.fame === 'string' && Array.isArray(d.db.teams) && d.db.teams.length >= 50 &&
      d.sets && Array.isArray(d.sets.sets) && d.sets.sets.length >= 100 &&
      Array.isArray(d.sets.boards) && d.sets.boards.length >= 20 &&
      Array.isArray(d.lists) && d.lists.length >= 20 &&
      Array.isArray(d.ladders) && d.ladders.length >= 10 &&
      Array.isArray(d.seasons) && d.seasons.length >= 10);
  }

  /* Builds are stamped with ISO times, so newer sorts later. */
  function newer(built) { return typeof built === 'string' && built > active.built; }

  function install(d) {
    g.FA_DB = d.db;
    g.FA_SETS = d.sets;
    g.FA_LISTS = d.lists;
    g.FA_LADDERS = d.ladders;
    g.FA_SEASONS = d.seasons;
    if (g.Footy && g.Footy.reload) g.Footy.reload(d.db, d.sets);
    active = { built: d.built, sha: d.sha || '' };
  }

  /* A build kept from an earlier launch, if it is newer than the one inside the app. */
  function restore() {
    return withStore('readonly', function (s) { return s.get('data'); })
      .then(function (d) { return valid(d) && newer(d.built) ? d : null; })
      .catch(function () { return null; });
  }

  function fetchText(url) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : 0;
    return fetch(url, { cache: 'no-cache', credentials: 'omit', signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (text) { clearTimeout(timer); return text; },
        function (err) { clearTimeout(timer); throw err; });
  }

  function sha256(text) {
    var subtle = g.crypto && g.crypto.subtle;
    if (!subtle || typeof TextEncoder !== 'function') return Promise.resolve(null);
    return subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }

  /* Downloads the published build if it is newer than the running one, and keeps it. Resolves to it, or null. */
  function check() {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    return fetchText(FEED + 'manifest.json').then(function (text) {
      var m = JSON.parse(text);
      if (!m || m.format !== FORMAT || !newer(m.built) || !/^data-[0-9a-f]{16}\.json$/.test(m.file)) return null;
      return fetchText(FEED + m.file).then(function (body) {
        return sha256(body).then(function (hash) {
          if (hash && hash !== m.sha256) throw new Error('checksum mismatch');
          var d = JSON.parse(body);
          if (!valid(d) || d.built !== m.built) throw new Error('unusable build');
          d.sha = m.sha256;
          return withStore('readwrite', function (s) { return s.put(d, 'data'); })
            .catch(function () { /* kept for this session only */ })
            .then(function () { return d; });
        });
      });
    }).catch(function () { return null; });
  }

  g.DataFeed = {
    restore: restore,
    check: check,
    install: install,
    valid: valid,
    active: function () { return active; },
    url: FEED
  };
})(typeof window !== 'undefined' ? window : globalThis);
