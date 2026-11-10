/* 38-0 — spin a real Premier League club-season, take one player from that
 * squad into your formation, and repeat until all eleven shirts are filled.
 * Then play out a 38-game season against the league and chase the perfect
 * record. Hard mode hides every rating until full time. */
(function (g) {
  'use strict';

  var UI = g.UI, Games = g.Games, Daily = g.Daily;

  var BACK4 = [{ k: 'GK', x: 50, y: 89 }, { k: 'RB', x: 86, y: 68 }, { k: 'CB', x: 63, y: 73 }, { k: 'CB', x: 37, y: 73 }, { k: 'LB', x: 14, y: 68 }];
  var FORMATIONS = {
    '4-3-3': BACK4.concat([
      { k: 'CM', x: 74, y: 47 }, { k: 'CM', x: 50, y: 52 }, { k: 'CM', x: 26, y: 47 },
      { k: 'RW', x: 82, y: 22 }, { k: 'ST', x: 50, y: 15 }, { k: 'LW', x: 18, y: 22 }]),
    '4-4-2': BACK4.concat([
      { k: 'RM', x: 86, y: 44 }, { k: 'CM', x: 61, y: 50 }, { k: 'CM', x: 39, y: 50 }, { k: 'LM', x: 14, y: 44 },
      { k: 'ST', x: 62, y: 17 }, { k: 'ST', x: 38, y: 17 }]),
    '4-2-3-1': BACK4.concat([
      { k: 'DM', x: 62, y: 56 }, { k: 'DM', x: 38, y: 56 },
      { k: 'RW', x: 83, y: 33 }, { k: 'AM', x: 50, y: 36 }, { k: 'LW', x: 17, y: 33 }, { k: 'ST', x: 50, y: 13 }]),
    '3-5-2': [{ k: 'GK', x: 50, y: 89 }, { k: 'CB', x: 73, y: 72 }, { k: 'CB', x: 50, y: 75 }, { k: 'CB', x: 27, y: 72 },
      { k: 'RWB', x: 88, y: 48 }, { k: 'CM', x: 66, y: 53 }, { k: 'CM', x: 34, y: 53 }, { k: 'LWB', x: 12, y: 48 }, { k: 'AM', x: 50, y: 37 },
      { k: 'ST', x: 62, y: 16 }, { k: 'ST', x: 38, y: 16 }]
  };
  var FORMATION_NAMES = Object.keys(FORMATIONS);
  var SETUP_KEY = 'footballaio.t38.v1';

  /* Rating lost when a player fills a slot: 0 in his own position, more the
     further from it. Missing = cannot play there at all. */
  var FIT = {
    GK: { GK: 0 },
    RB: { RB: 0, LB: 4, CB: 6, DM: 8 },
    LB: { LB: 0, RB: 4, CB: 6, DM: 8 },
    CB: { CB: 0, DM: 4, RB: 6, LB: 6 },
    DM: { DM: 0, CM: 1, CB: 4, AM: 6 },
    CM: { CM: 0, DM: 1, AM: 1, RW: 7, LW: 7 },
    AM: { AM: 0, CM: 2, RW: 3, LW: 3, ST: 3 },
    RM: { RW: 1, LW: 3, CM: 4, AM: 4, RB: 6 },
    LM: { LW: 1, RW: 3, CM: 4, AM: 4, LB: 6 },
    RWB: { RB: 1, RW: 3, LB: 4, LW: 5 },
    LWB: { LB: 1, LW: 3, RB: 4, RW: 5 },
    RW: { RW: 0, LW: 3, AM: 4, ST: 5, CM: 8 },
    LW: { LW: 0, RW: 3, AM: 4, ST: 5, CM: 8 },
    ST: { ST: 0, AM: 4, RW: 5, LW: 5 }
  };
  var ORDER = ['GK', 'RB', 'CB', 'LB', 'DM', 'CM', 'AM', 'RW', 'LW', 'ST'];

  /* The other nineteen. Ratings are the game's own. */
  var LEAGUE = [
    ['Manchester City', 87], ['Liverpool', 87], ['Arsenal', 86], ['Chelsea', 83], ['Newcastle United', 81],
    ['Tottenham Hotspur', 81], ['Aston Villa', 80], ['Manchester United', 80], ['Brighton', 78], ['Crystal Palace', 77],
    ['Nottingham Forest', 77], ['Bournemouth', 76], ['Fulham', 76], ['Brentford', 76], ['West Ham United', 76],
    ['Everton', 75], ['Wolves', 74], ['Leeds United', 73], ['Sunderland', 72]
  ];
  var YOU = 'Your XI';

  function poisson(lambda, rand) {
    var limit = Math.exp(-lambda), k = 0, p = 1;
    do { k++; p *= rand(); } while (p > limit);
    return k - 1;
  }

  function play(home, away, rand) {
    var d = home - away;
    return [poisson(1.45 * Math.exp(0.08 * d + 0.1), rand), poisson(1.2 * Math.exp(-0.08 * d), rand)];
  }

  /* Every team plays every other home and away. Returns the table and the
     XI's own 38 results in fixture order. */
  function simulate(rating, rand) {
    var teams = LEAGUE.map(function (t) { return { name: t[0], r: t[1] }; }).concat([{ name: YOU, r: rating, you: true }]);
    teams.forEach(function (t) { t.p = 0; t.w = 0; t.d = 0; t.l = 0; t.gf = 0; t.ga = 0; });
    var mine = [];
    var fixtures = [];
    teams.forEach(function (h) { teams.forEach(function (a) { if (h !== a) fixtures.push([h, a]); }); });
    fixtures = Daily.shuffle(fixtures, rand);
    fixtures.forEach(function (f) {
      var h = f[0], a = f[1];
      var s = play(h.r, a.r, rand);
      h.gf += s[0]; h.ga += s[1]; a.gf += s[1]; a.ga += s[0];
      if (s[0] > s[1]) { h.w++; h.p += 3; a.l++; } else if (s[0] < s[1]) { a.w++; a.p += 3; h.l++; } else { h.d++; a.d++; h.p++; a.p++; }
      if (h.you) mine.push({ vs: a.name, home: true, f: s[0], a: s[1] });
      if (a.you) mine.push({ vs: h.name, home: false, f: s[1], a: s[0] });
    });
    teams.sort(function (x, y) { return y.p - x.p || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf; });
    return { table: teams, mine: mine, you: teams.filter(function (t) { return t.you; })[0], position: teams.findIndex(function (t) { return t.you; }) + 1 };
  }

  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function surname(name) {
    var parts = name.split(' ');
    return parts.length > 1 && parts[parts.length - 1].length > 2 ? parts.slice(1).join(' ') : name;
  }

  function loadSetup() {
    var setup = { formation: '4-3-3', hard: false };
    try {
      var saved = JSON.parse(g.Store.read(SETUP_KEY) || 'null');
      if (saved && FORMATIONS[saved.formation]) setup.formation = saved.formation;
      if (saved && typeof saved.hard === 'boolean') setup.hard = saved.hard;
    } catch (e) { /* defaults */ }
    return setup;
  }

  function saveSetup(setup) {
    try { g.Store.write(SETUP_KEY, JSON.stringify(setup)); } catch (e) { /* not kept */ }
  }

  Games.register({
    id: 'thirtyeight',
    name: '38-0',
    short: '38-0',
    color: '#2ee67a',
    tagline: 'Draft an XI. Go unbeaten.',
    icon: '<svg viewBox="0 0 24 24"><path d="M7.5 3.5h9v4.5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 5.5H4.5a3 3 0 0 0 3.2 3.4M16.5 5.5h3a3 3 0 0 1-3.2 3.4M12 12.5v3.5M8.5 20.5h7M9.8 16h4.4l.6 4.5H9.2z"/></svg>',
    rules: [
      'Pick a formation, and hard mode if you want every rating hidden until full time.',
      'Spin to land on a real Premier League club and season.',
      'Take one player from that squad into an open slot. Out of position costs rating.',
      'Eleven spins, eleven players, and one re-spin if you hate where you land.',
      'Then play all 38 games. Can your XI win them all?'
    ],
    better: 'high',
    simulate: simulate,

    start: function (ctx) {
      var order = Daily.shuffle(g.FA_SEASONS.map(function (s, i) { return i; }), ctx.rand);
      var spinIndex = 0;
      var current = null;
      var respins = 1;
      var setup = loadSetup();
      var SLOTS = FORMATIONS[setup.formation];
      var xi = [];
      var spots = [];
      var over = false;
      var busy = false;

      var root = UI.el('div', 't38', ctx.root);
      var pitch = UI.el('div', 't38__pitch', root);
      UI.el('div', 't38__lines', pitch);
      var spotLayer = UI.el('div', 't38__spots', pitch);
      var ratingEl = UI.el('div', 't38__rating', pitch);
      UI.el('span', null, ratingEl, 'XI');
      var ratingNum = UI.el('b', null, ratingEl, '\u2013');

      var panel = UI.el('div', 't38__panel', root);
      var setupEl = UI.el('div', 'card t38__setup', panel);
      UI.el('span', 'kicker', setupEl, 'Formation');
      var formGrid = UI.el('div', 'vs-seg t38__forms', setupEl);
      var formBtns = FORMATION_NAMES.map(function (name) {
        var b = UI.el('button', 'vs-seg__btn', formGrid, name);
        b.type = 'button';
        b.addEventListener('click', function () { setup.formation = name; g.Sfx.play('tap'); syncSetup(); });
        return { el: b, name: name };
      });
      var hardRow = UI.el('div', 'settings-row settings-row--stack t38__hard', setupEl);
      var hardText = UI.el('div', null, hardRow);
      UI.el('b', null, hardText, 'Hard mode');
      UI.el('p', 'settings-row__note', hardText, 'No ratings. Pick on what you know; the numbers come out at full time.');
      var hardBtn = UI.el('button', 'btn', hardRow);
      hardBtn.type = 'button';
      hardBtn.setAttribute('aria-label', 'Hard mode');
      hardBtn.addEventListener('click', function () { setup.hard = !setup.hard; g.Sfx.play('tap'); syncSetup(); });
      var draftBtn = UI.el('button', 'btn btn--primary btn--wide', setupEl, 'Start the draft');
      draftBtn.type = 'button';
      draftBtn.addEventListener('click', beginDraft);

      var reel = UI.el('div', 'reel', panel);
      var reelClub = UI.el('b', 'reel__club', reel, 'Spin for your first player');
      var reelSeason = UI.el('span', 'reel__season', reel, '');
      reel.hidden = true;
      var actions = UI.el('div', 't38__actions', panel);
      var spinBtn = UI.el('button', 'btn btn--primary btn--wide', actions, 'Spin');
      spinBtn.type = 'button';
      var respinBtn = UI.el('button', 'btn btn--ghost', actions, 'Re-spin (1)');
      respinBtn.type = 'button';
      respinBtn.hidden = true;
      actions.hidden = true;
      var squad = UI.el('ol', 'squad', panel);
      var playBtn = UI.el('button', 'btn btn--gold btn--wide t38__play', panel, 'Play the season');
      playBtn.type = 'button';
      playBtn.hidden = true;
      var season = UI.el('div', 't38__season', root);
      season.hidden = true;

      spinBtn.addEventListener('click', function () { spin(false); });
      respinBtn.addEventListener('click', function () { if (respins > 0) { respins--; spin(true); } });
      playBtn.addEventListener('click', runSeason);
      syncSetup();

      function syncSetup() {
        formBtns.forEach(function (b) { b.el.setAttribute('aria-pressed', b.name === setup.formation ? 'true' : 'false'); });
        hardBtn.textContent = setup.hard ? 'On' : 'Off';
        hardBtn.setAttribute('aria-pressed', setup.hard ? 'true' : 'false');
        SLOTS = FORMATIONS[setup.formation];
        xi = SLOTS.map(function () { return null; });
        UI.clear(spotLayer);
        spots = SLOTS.map(function (s) {
          var b = UI.el('div', 'spot', spotLayer);
          b.style.left = s.x + '%';
          b.style.top = s.y + '%';
          UI.el('span', 'spot__pos', b, s.k);
          UI.el('span', 'spot__name', b, '');
          UI.el('b', 'spot__rating', b, '');
          return b;
        });
        ratingNum.textContent = setup.hard ? '?' : '\u2013';
        ctx.setMeta(setup.formation + (setup.hard ? ' \u00b7 Hard' : ''));
      }

      function beginDraft() {
        saveSetup(setup);
        panel.removeChild(setupEl);
        reel.hidden = false;
        actions.hidden = false;
        g.Sfx.play('whistle');
        ctx.setMeta('0/11');
      }

      function filled() { return xi.filter(Boolean).length; }

      function rating() {
        var picks = xi.filter(Boolean);
        if (!picks.length) return 0;
        return picks.reduce(function (s, p) { return s + p.eff; }, 0) / picks.length;
      }

      /* The best open slot for a position: least rating lost, first wins. */
      function bestSlot(pos) {
        var best = -1, cost = 99;
        SLOTS.forEach(function (s, i) {
          if (xi[i]) return;
          var c = FIT[s.k][pos];
          if (c !== undefined && c < cost) { cost = c; best = i; }
        });
        return best < 0 ? null : { i: best, cost: cost };
      }

      async function spin(isRespin) {
        if (busy || over) return;
        busy = true;
        spinBtn.hidden = true;
        respinBtn.hidden = true;
        UI.clear(squad);
        current = g.FA_SEASONS[order[spinIndex++ % order.length]];
        reel.classList.add('is-spinning');
        var steps = UI.reduced ? 1 : 14;
        for (var i = 0; i < steps; i++) {
          var s = g.FA_SEASONS[Math.floor(Math.random() * g.FA_SEASONS.length)];
          showReel(s);
          g.Sfx.play('spin');
          await UI.after(40 + i * 9);
        }
        showReel(current);
        reel.classList.remove('is-spinning');
        UI.pulse(reel, 'is-landed');
        g.Sfx.play('whistle');
        g.Sfx.haptic('medium');
        renderSquad();
        respinBtn.textContent = 'Re-spin (' + respins + ')';
        respinBtn.hidden = respins <= 0;
        busy = false;
        if (isRespin) UI.toast('Re-spun');
      }

      function showReel(s) {
        reel.style.setProperty('--club', s.c);
        reel.style.setProperty('--trim', s.c2);
        reelClub.textContent = s.club;
        reelSeason.textContent = s.season;
      }

      function renderSquad() {
        UI.clear(squad);
        /* Hard mode lists by name, since sorting by rating would give the ratings away. */
        var players = current.p.slice().sort(function (a, b) {
          return ORDER.indexOf(a[1]) - ORDER.indexOf(b[1]) || (setup.hard ? a[0].localeCompare(b[0]) : b[2] - a[2]);
        });
        var any = false;
        players.forEach(function (p) {
          var fit = bestSlot(p[1]);
          var row = UI.el('li', 'squad__row' + (fit ? '' : ' is-off'), squad);
          UI.el('span', 'pos pos--' + p[1], row, p[1]);
          UI.el('span', 'squad__name', row, p[0]);
          if (fit) {
            any = true;
            UI.el('span', 'squad__fit', row, fit.cost && !setup.hard ? SLOTS[fit.i].k + ' \u2212' + fit.cost : SLOTS[fit.i].k);
          }
          if (!setup.hard) UI.el('b', 'squad__rating', row, String(p[2]));
          if (!fit) return;
          row.tabIndex = 0;
          row.setAttribute('role', 'button');
          var take = function () { pick(p); };
          row.addEventListener('click', take);
          row.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); take(); }
          });
        });
        if (!any) {
          UI.el('li', 'squad__none', squad, 'Nobody here fits an open slot \u2014 spin again.');
          spinBtn.textContent = 'Spin again';
          spinBtn.hidden = false;
        }
      }

      function pick(p) {
        if (busy || over) return;
        var fit = bestSlot(p[1]);
        if (!fit) return;
        ctx.moved();
        xi[fit.i] = { name: p[0], pos: p[1], base: p[2], eff: p[2] - fit.cost, club: current.club, season: current.season, c: current.c, c2: current.c2 };
        var spot = spots[fit.i];
        spot.classList.add('is-filled');
        spot.style.setProperty('--club', current.c);
        spot.style.setProperty('--trim', current.c2);
        spot.querySelector('.spot__name').textContent = surname(p[0]);
        if (!setup.hard) spot.querySelector('.spot__rating').textContent = String(p[2] - fit.cost);
        UI.pulse(spot, 'is-pop');
        g.Sfx.play('good');
        g.Sfx.haptic('light');
        if (!setup.hard) UI.countUp(ratingNum, Number(ratingNum.textContent) || 0, rating(), 400, function (v) { return v.toFixed(1); });
        UI.clear(squad);
        respinBtn.hidden = true;
        ctx.setMeta(filled() + '/11');
        if (filled() === SLOTS.length) {
          reelClub.textContent = 'Your XI is ready';
          reelSeason.textContent = setup.hard ? setup.formation + ' \u00b7 rating hidden' : 'Rating ' + rating().toFixed(1);
          reel.style.removeProperty('--club');
          playBtn.hidden = false;
          return;
        }
        spinBtn.textContent = 'Spin';
        spinBtn.hidden = false;
      }

      async function runSeason() {
        if (busy || over) return;
        busy = true;
        playBtn.hidden = true;
        panel.hidden = true;
        season.hidden = false;
        var r = rating();
        if (setup.hard) {
          xi.forEach(function (p, i) { spots[i].querySelector('.spot__rating').textContent = String(p.eff); });
          UI.countUp(ratingNum, 0, r, 600, function (v) { return v.toFixed(1); });
        }
        var sim = simulate(r, ctx.rand);
        var head = UI.el('div', 't38__record', season);
        var rec = UI.el('b', null, head, '0-0-0');
        var pts = UI.el('span', null, head, '0 pts');
        var grid = UI.el('ol', 't38__grid', season);
        g.Sfx.play('whistle');
        var w = 0, d = 0, l = 0;
        for (var i = 0; i < sim.mine.length; i++) {
          var m = sim.mine[i];
          var res = m.f > m.a ? 'w' : m.f === m.a ? 'd' : 'l';
          if (res === 'w') w++; else if (res === 'd') d++; else l++;
          var cell = UI.el('li', 'res res--' + res, grid, m.f + '\u2013' + m.a);
          cell.title = (m.home ? 'vs ' : 'at ') + m.vs;
          rec.textContent = w + '-' + d + '-' + l;
          pts.textContent = (w * 3 + d) + ' pts';
          if (res === 'w') g.Sfx.play('tap');
          if (res === 'l') g.Sfx.play('bad');
          await UI.after(70);
        }
        busy = false;
        end(sim, r);
      }

      function end(sim, r) {
        if (over) return;
        over = true;
        var y = sim.you;
        var perfect = y.w === 38;
        if (perfect || sim.position === 1) { g.Sfx.play('crowd'); UI.celebrate('#2ee67a'); }
        var headline = perfect ? '38-0!' : y.l === 0 ? 'Invincibles' : sim.position === 1 ? 'Champions' : 'Finished ' + ordinal(sim.position);
        var mode = setup.formation + (setup.hard ? ' \u00b7 Hard mode' : '');
        ctx.finish({
          score: y.p,
          display: y.w + '-' + y.d + '-' + y.l,
          headline: headline,
          sub: y.p + ' pts \u00b7 ' + y.gf + ' scored, ' + y.ga + ' conceded \u00b7 XI rated ' + r.toFixed(1) + ' \u00b7 ' + mode,
          perfect: perfect,
          detail: function (parent) {
            var lineup = UI.el('ol', 't38__xi', parent);
            xi.forEach(function (p, i) {
              var li = UI.el('li', null, lineup);
              UI.el('span', 'pos pos--' + SLOTS[i].k, li, SLOTS[i].k);
              UI.el('span', 't38__xi-name', li, p.name);
              UI.el('small', null, li, p.club + ' ' + p.season);
              UI.el('b', null, li, String(p.eff));
            });
            var table = UI.el('ol', 't38__table', parent);
            sim.table.forEach(function (t, i) {
              if (i > 4 && !t.you) return;
              var li = UI.el('li', t.you ? 'is-you' : null, table);
              UI.el('span', null, li, (i + 1) + '. ' + t.name);
              UI.el('b', null, li, t.p + ' pts');
            });
          },
          share: (perfect ? '\uD83C\uDFC6 38-0! ' : sim.position === 1 ? '\uD83C\uDFC6 ' : '') + y.w + '-' + y.d + '-' + y.l + ' \u00b7 ' + y.p + ' pts \u00b7 ' + headline +
            '\nXI rated ' + r.toFixed(1) + ' \u00b7 ' + mode,
          track: { wins: y.w, points: y.p, position: sim.position, formation: setup.formation, hard: setup.hard }
        });
      }

      return {
        quit: function () {
          if (over) return;
          over = true;
          ctx.finish({ score: 0, display: 'Abandoned', headline: 'Season abandoned', sub: filled() + ' of 11 signed', perfect: false,
            share: 'Season abandoned after ' + filled() + ' signings', track: { abandoned: true } });
        },
        stop: function () { over = true; }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
