/* LONGSHOTS — seven questions, 25 seconds and one answer each. Every right
 * answer is a goal, scored from as far out as the answer is obscure: the
 * household name is a 6-yard tap-in, the forgotten squad player goes in from
 * his own half. A wrong name is a shot wide. Score is total distance. */
(function (g) {
  'use strict';

  var UI = g.UI, Games = g.Games, Footy = g.Footy;
  var QUESTIONS = 7;
  var SECONDS = 25;

  /* Fame rank (0 obscure .. 1 famous) to metres: 6 m to 88 m. */
  function distance(r) {
    return Math.round(6 + 82 * Math.pow(1 - r, 1.8));
  }

  function tier(m) {
    if (m >= 53) return 'From his own half';
    if (m >= 35) return 'Screamer';
    if (m >= 25) return 'Thirty-yarder';
    if (m >= 16) return 'Edge of the box';
    return 'Tap-in';
  }

  var PITCH =
    '<svg viewBox="0 0 68 92" preserveAspectRatio="xMidYMin meet" aria-hidden="true">' +
    '<defs><pattern id="ls-stripes" width="68" height="16" patternUnits="userSpaceOnUse">' +
    '<rect width="68" height="8" fill="#1b6b38"/><rect y="8" width="68" height="8" fill="#186233"/></pattern></defs>' +
    '<rect x="0" y="0" width="68" height="92" fill="url(#ls-stripes)"/>' +
    '<g class="lines" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".35">' +
    '<rect x="0.6" y="2" width="66.8" height="89"/>' +
    '<rect x="13.85" y="2" width="40.3" height="16.5"/><rect x="24.84" y="2" width="18.32" height="5.5"/>' +
    '<path d="M26.7 18.5 A9.15 9.15 0 0 0 41.3 18.5"/><line x1="0.6" y1="54.5" x2="67.4" y2="54.5"/>' +
    '<circle cx="34" cy="54.5" r="9.15"/><circle cx="34" cy="13" r=".35" fill="rgba(255,255,255,.7)"/></g>' +
    '<rect class="goal" x="30.34" y="0" width="7.32" height="2" fill="rgba(255,255,255,.18)" stroke="#fff" stroke-width=".5"/>' +
    '<path class="trail" d="" fill="none" stroke="rgba(255,255,255,.7)" stroke-width=".45" stroke-dasharray="1 1.2"/>' +
    '<g class="mark"><text class="mark__text" x="34" y="0" text-anchor="middle"></text></g>' +
    '<circle class="ball" cx="34" cy="86" r="1.5" fill="#fff" stroke="#111" stroke-width=".3"/></svg>';

  /* A balanced day: a couple of each kind of question, never two alike. */
  function chooseQuestions(rand) {
    var sets = Footy.sets();
    var byType = { club: [], both: [], nt: [], gk: [] };
    sets.forEach(function (s) { if (byType[s.t]) byType[s.t].push(s); });
    var plan = ['club', 'both', 'nt', 'gk', 'both', 'nt', 'club'];
    var used = {};
    var picks = [];
    plan.forEach(function (t) {
      var options = g.Daily.shuffle(byType[t].length ? byType[t] : sets, rand);
      for (var i = 0; i < options.length; i++) {
        var s = options[i];
        var clubs = [s.a, s.b].filter(Boolean);
        if (used[s.id] || clubs.some(function (c) { return used['c:' + c]; })) continue;
        used[s.id] = 1;
        clubs.forEach(function (c) { if (!Footy.team(c).nt) used['c:' + c] = 1; });
        picks.push(s);
        return;
      }
    });
    return picks.slice(0, QUESTIONS);
  }

  Games.register({
    id: 'longshots',
    name: 'LONGSHOTS',
    short: 'LONGSHOTS',
    color: '#ff9f1c',
    tagline: 'The rarer the answer, the further out.',
    icon: '<svg viewBox="0 0 24 24"><path d="M6 3.5h12v4H6z"/><circle cx="7" cy="19" r="2.6"/><path d="M8.6 16.8C10 12 12 9.5 12 7.5" stroke-dasharray="1.6 1.8"/></svg>',
    rules: [
      'Seven questions, 25 seconds each, one answer each.',
      'A right answer is a goal. The rarer the answer, the further out you scored it.',
      'The household name is a 6 m tap-in; the forgotten squad player goes in from 88 m.',
      'A wrong name is a shot wide. Your score is your total distance.'
    ],
    better: 'high',
    distance: distance,
    tier: tier,

    start: function (ctx) {
      var questions = chooseQuestions(ctx.rand);
      var shots = [];
      var qi = -1;
      var over = false;
      var waiting = false;
      var timer = null;

      var root = UI.el('div', 'ls', ctx.root);
      var head = UI.el('div', 'ls__head', root);
      var count = UI.el('span', 'ls__count', head, '');
      var ring = UI.ring(head, 'ls__ring');
      var qText = UI.el('h2', 'ls__q', root, '');
      var box = UI.searchBox({ parent: root, kind: 'player', placeholder: 'Name a player\u2026', onPick: shoot });
      var pitchWrap = UI.el('div', 'pitch', root);
      pitchWrap.innerHTML = PITCH;
      var svgEl = pitchWrap.querySelector('svg');
      var ball = svgEl.querySelector('.ball');
      var trail = svgEl.querySelector('.trail');
      var goal = svgEl.querySelector('.goal');
      var markText = svgEl.querySelector('.mark__text');
      var verdict = UI.el('div', 'ls__verdict', pitchWrap);
      var totalEl = UI.el('div', 'ls__total', root);
      UI.el('span', null, totalEl, 'Total distance');
      var totalNum = UI.el('b', null, totalEl, '0m');
      var next = UI.el('button', 'btn btn--primary btn--wide ls__next', root, 'Next question');
      next.type = 'button';
      next.hidden = true;
      next.addEventListener('click', advance);

      advance();

      function total() { return shots.reduce(function (s, x) { return s + x.m; }, 0); }

      function advance() {
        if (over) return;
        qi += 1;
        next.hidden = true;
        if (qi >= questions.length) { end(); return; }
        var q = questions[qi];
        q.members = Footy.setMembers(q);
        q.inSet = new Set(q.members);
        q.ranks = Footy.fameRanks(q.members);
        count.textContent = 'Question ' + (qi + 1) + ' of ' + questions.length;
        qText.textContent = Footy.setText(q);
        UI.pulse(qText, 'is-in');
        verdict.className = 'ls__verdict';
        verdict.textContent = '';
        trail.setAttribute('d', '');
        markText.textContent = '';
        place(ball, 34, 86);
        box.setDisabled(false);
        box.focus();
        waiting = true;
        ctx.setMeta(total() + 'm');
        if (timer) timer.stop();
        timer = UI.countdown(SECONDS, function (left, all, whole) {
          ring.set(left, all);
          if (whole && left <= 5 && left > 0) g.Sfx.play('tick');
        }, function () { if (waiting) result(null, 'time'); });
        timer.start();
      }

      function shoot(entry) {
        if (!waiting) return;
        var q = questions[qi];
        if (q.inSet.has(entry.id)) result(entry, 'goal');
        else result(entry, 'wide');
      }

      function place(node, x, y) { node.setAttribute('cx', x.toFixed(2)); node.setAttribute('cy', y.toFixed(2)); }

      async function result(entry, how) {
        waiting = false;
        if (timer) timer.stop();
        box.setDisabled(true);
        var q = questions[qi];
        var m = how === 'goal' ? distance(q.ranks.get(entry.id)) : 0;
        shots.push({ q: Footy.setText(q), name: entry ? entry.label : '\u2014', m: m, how: how });
        if (how === 'time') {
          verdict.textContent = 'Time\u2019s up';
          verdict.className = 'ls__verdict is-on is-miss';
          g.Sfx.play('whistle');
        } else {
          await fly(how === 'goal' ? m : 18 + (qi * 7) % 30, how === 'goal');
          if (how === 'goal') {
            verdict.innerHTML = '';
            UI.el('b', null, verdict, m + 'm');
            UI.el('span', null, verdict, tier(m) + ' \u00b7 ' + entry.label);
            verdict.className = 'ls__verdict is-on is-goal';
          } else {
            verdict.innerHTML = '';
            UI.el('b', null, verdict, 'Wide!');
            UI.el('span', null, verdict, entry.label + ' doesn\u2019t fit');
            verdict.className = 'ls__verdict is-on is-miss';
          }
        }
        UI.countUp(totalNum, total() - m, total(), 600, function (v) { return Math.round(v) + 'm'; });
        ctx.setMeta(total() + 'm');
        next.textContent = qi + 1 >= questions.length ? 'See your score' : 'Next question';
        next.hidden = false;
        next.focus({ preventScroll: true });
      }

      /* The ball starts as far out as the answer scored, then curls in. */
      function fly(m, scored) {
        var side = (qi % 2 ? 1 : -1) * (6 + (m % 9));
        var sx = Math.max(4, Math.min(64, 34 + side * Math.min(1, m / 40)));
        var sy = Math.min(89, 2 + m);
        place(ball, sx, sy);
        markText.setAttribute('y', (sy + 4).toFixed(1));
        markText.setAttribute('x', sx.toFixed(1));
        markText.textContent = scored ? m + 'm' : '';
        var ex = scored ? 34 + ((m * 7) % 5) - 2 : (sx < 34 ? 24 : 44);
        var ey = scored ? 1 : -1;
        var cx = (sx + ex) / 2 + (sx < 34 ? -8 : 8);
        var cy = Math.min(sy, ey) + (sy - ey) * 0.35;
        trail.setAttribute('d', 'M' + sx + ' ' + sy + ' Q' + cx + ' ' + cy + ' ' + ex + ' ' + ey);
        g.Sfx.play('kick');
        g.Sfx.haptic('medium');
        var ms = UI.reduced ? 1 : 520 + m * 6;
        return new Promise(function (done) {
          var t0 = null;
          function step(ts) {
            if (t0 === null) t0 = ts;
            var k = Math.min(1, (ts - t0) / ms);
            var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            var x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * cx + e * e * ex;
            var y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * cy + e * e * ey;
            place(ball, x, y);
            ball.setAttribute('r', (1.5 + Math.sin(k * Math.PI) * 0.9).toFixed(2));
            if (k < 1) { requestAnimationFrame(step); return; }
            if (scored) {
              UI.pulse(goal, 'is-net');
              g.Sfx.play(m >= 35 ? 'crowd' : 'net');
              g.Sfx.haptic('success');
            } else {
              g.Sfx.play('bad');
              g.Sfx.haptic('warning');
            }
            done();
          }
          requestAnimationFrame(step);
        });
      }

      function end() {
        if (over) return;
        over = true;
        if (timer) timer.stop();
        box.setDisabled(true);
        var t = total();
        var goals = shots.filter(function (s) { return s.how === 'goal'; }).length;
        var line = shots.map(function (s) { return s.how === 'goal' ? s.m + 'm' : '\u274C'; }).join(' \u00b7 ');
        ctx.finish({
          score: t,
          display: t + 'm',
          headline: t >= 300 ? 'Worldies!' : t >= 200 ? 'Long-range specialist' : goals >= 5 ? 'Clinical' : goals ? 'Hit and hope' : 'Row Z',
          sub: UI.plural(goals, 'goal') + ' from ' + questions.length + ' shots',
          perfect: goals === questions.length && t >= 300,
          detail: function (parent) {
            var list = UI.el('ol', 'ls__summary', parent);
            shots.forEach(function (s) {
              var li = UI.el('li', 'is-' + s.how, list);
              UI.el('span', 'ls__summary-q', li, s.q);
              UI.el('span', 'ls__summary-a', li, s.name);
              UI.el('b', null, li, s.how === 'goal' ? s.m + 'm' : s.how === 'time' ? 'Time' : 'Wide');
            });
          },
          share: '\u26BD ' + t + 'm\n' + line,
          track: { total: t, goals: goals }
        });
      }

      return {
        quit: function () {
          if (over) return;
          while (shots.length < questions.length) shots.push({ q: '', name: '\u2014', m: 0, how: 'time' });
          end();
        },
        stop: function () { over = true; if (timer) timer.stop(); }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
