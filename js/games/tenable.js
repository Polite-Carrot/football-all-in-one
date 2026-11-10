/* Football Tenable — name the ten answers on the board. A wrong answer costs
 * one of four lives; two hints show an empty slot's initials. Find all ten
 * and it's Tenable. */
(function (g) {
  'use strict';

  var UI = g.UI, Games = g.Games;
  var LIVES = 4;
  var HINTS = 2;

  function initials(name) {
    return name.split(/[\s-]+/).filter(Boolean).map(function (w) { return w.charAt(0).toUpperCase() + '.'; }).join(' ');
  }

  Games.register({
    id: 'tenable',
    name: 'Football Tenable',
    short: 'Tenable',
    color: '#3d8bff',
    tagline: 'Name the top ten. Four lives.',
    icon: '<svg viewBox="0 0 24 24"><rect x="4" y="2.5" width="16" height="19" rx="2.5"/><path d="M8 7h8M8 11h8M8 15h8M8 19h4"/></svg>',
    rules: [
      'There are ten answers on the board. Type a name and pick it from the list.',
      'Every right answer drops into its place on the board.',
      'A wrong answer costs a life. You have four.',
      'Stuck? Two hints show the initials of an empty slot.',
      'Find all ten before you run out and it\u2019s Tenable!'
    ],
    better: 'high',

    start: function (ctx) {
      var pool = g.FA_LISTS;
      var pick = ctx.choose(pool.length);
      var def = pool[pick];
      var found = new Set();
      var wrong = [];
      var lives = LIVES;
      var over = false;

      var root = UI.el('div', 'tn', ctx.root);
      Games.questionCard(root, 'Name the ten', def.q, def.note);

      var status = UI.el('div', 'tn__status', root);
      var livesEl = UI.el('div', 'lives', status);
      var balls = [];
      for (var i = 0; i < LIVES; i++) {
        balls.push(UI.svg('<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z"/></svg>', 'life', livesEl));
      }
      var tally = UI.el('div', 'tn__tally', status);
      var tallyNum = UI.el('b', null, tally, '0');
      UI.el('span', null, tally, '/10');

      var box = UI.searchBox({
        parent: root,
        kind: def.type,
        placeholder: 'Name a ' + Games.kindWord(def.type) + '\u2026',
        onPick: answer
      });

      var board = Games.board(root, def);
      var wrongEl = UI.el('div', 'chips', root);
      var tools = UI.el('div', 'tn__tools', root);
      var hints = HINTS;
      var hinted = new Set();
      var hintBtn = UI.el('button', 'btn btn--ghost btn--small', tools, '');
      hintBtn.type = 'button';
      var giveUp = UI.el('button', 'btn btn--quiet btn--small tn__giveup', tools, 'Give up');
      giveUp.type = 'button';
      giveUp.addEventListener('click', function () { end(); });
      hintBtn.addEventListener('click', hint);
      syncHint();
      ctx.setMeta(lives + ' lives');
      setTimeout(box.focus, 350);

      function syncHint() {
        hintBtn.textContent = 'Hint (' + hints + ')';
        hintBtn.disabled = hints <= 0 || over;
      }

      /* Unranked boards fill in answer order, so a slot hint would point at the wrong row: those get a toast. */
      function hint() {
        if (over || hints <= 0) return;
        var open = [];
        def.a.forEach(function (pair, i) { if (!found.has(i) && !hinted.has(i)) open.push(i); });
        if (!open.length) return;
        var i = open[Math.floor(ctx.rand() * open.length)];
        hints -= 1;
        hinted.add(i);
        var text = initials(def.type === 'club' ? g.Footy.prettyClub(def.a[i][1]) : def.a[i][1]);
        if (def.unranked) UI.toast('One of them: ' + text);
        else board.hint(i, text);
        g.Sfx.play('tap');
        syncHint();
      }

      function answer(entry) {
        if (over) return;
        ctx.moved();
        var i = Games.matchAnswer(def, entry);
        if (i >= 0 && found.has(i)) {
          UI.toast('Already on the board');
          g.Sfx.play('tap');
          return;
        }
        if (i >= 0) {
          found.add(i);
          board.reveal(i, 'hit');
          tallyNum.textContent = String(found.size);
          UI.pulse(tally, 'is-bump');
          g.Sfx.play(found.size === 10 ? 'great' : 'good');
          g.Sfx.haptic('success');
          if (found.size === 10) end();
          return;
        }
        if (wrong.indexOf(entry.label) >= 0) { UI.toast('Already tried'); return; }
        wrong.push(entry.label);
        lives -= 1;
        UI.el('span', 'chip chip--bad', wrongEl, entry.label);
        balls[lives].classList.add('is-lost');
        UI.pulse(root, 'is-shake');
        g.Sfx.play('bad');
        g.Sfx.haptic('error');
        ctx.setMeta(UI.plural(lives, 'life', 'lives'));
        if (lives <= 0) end();
      }

      function end() {
        if (over) return;
        over = true;
        box.setDisabled(true);
        tools.hidden = true;
        def.a.forEach(function (pair, i) { if (!found.has(i)) board.reveal(i, 'miss'); });
        var n = found.size;
        var squares = def.a.map(function (p, i) { return found.has(i) ? '\uD83D\uDFE9' : '\u2B1B'; }).join('');
        ctx.finish({
          score: n,
          display: n + '/10',
          headline: n === 10 ? 'TENABLE!' : n >= 8 ? 'So close' : n >= 5 ? 'Solid' : 'Tough board',
          sub: def.q,
          perfect: n === 10,
          detail: function (parent) {
            var b = Games.board(parent, def);
            def.a.forEach(function (pair, i) { if (found.has(i)) b.reveal(i, 'hit'); });
            def.a.forEach(function (pair, i) { if (!found.has(i)) b.reveal(i, 'miss'); });
          },
          share: squares + ' ' + n + '/10' + (n === 10 ? ' \uD83C\uDFC6' : ''),
          track: { list: def.id, found: n, lives: lives, hints: HINTS - hints }
        });
      }

      return {
        quit: function () { if (!over) end(); },
        stop: function () { over = true; }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
