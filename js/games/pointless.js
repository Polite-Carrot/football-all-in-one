/* Pointless — find the answers nobody else would think of. Every answer
 * scores how well known it is (0–100); a wrong answer scores 100. Five
 * answers, lowest total wins, and a zero is a pointless answer. */
(function (g) {
  'use strict';

  var UI = g.UI, Games = g.Games, Footy = g.Footy;
  var ANSWERS = 5;
  var WRONG = 100;

  /* Fame rank (0 obscure .. 1 famous) to points. The bottom 15% of every
     question is pointless; the household name scores about 90. */
  function points(r) {
    if (r < 0.15) return 0;
    return Math.max(1, Math.round(90 * Math.pow((r - 0.15) / 0.85, 1.35)));
  }

  Games.register({
    id: 'pointless',
    name: 'Pointless',
    short: 'Pointless',
    color: '#a46bff',
    tagline: 'The obscure answer wins. Score low.',
    icon: '<svg viewBox="0 0 24 24"><rect x="7.5" y="2.5" width="9" height="19" rx="2"/><path d="M7.5 15.5h9M7.5 18.5h9" /><path d="M12 6.5v5M9.8 9.2l2.2 2.3 2.2-2.3"/></svg>',
    rules: [
      'One question with lots of right answers. Give five of them.',
      'Each right answer scores how well known it is, from 100 down to 0.',
      'A wrong answer scores the full 100.',
      'Lowest total wins. Find a 0 and it\u2019s a pointless answer!'
    ],
    better: 'low',
    points: points,

    start: function (ctx) {
      var pool = Footy.sets().filter(function (s) { return s.t !== 'club' && s.n >= 12 && s.n <= 160; });
      var set = pool[ctx.choose(pool.length)];
      var members = Footy.setMembers(set);
      var inSet = new Set(members);
      var ranks = Footy.fameRanks(members);
      var given = [];
      var over = false;
      var busy = false;

      var root = UI.el('div', 'pt', ctx.root);
      Games.questionCard(root, 'Give five answers', Footy.setText(set), UI.plural(members.length, 'right answer') + ' in our records.');
      var box = UI.searchBox({ parent: root, kind: 'player', placeholder: 'Name a player\u2026', onPick: answer });

      var stage = UI.el('div', 'pt__stage', root);
      var column = UI.el('div', 'column', stage);
      var fill = UI.el('div', 'column__fill', column);
      var colNum = UI.el('b', 'column__num', column, '100');
      var answersEl = UI.el('ol', 'pt__answers', stage);
      var rows = [];
      for (var i = 0; i < ANSWERS; i++) {
        var li = UI.el('li', 'pt__row', answersEl);
        UI.el('span', 'pt__name', li, 'Answer ' + (i + 1));
        UI.el('b', 'pt__pts', li, '');
        rows.push(li);
      }
      var totalEl = UI.el('div', 'pt__total', root);
      UI.el('span', null, totalEl, 'Total');
      var totalNum = UI.el('b', null, totalEl, '0');
      var pass = UI.el('button', 'btn btn--quiet btn--small', root, 'Pass (scores 100)');
      pass.type = 'button';
      pass.addEventListener('click', function () { if (!busy && !over) score(null); });
      ctx.setMeta('0/' + ANSWERS);
      setTimeout(box.focus, 350);

      function answer(entry) {
        if (over || busy) return;
        if (given.some(function (x) { return x.id === entry.id; })) { UI.toast('Already given'); return; }
        score(entry);
      }

      async function score(entry) {
        ctx.moved();
        busy = true;
        var ok = !!(entry && inSet.has(entry.id));
        var pts = ok ? points(ranks.get(entry.id)) : WRONG;
        var slot = rows[given.length];
        given.push({ id: entry ? entry.id : -1, label: entry ? entry.label : 'Pass', pts: pts, ok: ok });
        slot.firstChild.textContent = entry ? entry.label : 'Pass';
        slot.classList.add('is-live');
        ctx.setMeta(given.length + '/' + ANSWERS);
        await drain(pts, ok);
        slot.classList.remove('is-live');
        slot.classList.add(ok ? (pts === 0 ? 'is-zero' : 'is-ok') : 'is-wrong');
        slot.lastChild.textContent = ok ? String(pts) : '\u2717 100';
        var total = given.reduce(function (s, x) { return s + x.pts; }, 0);
        totalNum.textContent = String(total);
        busy = false;
        if (given.length >= ANSWERS) end();
      }

      /* The column falls from 100 to the score, like the studio's. */
      function drain(pts, ok) {
        column.classList.remove('is-zero', 'is-wrong');
        fill.style.transition = 'none';
        fill.style.transform = 'scaleY(1)';
        colNum.textContent = '100';
        void fill.offsetWidth;
        if (!ok) {
          column.classList.add('is-wrong');
          UI.pulse(column, 'is-shake');
          g.Sfx.play('bad');
          g.Sfx.haptic('error');
          return UI.after(650);
        }
        var ms = UI.reduced ? 0 : 400 + (100 - pts) * 14;
        fill.style.transition = 'transform ' + ms + 'ms cubic-bezier(.25,.8,.3,1)';
        fill.style.transform = 'scaleY(' + Math.max(pts, 0.5) / 100 + ')';
        var last = 100;
        return UI.countUp(colNum, 100, pts, ms, function (v) {
          var n = Math.round(v);
          if (n <= last - 5) { last = n; g.Sfx.play('drain'); }
          return String(n);
        }).then(function () {
          if (pts === 0) {
            column.classList.add('is-zero');
            g.Sfx.play('great');
            g.Sfx.haptic('success');
            UI.toast('POINTLESS!', 'good');
          } else {
            g.Sfx.play('good');
            g.Sfx.haptic('light');
          }
          return UI.after(250);
        });
      }

      function end() {
        if (over) return;
        over = true;
        box.setDisabled(true);
        pass.hidden = true;
        var total = given.reduce(function (s, x) { return s + x.pts; }, 0);
        var zeros = given.filter(function (x) { return x.ok && x.pts === 0; }).length;
        var marks = given.map(function (x) { return !x.ok ? '\u274C' : x.pts === 0 ? '\uD83D\uDFE3' : x.pts < 25 ? '\uD83D\uDFE9' : x.pts < 60 ? '\uD83D\uDFE8' : '\uD83D\uDFE7'; }).join('');
        var byFame = members.slice().sort(function (a, b) { return ranks.get(a) - ranks.get(b); });
        var pointless = byFame.filter(function (p) { return points(ranks.get(p)) === 0 && !given.some(function (x) { return x.id === p; }); });
        var rand = ctx.rand;
        var suggestions = g.Daily.shuffle(pointless, rand).slice(0, 4);
        var top = byFame.slice(-3).reverse();
        ctx.finish({
          score: total,
          display: total + ' pts',
          headline: total === 0 ? 'POINTLESS!' : zeros ? UI.plural(zeros, 'pointless answer') : total <= 60 ? 'Sharp' : total <= 150 ? 'Not bad' : 'Too obvious',
          sub: Footy.setText(set),
          perfect: total === 0,
          detail: function (parent) {
            var mine = UI.el('ol', 'pt__answers pt__answers--summary', parent);
            given.forEach(function (x) {
              var li = UI.el('li', 'pt__row ' + (!x.ok ? 'is-wrong' : x.pts === 0 ? 'is-zero' : 'is-ok'), mine);
              UI.el('span', 'pt__name', li, x.label);
              UI.el('b', 'pt__pts', li, x.ok ? String(x.pts) : '100');
            });
            if (suggestions.length) {
              UI.el('h4', 'sheet__h', parent, 'Pointless answers you could have given');
              UI.el('p', 'sheet__p', parent, suggestions.map(Footy.name).join(' \u00b7 '));
            }
            UI.el('h4', 'sheet__h', parent, 'Everyone\u2019s first thought');
            UI.el('p', 'sheet__p', parent, top.map(function (p) { return Footy.name(p) + ' (' + points(ranks.get(p)) + ')'; }).join(' \u00b7 '));
          },
          share: Footy.setText(set) + '\n' + marks + ' ' + total + ' pts',
          track: { set: set.id, total: total, zeros: zeros }
        });
      }

      return {
        quit: function () {
          if (over) return;
          while (given.length < ANSWERS) given.push({ id: -1, label: 'Pass', pts: WRONG, ok: false });
          end();
        },
        stop: function () { over = true; }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
