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

  /* Five different ladders a day; the whole set is used before any repeats. */
  function chooseLadders(ctx) {
    var all = g.FA_LADDERS.map(function (l, i) { return i; });
    if (ctx.mode !== 'daily') return Daily.shuffle(all, ctx.rand).slice(0, LADDERS);
    var perCycle = Math.floor(all.length / LADDERS);
    var n = Daily.number(ctx.date) - 1;
    var order = Daily.shuffle(all, Daily.rng('backyourself:' + Math.floor(n / perCycle)));
    var k = ((n % perCycle) + perCycle) % perCycle;
    return order.slice(k * LADDERS, k * LADDERS + LADDERS);
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

    start: function (ctx) {
      var ladders = chooseLadders(ctx).map(function (i) { return g.FA_LADDERS[i]; });
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
