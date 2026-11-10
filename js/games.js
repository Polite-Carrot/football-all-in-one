/* games.js — the registry the seven games join, and the pieces two or more
 * of them share: the question card and the Top-10 board.
 *
 * A game is { id, name, color, tagline, icon, rules[], start(ctx) }. start()
 * builds the round inside ctx.root and returns { quit(), stop() }; it calls
 * ctx.finish(result) once when the round is over. The app owns everything
 * around a round: lobby, results, progress, ads and reminders. */
(function (g) {
  'use strict';

  var UI = g.UI;
  var list = [];
  var byId = {};

  function register(def) {
    list.push(def);
    byId[def.id] = def;
  }

  function questionCard(parent, kicker, text, note) {
    var card = UI.el('div', 'qcard', parent);
    UI.el('span', 'qcard__kicker', card, kicker);
    UI.el('h2', 'qcard__text', card, text);
    if (note) UI.el('p', 'qcard__note', card, note);
    return card;
  }

  /* The ten-slot board used by Football Tenable and Tension. */
  function board(parent, def, opts) {
    opts = opts || {};
    var root = UI.el('ol', 'board' + (def.unranked ? ' board--unranked' : ''), parent);
    var slots = def.a.map(function (pair, i) {
      var li = UI.el('li', 'slot', root);
      li.style.setProperty('--i', i);
      UI.el('span', 'slot__n', li, def.unranked ? '' : String(i + 1));
      var face = UI.el('span', 'slot__face', li);
      var label = UI.el('span', 'slot__label', face, pair[0]);
      var nameEl = UI.el('span', 'slot__name', face, '');
      if (!pair[0]) label.hidden = true;
      if (opts.killers && opts.killers.indexOf(i) >= 0) li.classList.add('slot--killer');
      return { li: li, name: nameEl, label: label };
    });
    /* Unranked boards fill from the top in the order answers arrive; the
       misses shown at the end simply take the slots that are left. */
    var filled = 0;
    return {
      root: root,
      /* how: 'hit' | 'miss' | 'killer' | 'killed' */
      reveal: function (i, how, text) {
        var s = def.unranked ? slots[filled++] : slots[i];
        if (!s) return;
        var answer = def.a[i][1];
        s.name.textContent = text || (def.type === 'club' ? g.Footy.prettyClub(answer) : answer);
        s.li.classList.remove('is-hint');
        s.li.classList.add('is-open', 'is-' + how);
      },
      hint: function (i, text) {
        var s = slots[i];
        if (!s || def.unranked) return;
        s.name.textContent = text;
        s.li.classList.add('is-hint');
      }
    };
  }

  /* Which board answer (if any) a picked search entry is. */
  function matchAnswer(def, entry) {
    for (var i = 0; i < def.a.length; i++) {
      if (g.Footy.same(def.type, entry, def.a[i][1])) return i;
    }
    return -1;
  }

  var KIND_WORD = { player: 'player', club: 'club', nation: 'country', manager: 'manager' };

  g.Games = {
    list: list,
    byId: byId,
    register: register,
    questionCard: questionCard,
    board: board,
    matchAnswer: matchAnswer,
    kindWord: function (k) { return KIND_WORD[k] || 'answer'; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
