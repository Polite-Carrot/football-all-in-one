/* Football Tenable — name the ten answers on the board. A wrong answer costs
 * one of three lives; find all ten and it's Tenable. */
(function (g) {
  'use strict';

  var UI = g.UI, Games = g.Games;
  var LIVES = 3;

  Games.register({
    id: 'tenable',
    name: 'Football Tenable',
    short: 'Tenable',
    color: '#3d8bff',
    tagline: 'Name the top ten. Three lives.',
    icon: '<svg viewBox="0 0 24 24"><rect x="4" y="2.5" width="16" height="19" rx="2.5"/><path d="M8 7h8M8 11h8M8 15h8M8 19h4"/></svg>',
    rules: [
      'There are ten answers on the board. Type a name and pick it from the list.',
      'Every right answer drops into its place on the board.',
      'A wrong answer costs a life. You have three.',
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
      var giveUp = UI.el('button', 'btn btn--quiet btn--small tn__giveup', root, 'Give up');
      giveUp.type = 'button';
      giveUp.addEventListener('click', function () { end(); });
      ctx.setMeta(lives + ' lives');
      setTimeout(box.focus, 350);

      function answer(entry) {
        if (over) return;
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
        giveUp.hidden = true;
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
          track: { list: def.id, found: n, lives: lives }
        });
      }

      return {
        quit: function () { if (!over) end(); },
        stop: function () { over = true; }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
