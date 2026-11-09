/* 501 — football darts. Start on 501; every player you name takes his number
 * off. Over 180 is a bust, and so is going below zero. Check out on exactly
 * zero in as few names as you can. */
(function (g) {
  'use strict';

  var UI = g.UI, Games = g.Games, Footy = g.Footy;
  var START = 501;
  var MAX_NAMES = 15;
  var MAX_SCORE = 180;

  Games.register({
    id: '501',
    name: '501',
    short: '501',
    color: '#ff4d5e',
    tagline: 'Football darts. Check out on zero.',
    icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.6" class="fill"/><path d="M13.2 10.8L20.5 3.5M18 3.2l2.6.3.3 2.6"/></svg>',
    rules: [
      'You start on 501. Name a player and his number on today\u2019s board comes off.',
      'Over 180 in one name is a bust: it counts as a dart but scores nothing.',
      'Going below zero is a bust too. Someone who doesn\u2019t fit the board scores nothing.',
      'Check out on exactly zero in the fewest names. You have ' + MAX_NAMES + '.'
    ],
    better: 'low',

    start: function (ctx) {
      var boards = Footy.boards();
      var bd = boards[ctx.choose(boards.length)];
      var left = START;
      var throws = [];
      var used = new Set();
      var over = false;
      var who = Footy.teamName(bd.a);

      var root = UI.el('div', 'd5', ctx.root);
      Games.questionCard(root, 'Today\u2019s board', Footy.boardText(bd),
        bd.t === 'caps' ? 'Former internationals only.' : 'Former players only, whole spells at the club.');

      var top = UI.el('div', 'd5__top', root);
      var led = UI.el('div', 'led', top);
      UI.el('span', 'led__label', led, 'Remaining');
      var ledNum = UI.el('b', 'led__num', led, String(START));
      var dartsEl = UI.el('div', 'd5__darts', top);
      UI.el('span', null, dartsEl, 'Names');
      var dartsNum = UI.el('b', null, dartsEl, '0');
      UI.el('small', null, dartsEl, '/' + MAX_NAMES);

      var box = UI.searchBox({ parent: root, kind: 'player', placeholder: 'Name a player\u2026', onPick: aim });
      var chalk = UI.el('ol', 'chalk', root);
      var startRow = UI.el('li', 'chalk__row chalk__row--start', chalk);
      UI.el('span', 'chalk__name', startRow, 'Start');
      UI.el('span', 'chalk__val', startRow, '');
      UI.el('span', 'chalk__rem', startRow, String(START));
      var giveUp = UI.el('button', 'btn btn--quiet btn--small', root, 'Give up');
      giveUp.type = 'button';
      giveUp.addEventListener('click', function () { end(false); });
      ctx.setMeta('Need ' + left);
      setTimeout(box.focus, 350);

      function row(name, val, rem, kind) {
        var li = UI.el('li', 'chalk__row is-' + kind, chalk);
        UI.el('span', 'chalk__name', li, name);
        UI.el('span', 'chalk__val', li, val);
        UI.el('span', 'chalk__rem', li, rem);
        li.scrollIntoView({ block: 'nearest', behavior: UI.reduced ? 'auto' : 'smooth' });
        return li;
      }

      function aim(entry) {
        if (over) return;
        var p = entry.id;
        if (used.has(p)) { UI.toast('Already thrown'); return; }
        var v = Footy.boardValue(bd, p);
        if (v.kind === 'unknown') {
          UI.toast('No number for ' + entry.label + ' on this board \u2014 try another');
          return;
        }
        used.add(p);
        var t = { name: entry.label, kind: 'hit', value: 0 };
        if (v.kind === 'never' || v.kind === 'none') {
          t.kind = 'miss';
          row(entry.label, bd.t === 'caps' ? 'never capped' : 'not ' + who, String(left), 'miss');
          g.Sfx.play('bad');
          g.Sfx.haptic('warning');
        } else if (v.value > MAX_SCORE || v.value > left) {
          t.kind = 'bust';
          t.value = v.value;
          row(entry.label, String(v.value), 'BUST', 'bust');
          UI.pulse(led, 'is-shake');
          g.Sfx.play('bust');
          g.Sfx.haptic('error');
        } else {
          t.value = v.value;
          var from = left;
          left -= v.value;
          row(entry.label, '\u2212' + v.value, String(left), v.value === 0 ? 'miss' : 'hit');
          UI.countUp(ledNum, from, left, 500);
          g.Sfx.play('dart');
          g.Sfx.haptic('medium');
        }
        throws.push(t);
        dartsNum.textContent = String(throws.length);
        ctx.setMeta(left === 0 ? 'Checked out' : 'Need ' + left);
        if (left === 0) { end(true); return; }
        if (throws.length >= MAX_NAMES) end(false);
      }

      function end(checked) {
        if (over) return;
        over = true;
        box.setDisabled(true);
        giveUp.hidden = true;
        var n = throws.length;
        var marks = throws.map(function (t) { return t.kind === 'hit' ? '\uD83C\uDFAF' : t.kind === 'bust' ? '\uD83D\uDFE5' : '\u2B1C'; }).join('');
        if (checked) {
          UI.pulse(led, 'is-win');
          g.Sfx.play('crowd');
        }
        ctx.finish({
          score: checked ? n : null,
          display: checked ? UI.plural(n, 'name') : 'No checkout',
          headline: checked ? (n <= 3 ? 'GAME SHOT!' : n <= 5 ? 'Checked out!' : 'Got there') : 'Bust night',
          sub: Footy.boardText(bd) + (checked ? '' : ' \u00b7 ' + left + ' left'),
          perfect: checked && n <= 3,
          detail: function (parent) {
            var list = UI.el('ol', 'chalk chalk--summary', parent);
            var rem = START;
            throws.forEach(function (t) {
              var li = UI.el('li', 'chalk__row is-' + (t.kind === 'hit' && t.value === 0 ? 'miss' : t.kind), list);
              UI.el('span', 'chalk__name', li, t.name);
              if (t.kind === 'hit') rem -= t.value;
              UI.el('span', 'chalk__val', li, t.kind === 'miss' ? '\u2013' : t.kind === 'bust' ? String(t.value) : '\u2212' + t.value);
              UI.el('span', 'chalk__rem', li, t.kind === 'bust' ? 'BUST' : String(rem));
            });
          },
          share: Footy.boardText(bd) + '\n' + marks + ' ' + (checked ? 'checked out in ' + UI.plural(n, 'name') : left + ' left'),
          track: { board: bd.id, names: n, checked: checked }
        });
      }

      return {
        quit: function () { if (!over) end(false); },
        stop: function () { over = true; }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
