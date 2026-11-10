/* Tension — sixty seconds to name as many of the ten on the card as you can.
 * Only answers on the card count. The twist is the killer: one or two slots
 * are announced before the whistle, and naming a killer ends your round
 * with nothing. */
(function (g) {
  'use strict';

  var UI = g.UI, Games = g.Games;
  var SECONDS = 60;

  function uniqueSlots(def) {
    var seen = {};
    def.a.forEach(function (p) { var k = p[0].trim(); seen[k] = (seen[k] || 0) + 1; });
    return def.a.map(function (p, i) { return i; }).filter(function (i) {
      var k = def.a[i][0].trim();
      return k && seen[k] === 1;
    });
  }

  function killerText(def, i) {
    return (def.kill || 'the {s}').replace('{s}', def.a[i][0].trim());
  }

  Games.register({
    id: 'tension',
    name: 'Tension',
    short: 'Tension',
    color: '#ff3d7f',
    tagline: 'Sixty seconds. Avoid the killer.',
    icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="8"/><path d="M12 13.5V9.2M9.5 2.5h5M12 2.5v3M18.4 6.6l1.4-1.4"/></svg>',
    rules: [
      'A card with ten answers on it, and sixty seconds on the clock.',
      'Name as many as you can. Only answers on the card count.',
      'Before the whistle you\u2019re told the killers: one or two places on the card.',
      'Name a killer and your round is over with nothing. Know your list!'
    ],
    better: 'high',

    start: function (ctx) {
      var pool = g.FA_LISTS.filter(function (d) { return !d.unranked && uniqueSlots(d).length >= 2; });
      var idx = ctx.choose(pool.length);
      if (ctx.mode === 'daily') {
        var tenable = g.FA_LISTS[g.Daily.pick(g.FA_LISTS.length, 'tenable', ctx.date)];
        if (pool[idx].id === tenable.id) idx = (idx + 1) % pool.length;
      }
      var def = pool[idx];
      var options = g.Daily.shuffle(uniqueSlots(def), ctx.rand);
      var killers = options.slice(0, ctx.rand() < 0.4 ? 2 : 1);
      var safe = 10 - killers.length;
      var found = new Set();
      var wrong = [];
      var over = false;
      var live = false;
      var killedBy = -1;
      var timer = null;

      var root = UI.el('div', 'tx', ctx.root);
      Games.questionCard(root, 'Name the ten on the card', def.q, def.note);

      var warn = UI.el('div', 'killers', root);
      UI.el('span', 'killers__label', warn, killers.length > 1 ? 'Double killer' : 'Killer');
      killers.forEach(function (i) {
        var k = UI.el('span', 'killers__card', warn);
        UI.el('i', 'redcard', k);
        UI.el('span', null, k, 'Don\u2019t name ' + killerText(def, i));
      });

      var bar = UI.el('div', 'tx__bar', root);
      var ring = UI.ring(bar, 'tx__ring');
      ring.set(SECONDS, SECONDS);
      var tally = UI.el('div', 'tx__tally', bar);
      var tallyNum = UI.el('b', null, tally, '0');
      UI.el('span', null, tally, '/' + safe);

      var go = UI.el('button', 'btn btn--primary btn--wide tx__go', root, 'Kick off');
      go.type = 'button';
      var box = UI.searchBox({ parent: root, kind: def.type, placeholder: 'Name a ' + Games.kindWord(def.type) + '\u2026', onPick: answer });
      box.setDisabled(true);
      box.root.hidden = true;
      var board = Games.board(root, def, { killers: killers });
      var wrongEl = UI.el('div', 'chips', root);
      ctx.setMeta(SECONDS + 's');

      go.addEventListener('click', function () {
        go.hidden = true;
        box.root.hidden = false;
        box.setDisabled(false);
        box.focus();
        live = true;
        g.Sfx.play('whistle');
        g.Sfx.haptic('medium');
        timer = UI.countdown(SECONDS, function (left, all, whole) {
          ring.set(left, all);
          if (whole) ctx.setMeta(Math.ceil(left) + 's');
          if (whole && left <= 10 && left > 0) g.Sfx.play('tick');
        }, function () { ctx.moved(); end('time'); });
        timer.start();
      });

      function answer(entry) {
        if (!live) return;
        ctx.moved();
        var i = Games.matchAnswer(def, entry);
        if (i >= 0 && found.has(i)) { UI.toast('Already got him'); return; }
        if (i >= 0 && killers.indexOf(i) >= 0) {
          killedBy = i;
          board.reveal(i, 'killed');
          UI.pulse(root, 'is-killed');
          g.Sfx.play('killed');
          g.Sfx.haptic('error');
          end('killed');
          return;
        }
        if (i >= 0) {
          found.add(i);
          board.reveal(i, 'hit');
          tallyNum.textContent = String(found.size);
          UI.pulse(tally, 'is-bump');
          g.Sfx.play('good');
          g.Sfx.haptic('success');
          if (found.size === safe) end('all');
          return;
        }
        if (wrong.indexOf(entry.label) >= 0) return;
        wrong.push(entry.label);
        UI.el('span', 'chip chip--bad', wrongEl, entry.label);
        g.Sfx.play('bad');
        g.Sfx.haptic('light');
      }

      function end(why) {
        if (over) return;
        over = true;
        live = false;
        var secsLeft = timer ? Math.ceil(timer.left()) : SECONDS;
        if (timer) timer.stop();
        box.setDisabled(true);
        go.hidden = true;
        def.a.forEach(function (p, i) {
          if (found.has(i) || i === killedBy) return;
          board.reveal(i, killers.indexOf(i) >= 0 ? 'killer' : 'miss');
        });
        var killed = why === 'killed';
        var n = killed ? 0 : found.size;
        ctx.finish({
          score: n,
          display: killed ? 'KILLED' : n + '/' + safe,
          headline: killed ? 'Killed by ' + killerText(def, killedBy) : why === 'all' ? 'Nerves of steel' : n >= safe - 2 ? 'Under pressure, delivered' : 'The clock won',
          sub: def.q,
          perfect: why === 'all',
          detail: function (parent) {
            var b = Games.board(parent, def, { killers: killers });
            def.a.forEach(function (p, i) {
              b.reveal(i, i === killedBy ? 'killed' : found.has(i) ? 'hit' : killers.indexOf(i) >= 0 ? 'killer' : 'miss');
            });
          },
          share: killed
            ? '\u2620\uFE0F Killed by ' + killerText(def, killedBy) + ' after ' + UI.plural(found.size, 'answer')
            : '\u23F1\uFE0F ' + n + '/' + safe + (why === 'all' ? ' with ' + secsLeft + 's to spare' : '') + ' \u00b7 ' + '\uD83D\uDFE5'.repeat(killers.length) + ' avoided',
          track: { list: def.id, found: found.size, killed: killed, killers: killers.length }
        });
      }

      return {
        quit: function () { if (!over) end('time'); },
        stop: function () { over = true; if (timer) timer.stop(); }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
