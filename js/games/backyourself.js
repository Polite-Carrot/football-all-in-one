/* Back Yourself — five ladders of three questions, easy to expert. Get a rung
 * right and choose: bank the points, or back yourself for the next rung.
 * Any wrong answer and the ladder is worth nothing. */
(function (g) {
  'use strict';

  var UI = g.UI, Games = g.Games, Daily = g.Daily;
  var LADDERS = 5;
  var SECONDS = 20;
  var RUNG = ['Easy', 'Hard', 'Expert'];
  var EMOJI = ['\u274C', '1\uFE0F\u20E3', '2\uFE0F\u20E3', '3\uFE0F\u20E3'];

  /* Each round mixes CURATED hand-written ladders with ladders built from the
     player database, which has thousands of combinations, so questions rarely
     come round again. */
  var CURATED = 2;
  var SEEN_KEY = 'footballaio.by.seen.v1';

  function seenTopics() {
    try { var s = JSON.parse(g.Store.read(SEEN_KEY) || '[]'); return Array.isArray(s) ? s : []; } catch (e) { return []; }
  }

  function chooseCurated(ctx) {
    var all = g.FA_LADDERS.map(function (l, i) { return i; });
    if (ctx.mode === 'daily') {
      var perCycle = Math.floor(all.length / CURATED);
      var n = Daily.number(ctx.date) - 1;
      var order = Daily.shuffle(all, Daily.rng('backyourself:' + Math.floor(n / perCycle)));
      var k = ((n % perCycle) + perCycle) % perCycle;
      return order.slice(k * CURATED, k * CURATED + CURATED);
    }
    var shuffled = Daily.shuffle(all, ctx.rand);
    /* Practice skips topics seen lately; versus must pick the same on both phones, so it cannot. */
    if (ctx.mode === 'practice') {
      var seen = seenTopics();
      var fresh = shuffled.filter(function (i) { return seen.indexOf(g.FA_LADDERS[i].topic) < 0; });
      if (fresh.length >= CURATED) shuffled = fresh;
    }
    return shuffled.slice(0, CURATED);
  }

  function rememberTopics(ladders) {
    var seen = seenTopics().concat(ladders.map(function (l) { return l.topic; }));
    g.Store.write(SEEN_KEY, JSON.stringify(seen.slice(-Math.floor(g.FA_LADDERS.length * 0.7))));
  }

  /* ───────── generated ladders ─────────
     Directory order is famous-first, so a player's index is his fame rank:
     easy rungs use household names, expert rungs the deep cuts. Wrong options
     are players of similar fame (and position, where possible), so the right
     answer never stands out for being the only name you know. */

  function pickFrom(list, rand) { return list[Math.floor(rand() * list.length)]; }

  function decoys(F, near, ok, n, rand) {
    var pos = F.position(near);
    var lo = Math.max(0, near - 500), hi = Math.min(F.count(), near + 500);
    var same = [], any = [];
    for (var i = lo; i < hi; i++) {
      if (i === near || !ok(i) || !F.fame(i)) continue;
      (F.position(i) === pos ? same : any).push(i);
    }
    var pool = same.length >= n ? same : same.concat(any);
    return pool.length >= n ? Daily.shuffle(pool, rand).slice(0, n) : null;
  }

  function distinct(options) {
    var seen = {};
    return options.every(function (o) { var k = g.Footy.norm(o); if (seen[k]) return false; seen[k] = 1; return true; });
  }

  function playedFor(F, c, members, from, to, rand) {
    var p = pickFrom(members.slice(Math.floor(members.length * from), Math.max(Math.floor(members.length * to), 1)), rand);
    var wrong = decoys(F, p, function (x) { return !c._set.has(x); }, 3, rand);
    if (!wrong) return null;
    return ['Which of these played for ' + c.n + '?', F.name(p)].concat(wrong.map(F.name));
  }

  function whichClub(F, c, members, clubs, rand) {
    var p = pickFrom(members.slice(Math.floor(members.length * 0.08), Math.floor(members.length * 0.3)), rand);
    var others = Daily.shuffle(clubs.filter(function (t) { return t !== c && !t._set.has(p); }), rand).slice(0, 3);
    if (others.length < 3) return null;
    return ['Which of these clubs did ' + F.name(p) + ' play for?', c.n].concat(others.map(function (t) { return t.n; }));
  }

  function playedForBoth(F, c, members, clubs, rand) {
    var partners = Daily.shuffle(clubs.filter(function (t) { return t !== c; }), rand);
    for (var i = 0; i < partners.length; i++) {
      var d = partners[i];
      var both = members.filter(function (x) { return d._set.has(x); });
      if (both.length < 4) continue;
      var p = pickFrom(both.slice(0, Math.ceil(both.length / 2)), rand);
      var wrong = decoys(F, p, function (x) { return c._set.has(x) && !d._set.has(x); }, 3, rand);
      if (wrong) return ['Which of these played for both ' + c.n + ' and ' + d.n + '?', F.name(p)].concat(wrong.map(F.name));
    }
    return null;
  }

  /* Three members and one outsider of similar fame: the outsider is the answer. */
  function didNotPlay(F, c, members, rand) {
    var band = members.slice(0, Math.floor(members.length * 0.15));
    var three = Daily.shuffle(band, rand).slice(0, 3);
    var odd = decoys(F, three[0], function (x) { return !c._set.has(x); }, 1, rand);
    if (three.length < 3 || !odd) return null;
    return ['Which of these did NOT play for ' + c.n + '?', F.name(odd[0])].concat(three.map(F.name));
  }

  function clubLadder(F, c, clubs, rand) {
    var members = c._list.filter(function (x) { return F.fame(x) > 0; }).sort(function (a, b) { return a - b; });
    if (members.length < 60) return null;
    var easy = playedFor(F, c, members, 0, 0.06, rand);
    var roll = rand();
    var hard = roll < 0.4 ? whichClub(F, c, members, clubs, rand)
      : roll < 0.7 ? didNotPlay(F, c, members, rand)
      : playedFor(F, c, members, 0.06, 0.25, rand);
    var expert = rand() < 0.6 ? playedForBoth(F, c, members, clubs, rand) : playedFor(F, c, members, 0.25, 0.55, rand);
    var q = [easy, hard, expert];
    if (q.some(function (x) { return !x || !distinct(x.slice(1)); })) return null;
    return { topic: c.n, q: q };
  }

  function generated(rand, count) {
    var F = g.Footy;
    var clubs = F.teamKeys().map(F.team).filter(function (t) { return t && !t.nt && t.big; });
    var out = [], used = {};
    for (var tries = 0; out.length < count && tries < 80; tries++) {
      var c = pickFrom(clubs, rand);
      if (used[c.k]) continue;
      var l = clubLadder(F, c, clubs, rand);
      if (l) { used[c.k] = 1; out.push(l); }
    }
    return out;
  }

  function chooseLadders(ctx) {
    var curated = chooseCurated(ctx).map(function (i) { return g.FA_LADDERS[i]; });
    var made = generated(ctx.rand, LADDERS - curated.length);
    if (ctx.mode === 'practice') rememberTopics(curated);
    return Daily.shuffle(curated.concat(made), ctx.rand);
  }

  Games.register({
    id: 'backyourself',
    name: 'Back Yourself',
    short: 'Back Yourself',
    color: '#ffc83d',
    tagline: 'Bank it, or back yourself.',
    icon: '<svg viewBox="0 0 24 24"><path d="M7 2.5v19M17 2.5v19M7 7h10M7 12h10M7 17h10"/><path d="M19.5 5.5l2-2.2M21.5 3.3v2.4h-2.4" /></svg>',
    rules: [
      'Five ladders, each with three questions: easy, hard and expert.',
      'Get the easy one right for a point. Then bank it, or back yourself.',
      'Each rung you climb is worth another point, up to three.',
      'Get any rung wrong and the whole ladder scores nothing.'
    ],
    better: 'high',
    pickLadders: chooseLadders,

    start: function (ctx) {
      var ladders = chooseLadders(ctx);
      var results = [];
      var li = -1, rung = 0;
      var over = false;
      var timer = null;
      var answering = false;

      var root = UI.el('div', 'by', ctx.root);
      var track = UI.el('div', 'by__track', root);
      var pips = ladders.map(function () { return UI.el('span', 'by__pip', track); });
      var card = UI.el('div', 'by__card', root);
      var topic = UI.el('div', 'by__topic', card);
      var topicName = UI.el('b', null, topic, '');
      var ring = UI.ring(topic, 'by__ring');
      var ladder = UI.el('ol', 'by__ladder', card);
      /* Drawn top-down (Expert first) but indexed bottom-up: rungEls[0] is Easy. */
      var rungEls = [];
      for (var r = RUNG.length - 1; r >= 0; r--) {
        var rungEl = UI.el('li', 'by__rung', ladder);
        UI.el('span', null, rungEl, RUNG[r]);
        UI.el('b', null, rungEl, (r + 1) + ' pt' + (r ? 's' : ''));
        rungEls[r] = rungEl;
      }
      var qText = UI.el('h2', 'by__q', root, '');
      var opts = UI.el('div', 'by__opts', root);
      var decide = UI.el('div', 'by__decide', root);
      var bank = UI.el('button', 'btn btn--ghost by__bank', decide, '');
      bank.type = 'button';
      var back = UI.el('button', 'btn btn--gold by__back', decide, 'Back yourself');
      back.type = 'button';
      decide.hidden = true;
      var next = UI.el('button', 'btn btn--primary btn--wide', root, 'Next ladder');
      next.type = 'button';
      next.hidden = true;
      var scoreEl = UI.el('div', 'by__score', root);
      UI.el('span', null, scoreEl, 'Banked');
      var scoreNum = UI.el('b', null, scoreEl, '0');

      bank.addEventListener('click', function () { settle(rung); });
      back.addEventListener('click', function () {
        decide.hidden = true;
        g.Sfx.play('whistle');
        g.Sfx.haptic('medium');
        ask(rung + 1);
      });
      next.addEventListener('click', nextLadder);

      nextLadder();

      function banked() { return results.reduce(function (s, r) { return s + r; }, 0); }

      function nextLadder() {
        if (over) return;
        next.hidden = true;
        li += 1;
        if (li >= ladders.length) { end(); return; }
        pips.forEach(function (p, i) { p.classList.toggle('is-now', i === li); });
        topicName.textContent = 'Ladder ' + (li + 1) + ' \u00b7 ' + ladders[li].topic;
        rungEls.forEach(function (r) { r.className = 'by__rung'; });
        UI.pulse(card, 'is-in');
        ask(0);
      }

      function ask(r) {
        rung = r;
        var q = ladders[li].q[r];
        rungEls.forEach(function (el, i) { el.classList.toggle('is-now', i === r); });
        qText.textContent = q[0];
        UI.pulse(qText, 'is-in');
        UI.clear(opts);
        Daily.shuffle(q.slice(1), ctx.rand).forEach(function (text) {
          var b = UI.el('button', 'opt', opts, text);
          b.type = 'button';
          b.addEventListener('click', function () { choose(b, text === q[1]); });
        });
        answering = true;
        ctx.setMeta(banked() + ' banked');
        if (timer) timer.stop();
        timer = UI.countdown(SECONDS, function (left, all, whole) {
          ring.set(left, all);
          if (whole && left <= 5 && left > 0) g.Sfx.play('tick');
        }, function () { if (answering) choose(null, false); });
        timer.start();
      }

      function choose(btn, right) {
        if (!answering) return;
        answering = false;
        ctx.moved();
        timer.stop();
        var q = ladders[li].q[rung];
        Array.prototype.forEach.call(opts.children, function (b) {
          b.disabled = true;
          if (b.textContent === q[1]) b.classList.add('is-right');
        });
        if (btn && !right) btn.classList.add('is-wrong');
        if (!right) {
          rungEls[rung].classList.add('is-bust');
          g.Sfx.play('bad');
          g.Sfx.haptic('error');
          UI.toast(btn ? 'Wrong \u2014 the ladder is lost' : 'Out of time \u2014 the ladder is lost', 'bad');
          finishLadder(0);
          return;
        }
        rungEls[rung].classList.add('is-won');
        g.Sfx.play('good');
        g.Sfx.haptic('success');
        if (rung === 2) { finishLadder(3); return; }
        bank.textContent = 'Bank ' + UI.plural(rung + 1, 'point');
        decide.hidden = false;
        UI.pulse(decide, 'is-in');
      }

      function settle(points) {
        decide.hidden = true;
        g.Sfx.play('coin');
        g.Sfx.haptic('light');
        finishLadder(points + 1);
      }

      function finishLadder(points) {
        results.push(points);
        pips[li].classList.add(points ? 'is-won' : 'is-bust');
        pips[li].textContent = String(points);
        UI.countUp(scoreNum, banked() - points, banked(), 400);
        ctx.setMeta(banked() + ' banked');
        next.textContent = li + 1 >= ladders.length ? 'See your score' : 'Next ladder';
        next.hidden = false;
      }

      function end() {
        if (over) return;
        over = true;
        if (timer) timer.stop();
        var t = banked();
        var max = ladders.length * 3;
        ctx.finish({
          score: t,
          display: t + '/' + max,
          headline: t === max ? 'Fearless' : t >= 11 ? 'Backed yourself' : t >= 7 ? 'Shrewd' : 'Played it safe',
          sub: UI.plural(results.filter(function (r) { return r === 3; }).length, 'ladder') + ' climbed to the top',
          perfect: t === max,
          detail: function (parent) {
            var list = UI.el('ol', 'by__summary', parent);
            ladders.forEach(function (l, i) {
              var r = results[i] || 0;
              var row = UI.el('li', r ? 'is-won' : 'is-bust', list);
              UI.el('span', null, row, l.topic);
              UI.el('b', null, row, r ? '+' + r : 'Lost');
            });
          },
          share: results.map(function (r) { return EMOJI[r]; }).join('') + ' ' + t + '/' + max,
          track: { score: t }
        });
      }

      return {
        quit: function () {
          if (over) return;
          if (timer) timer.stop();
          while (results.length < ladders.length) results.push(0);
          end();
        },
        stop: function () { over = true; if (timer) timer.stop(); }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
