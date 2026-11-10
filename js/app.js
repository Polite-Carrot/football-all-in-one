/* app.js — screens, rounds, results and progress, plus the game services:
 * consent, analytics, Unity ads, daily reminders and Remove Ads.
 *
 * The seven games know nothing about any of that. Each is started with a
 * context (where to draw, which daily, a seeded random source) and calls
 * finish(result) once; everything around a round lives here. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var UI = window.UI, Games = window.Games, Daily = window.Daily, Sfx = window.Sfx;

  var PREFS_KEY = 'footballaio.prefs.v1';
  var PROGRESS_KEY = 'footballaio.progress.v1';
  var PRIVACY_POLICY_URL = 'https://politecarrot.com/privacy';
  var APP_NAME = 'Football All-in-One';

  /* Analytics is undecided only until the first-run question is answered.
     Personalised ads is always a local intent, defaulting to off. */
  var prefs = { sound: true, haptics: true, analytics: null, personalizedAds: false };
  var progress = freshProgress();
  var state = { screen: 'home', gameId: null, mode: null, round: null, result: null, playing: false, finished: false, lobby: 'game', vs: null };

  function freshProgress() {
    return { v: 1, daily: {}, stats: {}, rounds: 0, recent: {} };
  }

  /* ───────── prefs and progress ───────── */

  function loadPrefs() {
    try {
      var raw = window.Store.read(PREFS_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (typeof p.sound === 'boolean') prefs.sound = p.sound;
        if (typeof p.haptics === 'boolean') prefs.haptics = p.haptics;
        if (typeof p.analytics === 'boolean') prefs.analytics = p.analytics;
        if (typeof p.personalizedAds === 'boolean') prefs.personalizedAds = p.personalizedAds;
      }
    } catch (e) { /* corrupt — stick with defaults */ }
  }

  function savePrefs() {
    window.Store.write(PREFS_KEY, JSON.stringify(prefs));
  }

  function applyPrefs() {
    Sfx.setSound(prefs.sound);
    Sfx.setHaptics(prefs.haptics);
  }

  function loadProgress() {
    try {
      var raw = window.Store.read(PROGRESS_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && p.v === 1) progress = Object.assign(freshProgress(), p);
      }
    } catch (e) { /* corrupt — start again */ }
  }

  function saveProgress() {
    window.Store.write(PROGRESS_KEY, JSON.stringify(progress));
  }

  function today() { return new Date(); }
  function todayKey() { return Daily.key(today()); }

  /* Days with at least one daily played: the streak and the reminders read this. */
  function doneDays() {
    var out = {};
    Object.keys(progress.daily).forEach(function (k) {
      if (Object.keys(progress.daily[k]).length) out[k] = true;
    });
    return out;
  }

  function dailyEntry(gameId, key) {
    var day = progress.daily[key || todayKey()];
    return day ? day[gameId] : null;
  }

  function statsFor(gameId) {
    return progress.stats[gameId] || (progress.stats[gameId] = { played: 0, best: null, bestText: '', perfect: 0 });
  }

  /* ───────── screens ───────── */

  function showScreen(name, back) {
    ['home', 'lobby', 'game'].forEach(function (s) {
      var el = $('screen-' + s);
      el.classList.toggle('is-active', s === name);
      el.classList.toggle('is-back', s === name && !!back);
    });
    state.screen = name;
    document.body.classList.toggle('playing', name === 'game');
  }

  /* Android's back button walks the WebView history, so each screen deeper
     than home is one history entry; popstate does the actual navigating. */
  var ignorePop = false;
  function go(name) {
    history.pushState({ s: name }, '');
    showScreen(name);
  }

  /* Straight back to the games list from anywhere, unwinding the history
     entries the deeper screens added. */
  function goHome() {
    closeVersus();
    leaveRound();
    var depth = state.screen === 'game' ? 2 : state.screen === 'lobby' ? 1 : 0;
    if (depth) { ignorePop = true; history.go(-depth); }
    showScreen('home', true);
    renderHome();
  }

  function onPopState() {
    if (ignorePop) { ignorePop = false; return; }
    /* Back on the first hand-off, which sits over the versus setup. */
    if (state.vs && state.screen === 'lobby') {
      history.pushState({ s: 'lobby' }, '');
      endMatch();
      return;
    }
    if (state.screen === 'game') {
      if ((state.playing && !state.finished) || state.vs) {
        history.pushState({ s: 'game' }, '');
        askQuit();
        return;
      }
      leaveRound();
      showScreen('lobby', true);
      renderLobby();
      return;
    }
    if (state.screen === 'lobby') {
      showScreen('home', true);
      renderHome();
    }
  }

  /* ───────── home ───────── */

  function renderHome() {
    var now = today();
    $('home-date').textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    var key = todayKey();
    var list = $('game-list');
    UI.clear(list);
    var done = 0;
    Games.list.forEach(function (game, n) {
      var entry = dailyEntry(game.id, key);
      if (entry) done++;
      var li = UI.el('li', null, list);
      var b = UI.el('button', 'game', li);
      b.type = 'button';
      b.style.setProperty('--g', game.color);
      b.style.setProperty('--n', n);
      UI.svg(game.icon, 'game__icon', b);
      var body = UI.el('span', 'game__body', b);
      UI.el('span', 'game__name', body, game.name);
      UI.el('span', 'game__tag', body, game.tagline);
      UI.el('span', 'game__status ' + (entry ? 'is-done' : 'is-new'), b, entry ? entry.d : 'Play');
      b.addEventListener('click', function () { Sfx.unlock(); Sfx.play('tap'); openLobby(game.id); });
    });
    var total = Games.list.length;
    $('today-done').textContent = String(done);
    $('today-total').textContent = '/' + total;
    var fg = document.querySelector('.today__ring .fg');
    var len = 2 * Math.PI * 25;
    fg.style.strokeDasharray = len.toFixed(1);
    fg.style.strokeDashoffset = (len * (1 - done / total)).toFixed(1);
    $('today-title').textContent = done === total ? 'Full house!' : done ? 'Keep going' : 'Today\u2019s challenges';
    $('today-sub').textContent = done === total ? 'All seven dailies done. New ones at midnight.'
      : (total - done) + ' daily ' + (total - done === 1 ? 'challenge' : 'challenges') + ' left today. Same for everyone.';
    var streak = Daily.streak(doneDays(), now);
    $('today-streak-num').textContent = String(streak);
    renderPurchaseRows();
  }

  /* ───────── lobby ───────── */

  function openLobby(id) {
    state.gameId = id;
    state.lobby = 'game';
    renderLobby();
    go('lobby');
  }

  function renderLobby() {
    if (state.lobby === 'versus') { renderVersusSetup(); return; }
    var game = Games.byId[state.gameId];
    if (!game) return;
    var screen = $('screen-lobby');
    screen.style.setProperty('--g', game.color);
    $('lobby-title').textContent = game.name;
    var root = $('lobby');
    UI.clear(root);

    var hero = UI.el('div', 'lobby__hero', root);
    UI.svg(game.icon, 'lobby__icon', hero);
    UI.el('h2', 'lobby__name', hero, game.name);
    UI.el('p', 'lobby__tag', hero, game.tagline);

    var now = today();
    var entry = dailyEntry(game.id);
    var daily = UI.el('div', 'card daily', root);
    var text = UI.el('div', 'daily__text', daily);
    UI.el('span', 'kicker', text, 'Daily #' + Daily.number(now) + ' \u00b7 ' + now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }));
    UI.el('b', null, text, entry ? 'Today\u2019s done' : 'Today\u2019s challenge');
    UI.el('span', null, text, entry ? 'Back tomorrow for a new one.' : 'Same for everyone, one go. It counts once you answer.');
    if (entry) {
      UI.el('span', 'daily__score', daily, entry.d);
    } else {
      var play = UI.el('button', 'btn btn--primary', daily, 'Play');
      play.type = 'button';
      play.addEventListener('click', function () { startRound(game.id, 'daily'); });
    }

    var practice = UI.el('button', 'btn btn--ghost btn--wide', root, 'Practice round');
    practice.type = 'button';
    practice.addEventListener('click', function () { startRound(game.id, 'practice'); });

    var rules = UI.el('div', 'card rules', root);
    UI.el('h3', null, rules, 'How to play');
    var ol = UI.el('ol', null, rules);
    game.rules.forEach(function (r) { UI.el('li', null, ol, r); });

    var st = statsFor(game.id);
    var stats = UI.el('div', 'stats', root);
    [['Played', String(st.played)], ['Best', st.bestText || '\u2013'], ['Perfect', String(st.perfect)]].forEach(function (s) {
      var c = UI.el('div', 'stat', stats);
      UI.el('b', null, c, s[1]);
      UI.el('span', null, c, s[0]);
    });
    $('lobby-scroll').scrollTop = 0;
  }

  /* ───────── a round ───────── */

  function startRound(id, mode) {
    var game = Games.byId[id];
    if (!game) return;
    if (mode === 'daily' && dailyEntry(id)) mode = 'practice';
    Sfx.unlock();
    leaveRound();
    applyPendingData();
    var now = today();
    var key = Daily.key(now);
    var vs = mode === 'versus' ? state.vs : null;
    state.gameId = id;
    state.mode = mode;
    state.playing = true;
    state.finished = false;
    state.moved = false;
    state.result = null;

    var screen = $('screen-game');
    screen.style.setProperty('--g', game.color);
    screen.style.setProperty('--p', vs ? VS_COLORS[vsPlayer()] : 'transparent');
    document.body.classList.toggle('versus', !!vs);
    $('game-title').textContent = game.name;
    $('game-mode').textContent = vs
      ? vs.names[vsPlayer()] + (vs.games.length > 1 ? ' \u00b7 Round ' + (vs.round + 1) + '/' + vs.games.length : '')
      : mode === 'daily' ? 'Daily #' + Daily.number(now) : 'Practice';
    $('game-meta').textContent = '';
    var root = $('game-root');
    UI.clear(root);
    $('game-scroll').scrollTop = 0;

    var ctx = {
      root: root,
      mode: mode,
      date: now,
      number: Daily.number(now),
      /* Versus: both players share a seed and replay the first player's picks, so they get the same questions. */
      rand: vs ? Daily.rng(vs.seed) : mode === 'daily' ? Daily.rng(id + ':' + key) : Math.random,
      choose: function (n) {
        if (mode === 'daily') return Daily.pick(n, id, now);
        if (!vs) return practiceChoice(id, n);
        /* Remote: no shared phone to remember picks on, so they come from the shared seed. */
        if (vs.remote) return Math.floor(vs.pick() * n);
        var i = vs.choiceAt++;
        if (vs.choices[i] === undefined) vs.choices[i] = practiceChoice(id, n);
        return vs.choices[i];
      },
      setMeta: function (text) { $('game-meta').textContent = text; },
      /* A daily counts from the first answer: leaving after that, or closing the app, keeps it as played.
         Leave before answering and it stays open. */
      moved: function () {
        if (state.moved || !state.playing) return;
        state.moved = true;
        if (mode !== 'daily') return;
        (progress.daily[key] = progress.daily[key] || {})[id] = { s: null, d: 'Unfinished' };
        saveProgress();
      },
      finish: function (result) {
        if (vs) finishVsTurn(game, result);
        else finishRound(game, mode, key, result);
      }
    };
    track('round_start', { game: id, mode: mode });
    state.round = game.start(ctx);
    if (state.screen !== 'game') go('game');
  }

  /* A practice pick that avoids the last few seen. */
  function practiceChoice(id, n) {
    var recent = progress.recent[id] || [];
    var keep = Math.min(recent.length, Math.max(0, n - 1), 12);
    var avoid = recent.slice(-keep);
    var options = [];
    for (var i = 0; i < n; i++) if (avoid.indexOf(i) < 0) options.push(i);
    var pick = options[Math.floor(Math.random() * options.length)];
    progress.recent[id] = recent.concat([pick]).slice(-12);
    return pick;
  }

  function finishRound(game, mode, key, result) {
    if (state.finished) return;
    state.finished = true;
    state.playing = false;
    state.result = { game: game, mode: mode, key: key, result: result };
    recordResult(game, mode, key, result);
    setTimeout(showResult, UI.reduced ? 0 : 700);
  }

  /* Counted where the result is recorded, not on the result card, so a
     player who closes the app on the card still has the round counted. */
  function recordResult(game, mode, key, result) {
    progress.rounds += 1;
    var st = statsFor(game.id);
    st.played += 1;
    if (result.perfect) st.perfect += 1;
    if (typeof result.score === 'number') {
      var better = st.best === null || (game.better === 'low' ? result.score < st.best : result.score > st.best);
      if (better) { st.best = result.score; st.bestText = result.display; }
    }
    if (mode === 'daily') {
      (progress.daily[key] = progress.daily[key] || {})[game.id] = { s: typeof result.score === 'number' ? result.score : null, d: result.display };
    }
    saveProgress();
    var params = { game: game.id, mode: mode, score: typeof result.score === 'number' ? result.score : -1, perfect: !!result.perfect };
    if (result.track) Object.keys(result.track).forEach(function (k) { params[k] = result.track[k]; });
    track('round_complete', params);
    if (window.Ads) window.Ads.noteLevelComplete();
    if (mode === 'daily' && window.Reminders) window.Reminders.sync(doneDays());
  }

  function leaveRound() {
    if (state.round && state.round.stop) state.round.stop();
    state.round = null;
    state.playing = false;
  }

  function askQuit() {
    if (state.vs) {
      $('quit-title').textContent = 'End the match?';
      $('quit-line').textContent = 'The match ends here for both of you and nothing is kept.';
      $('quit-go').textContent = 'End match';
      openModal('quit', 'quit-stay');
      return;
    }
    var daily = state.mode === 'daily';
    $('quit-title').textContent = 'Leave this round?';
    $('quit-line').textContent = daily && !state.moved
      ? 'You haven\u2019t answered yet, so today\u2019s challenge stays open for later.'
      : daily
        ? 'Today\u2019s challenge is one go. If you leave now, it ends here and counts as played.'
        : 'This practice round will be thrown away.';
    $('quit-go').textContent = daily && state.moved ? 'End it here' : 'Leave';
    openModal('quit', 'quit-stay');
  }

  function confirmQuit() {
    $('quit').hidden = true;
    if (state.vs) { endMatch(); return; }
    if (state.mode === 'daily' && state.moved && state.round && state.round.quit) {
      state.round.quit();
      return;
    }
    leaveRound();
    history.back();
  }

  /* ───────── result card ───────── */

  function showResult() {
    var r = state.result;
    if (!r) return;
    var game = r.game, res = r.result;
    var box = $('result');
    box.style.setProperty('--g', game.color);
    $('result-kicker').textContent = game.name + (r.mode === 'daily' ? ' \u00b7 Daily #' + Daily.number(today()) : ' \u00b7 Practice');
    $('result-headline').textContent = res.headline || 'Full time';
    $('result-score').textContent = res.display;
    $('result-sub').textContent = res.sub || '';
    var detail = $('result-detail');
    UI.clear(detail);
    if (res.detail) res.detail(detail);
    $('result-again').textContent = r.mode === 'daily' ? 'Practice' : 'Play again';
    box.hidden = false;
    var sheet = box.querySelector('.sheet');
    sheet.scrollTop = 0;
    if (res.perfect) { UI.celebrate(game.color); Sfx.play('win'); Sfx.haptic('success'); }
    else Sfx.play('whistle');
    try { $('result-next').focus({ preventScroll: true }); } catch (e) { /* older engines */ }
  }

  function closeResult() { $('result').hidden = true; }

  function shareResult() {
    var r = state.result;
    if (!r) return;
    var head = APP_NAME + ' \u00b7 ' + r.game.name + (r.mode === 'daily' ? ' #' + Daily.number(today()) : '');
    UI.share(head + '\n' + r.result.share).then(function (how) {
      track('share', { game: r.game.id, how: how });
    });
  }

  async function resultContinue() {
    closeResult();
    await (window.Ads ? window.Ads.maybeShowInterstitial() : Promise.resolve(false));
    leaveRound();
    history.back();
    maybeOfferReminder();
  }

  async function resultAgain() {
    var id = state.result && state.result.game.id;
    closeResult();
    await (window.Ads ? window.Ads.maybeShowInterstitial() : Promise.resolve(false));
    if (id) startRound(id, 'practice');
    maybeOfferReminder();
  }

  /* ───────── versus: pass & play ───────── */

  var VS_KEY = 'footballaio.versus.v1';
  var VS_COLORS = ['#3d8bff', '#ff4d5e'];
  var VS_ROUNDS = [1, 3, 5];
  var MIX = {
    id: 'mix', name: 'Mix it up', color: '#c8f03c',
    icon: '<svg viewBox="0 0 24 24"><path d="M3 7h3.5c4.5 0 6.5 10 11 10H21M3 17h3.5c1.8 0 3.1-1.6 4.2-3.6M21 7h-3.5c-1.8 0-3.1 1.6-4.2 3.6M18 4l3 3-3 3M18 14l3 3-3 3"/></svg>'
  };
  var vsSetup = loadVsSetup();

  /* 38-0 is a draft, not a quiz: there is nothing for a head-to-head to compare fairly. */
  function vsGames() { return Games.list.filter(function (g) { return g.id !== 'thirtyeight'; }); }

  function loadVsSetup() {
    var setup = { names: ['', ''], game: 'mix', rounds: 3, where: 'local', me: '' };
    try {
      var saved = JSON.parse(window.Store.read(VS_KEY) || 'null');
      if (saved && Array.isArray(saved.names)) setup.names = [cleanName(saved.names[0]), cleanName(saved.names[1])];
      if (saved && (saved.game === 'mix' || vsGames().some(function (g) { return g.id === saved.game; }))) setup.game = saved.game;
      if (saved && VS_ROUNDS.indexOf(saved.rounds) >= 0) setup.rounds = saved.rounds;
      if (saved && (saved.where === 'local' || saved.where === 'remote')) setup.where = saved.where;
      if (saved) setup.me = cleanName(saved.me);
    } catch (e) { /* first visit, or unreadable: defaults */ }
    return setup;
  }

  function cleanName(v) { return String(v || '').replace(/\s+/g, ' ').trim().slice(0, 14); }

  function openVersus() {
    state.lobby = 'versus';
    renderLobby();
    go('lobby');
    track('versus_open', {});
  }

  function renderVersusSetup() {
    $('screen-lobby').style.setProperty('--g', MIX.color);
    $('lobby-title').textContent = 'Versus';
    var root = $('lobby');
    UI.clear(root);

    var hero = UI.el('div', 'lobby__hero', root);
    var badge = UI.el('div', 'vs-hero__badge', hero);
    UI.el('i', null, badge);
    UI.el('b', null, badge, 'VS');
    UI.el('i', null, badge);
    UI.el('h2', 'lobby__name', hero, 'Versus');
    var remote = vsSetup.where === 'remote';
    UI.el('p', 'lobby__tag', hero, remote ? 'Send your mate a code. Same questions, wherever they are.' : 'One phone, two players, the same questions.');

    var whereSeg = UI.el('div', 'vs-seg vs-where', root);
    [['local', 'Same phone'], ['remote', 'Play by code']].forEach(function (w) {
      var b = UI.el('button', 'vs-seg__btn', whereSeg, w[1]);
      b.type = 'button';
      b.setAttribute('aria-pressed', vsSetup.where === w[0] ? 'true' : 'false');
      b.addEventListener('click', function () {
        if (vsSetup.where === w[0]) return;
        keepNames();
        vsSetup.where = w[0];
        window.Store.write(VS_KEY, JSON.stringify(vsSetup));
        Sfx.play('tap');
        renderVersusSetup();
      });
    });

    var players = UI.el('div', 'card vs-players', root);
    UI.el('span', 'kicker vs-label', players, remote ? 'Your name' : 'Players');
    function nameInput(p, value, label, placeholder) {
      var row = UI.el('label', 'vs-player', players);
      row.style.setProperty('--p', VS_COLORS[p]);
      UI.el('span', 'vs-player__kit', row, label);
      var input = UI.el('input', 'vs-player__input', row);
      input.type = 'text';
      input.maxLength = 14;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('autocapitalize', 'words');
      input.setAttribute('enterkeyhint', 'done');
      input.placeholder = placeholder;
      input.value = value;
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      });
      return input;
    }
    var inputs = remote
      ? [nameInput(0, vsSetup.me, 'You', 'Your name')]
      : [0, 1].map(function (p) { return nameInput(p, vsSetup.names[p], p ? 'Away' : 'Home', 'Player ' + (p + 1)); });
    function keepNames() {
      if (remote) vsSetup.me = cleanName(inputs[0].value);
      else vsSetup.names = inputs.map(function (i) { return cleanName(i.value); });
    }

    var pick = UI.el('div', 'card', root);
    UI.el('span', 'kicker vs-label', pick, 'Game');
    var grid = UI.el('div', 'vs-games', pick);
    var chips = [MIX].concat(vsGames()).map(function (game) {
      var b = UI.el('button', 'vs-game', grid);
      b.type = 'button';
      b.style.setProperty('--g', game.color);
      UI.svg(game.icon, 'vs-game__icon', b);
      UI.el('span', 'vs-game__name', b, game.name);
      b.addEventListener('click', function () { vsSetup.game = game.id; Sfx.play('tap'); sync(); });
      return { el: b, id: game.id };
    });

    var rounds = UI.el('div', 'card', root);
    UI.el('span', 'kicker vs-label', rounds, 'Rounds');
    var seg = UI.el('div', 'vs-seg', rounds);
    var segs = VS_ROUNDS.map(function (n) {
      var b = UI.el('button', 'vs-seg__btn', seg, UI.plural(n, 'round'));
      b.type = 'button';
      b.addEventListener('click', function () { vsSetup.rounds = n; Sfx.play('tap'); sync(); });
      return { el: b, n: n };
    });
    var note = UI.el('p', 'vs-note', rounds, '');

    var kick = UI.el('button', 'btn btn--primary btn--wide', root, remote ? 'Create a match code' : 'Kick off');
    kick.type = 'button';
    kick.addEventListener('click', function () {
      keepNames();
      window.Store.write(VS_KEY, JSON.stringify(vsSetup));
      if (remote) createMatch();
      else startMatch();
    });

    if (remote) {
      var got = UI.el('div', 'card', root);
      var paste = pasteBox(got, 'Got a code?');
      UI.el('p', 'vs-note', got, 'Paste a match code from your mate to play it, or their result code to see who won.');
      paste.go.textContent = 'Play it';
      paste.go.addEventListener('click', function () { keepNames(); window.Store.write(VS_KEY, JSON.stringify(vsSetup)); }, true);
    }

    var rules = UI.el('div', 'card rules', root);
    UI.el('h3', null, rules, 'How it works');
    var ol = UI.el('ol', null, rules);
    (remote ? [
      'Pick a game and rounds, then send your mate the match code.',
      'You both play the same questions on your own phones, at the same time if you like.',
      'When you finish you each get a result code. Swap them.',
      'Paste your mate\u2019s result code to see who won. Most rounds wins.'
    ] : [
      'Each round you both play the same game, with the same questions.',
      'When it says pass the phone, pass it, and don\u2019t watch your mate play.',
      'Scores stay hidden until you\u2019ve both played. Better score wins the round.',
      'Most rounds wins the match. Who goes first swaps every round.'
    ]).forEach(function (r) { UI.el('li', null, ol, r); });

    function sync() {
      chips.forEach(function (c) { c.el.setAttribute('aria-pressed', c.id === vsSetup.game ? 'true' : 'false'); });
      segs.forEach(function (s) { s.el.setAttribute('aria-pressed', s.n === vsSetup.rounds ? 'true' : 'false'); });
      note.textContent = vsSetup.game === 'mix'
        ? (vsSetup.rounds > 1 ? 'A different game every round.' : 'A random game.')
        : 'Fresh questions every round.';
    }
    sync();
    $('lobby-scroll').scrollTop = 0;
  }

  function startMatch() {
    var names = vsSetup.names.map(function (n, i) { return n || 'Player ' + (i + 1); });
    if (names[0].toLowerCase() === names[1].toLowerCase()) names[1] += ' 2';
    var games = vsSetup.game === 'mix'
      ? Daily.shuffle(vsGames().map(function (g) { return g.id; }), Math.random).slice(0, vsSetup.rounds)
      : new Array(vsSetup.rounds).fill(vsSetup.game);
    state.vs = { names: names, games: games, round: 0, wins: [0, 0], log: [], over: false };
    newVsRound();
    Sfx.unlock();
    Sfx.play('whistle');
    track('versus_start', { game: vsSetup.game, rounds: vsSetup.rounds });
    showHandoff();
  }

  function newVsRound() {
    var vs = state.vs;
    vs.seed = vs.remote ? vs.base + ':' + vs.round : Math.random().toString(36).slice(2) + Date.now().toString(36);
    vs.choices = [];
    vs.choiceAt = 0;
    vs.results = [null, null];
    vs.turn = 0;
    /* Remote: each phone has one player, the creator blue and the friend red. */
    vs.first = vs.remote ? vs.me : vs.round % 2;
  }

  function vsPlayer() { return (state.vs.first + state.vs.turn) % 2; }

  function renderTally(el) {
    var vs = state.vs;
    UI.clear(el);
    el.hidden = vs.games.length < 2;
    [0, 1].forEach(function (p) {
      var side = UI.el('span', 'vs-tally__side', el);
      side.style.setProperty('--p', VS_COLORS[p]);
      UI.el('span', 'vs-tally__name', side, vs.names[p]);
      UI.el('b', 'vs-tally__score', side, String(vs.wins[p]));
      if (!p) UI.el('span', 'vs-tally__dash', el, '\u2013');
    });
  }

  function showHandoff() {
    var vs = state.vs;
    var p = vsPlayer(), other = 1 - p;
    var game = Games.byId[vs.games[vs.round]];
    var box = $('handoff');
    box.style.setProperty('--p', VS_COLORS[p]);
    box.style.setProperty('--g', game.color);
    $('handoff-kicker').textContent = (vs.games.length > 1 ? 'Round ' + (vs.round + 1) + ' of ' + vs.games.length + ' \u00b7 ' : '') + game.name;
    renderTally($('handoff-tally'));
    if (vs.remote) {
      $('handoff-tally').hidden = vs.remote !== 'chase' || vs.games.length < 2;
      $('handoff-pass').textContent = vs.round === 0 ? 'First up' : 'Next up';
      $('handoff-name').textContent = vs.names[p];
      $('handoff-note').textContent = vs.dataNote || (vs.remote === 'chase'
        ? vs.names[other] + ' has played these. Their score shows after each round.'
        : vs.names[other] + ' gets exactly the same questions on their phone.');
      $('handoff-go').textContent = 'Kick off';
      box.hidden = false;
      Sfx.haptic('medium');
      try { $('handoff-go').focus({ preventScroll: true }); } catch (e) { /* older engines */ }
      return;
    }
    $('handoff-pass').textContent = vs.turn === 0 && vs.round === 0 ? 'First up' : 'Pass the phone to';
    $('handoff-name').textContent = vs.names[p];
    $('handoff-note').textContent = vs.turn === 0
      ? 'Same questions for both of you, so ' + vs.names[other] + ', no looking.'
      : vs.names[other] + ' has played. Scores stay secret until you\u2019re done.';
    $('handoff-go').textContent = 'I\u2019m ' + vs.names[p] + ' \u2014 kick off';
    box.hidden = false;
    Sfx.haptic('medium');
    try { $('handoff-go').focus({ preventScroll: true }); } catch (e) { /* older engines */ }
  }

  function startVsTurn() {
    var vs = state.vs;
    if (!vs) return;
    $('handoff').hidden = true;
    vs.choiceAt = 0;
    if (vs.remote) vs.pick = Daily.rng(vs.seed + ':pick');
    Sfx.play('whistle');
    startRound(vs.games[vs.round], 'versus');
  }

  function finishVsTurn(game, result) {
    var vs = state.vs;
    if (state.finished || !vs) return;
    state.finished = true;
    state.playing = false;
    vs.results[vsPlayer()] = result;
    track('round_complete', { game: game.id, mode: 'versus', score: typeof result.score === 'number' ? result.score : -1, perfect: !!result.perfect });
    if (vs.remote) { finishRemoteTurn(vs, game, result); return; }
    setTimeout(function () {
      if (state.vs !== vs) return;
      leaveRound();
      if (vs.turn === 0) {
        vs.turn = 1;
        UI.clear($('game-root'));
        $('game-meta').textContent = '';
        showHandoff();
      } else {
        settleVsRound(game);
        showVsResult();
      }
    }, UI.reduced ? 300 : 1100);
  }

  /* Higher is better. A game can supply `vs` when its score alone does not rank (501). */
  function vsValue(game, r) {
    if (typeof r.vs === 'number') return r.vs;
    if (typeof r.score !== 'number') return -Infinity;
    return game.better === 'low' ? -r.score : r.score;
  }

  function vsShown(r) { return r.vsDisplay || r.display; }

  function settleVsRound(game) {
    var vs = state.vs;
    var a = vsValue(game, vs.results[0]), b = vsValue(game, vs.results[1]);
    var winner = a > b ? 0 : b > a ? 1 : -1;
    if (winner >= 0) vs.wins[winner] += 1;
    vs.log.push({ game: game, results: vs.results.slice(), winner: winner });
    vs.left = vs.games.length - (vs.round + 1);
    vs.over = vs.left === 0 || Math.abs(vs.wins[0] - vs.wins[1]) > vs.left;
    if (window.Ads) window.Ads.noteLevelComplete();
    track('versus_round', { game: game.id, result: winner < 0 ? 'draw' : 'win' });
    if (vs.over) track('versus_complete', { rounds: vs.log.length, result: vs.wins[0] === vs.wins[1] ? 'draw' : 'win' });
  }

  function showVsResult() {
    var vs = state.vs;
    var last = vs.log[vs.log.length - 1];
    var game = last.game;
    var multi = vs.games.length > 1;
    var champ = vs.wins[0] > vs.wins[1] ? 0 : vs.wins[1] > vs.wins[0] ? 1 : -1;
    var box = $('vs-result');
    box.style.setProperty('--g', game.color);
    $('vs-kicker').textContent = (multi ? 'Round ' + (vs.round + 1) + ' of ' + vs.games.length + ' \u00b7 ' : '') + game.name;
    $('vs-headline').textContent = vs.over && multi
      ? (champ < 0 ? 'Honours even' : vs.names[champ] + ' wins the match!')
      : last.winner < 0 ? 'Dead heat' : vs.names[last.winner] + (vs.over ? ' wins!' : ' takes it');

    var board = $('vs-board');
    UI.clear(board);
    [0, 1].forEach(function (p) {
      var r = last.results[p];
      var side = UI.el('div', 'vs-side' + (last.winner === p ? ' is-win' : last.winner >= 0 ? ' is-lose' : ''), board);
      side.style.setProperty('--p', VS_COLORS[p]);
      UI.el('span', 'vs-side__name', side, vs.names[p]);
      UI.el('b', 'vs-side__score', side, vsShown(r));
      UI.el('span', 'vs-side__head', side, r.headline || '');
      if (!p) UI.el('span', 'vs-board__v', board, 'v');
    });

    var sub = '';
    if (multi) {
      sub = (vs.over ? 'Final score: ' : 'Match: ') + vs.names[0] + ' ' + vs.wins[0] + '\u2013' + vs.wins[1] + ' ' + vs.names[1];
      if (vs.over && vs.left > 0) sub += ', with ' + UI.plural(vs.left, 'round') + ' to spare';
    }
    $('vs-sub').textContent = sub;

    var detail = $('vs-detail');
    UI.clear(detail);
    if (vs.over && multi) {
      var log = UI.el('ol', 'vs-log', detail);
      vs.log.forEach(function (e) {
        var li = UI.el('li', null, log);
        li.style.setProperty('--g', e.game.color);
        UI.el('span', 'vs-log__game', li, e.game.name);
        [0, 1].forEach(function (p) {
          var s = UI.el('span', 'vs-log__score' + (e.winner === p ? ' is-win' : ''), li, vsShown(e.results[p]));
          s.style.setProperty('--p', VS_COLORS[p]);
        });
      });
    }
    /* Settle the arguments: either player's round, answers and all. */
    var peek = UI.el('div', 'vs-peek', detail);
    var area = UI.el('div', 'vs-peek__area', detail);
    [0, 1].forEach(function (p) {
      var r = last.results[p];
      if (!r.detail) return;
      var b = UI.el('button', 'btn btn--ghost btn--small', peek, vs.names[p] + '\u2019s round');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true';
        Array.prototype.forEach.call(peek.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
        UI.clear(area);
        if (on) { b.setAttribute('aria-pressed', 'true'); r.detail(area); }
      });
    });

    $('vs-next').textContent = vs.over ? 'Done' : 'Next round';
    $('vs-share').hidden = false;
    $('vs-alt').textContent = vs.over ? (vs.remote === 'chase' ? 'Send result' : 'Rematch') : 'End match';
    if (vs.remote === 'chase' && vs.over) codeBox(detail, vs.resultCode, 'Send this to ' + vs.names[1 - vs.me] + ' so they see who won too.');
    box.hidden = false;
    box.querySelector('.sheet').scrollTop = 0;
    var winner = vs.over ? (multi ? champ : last.winner) : -1;
    if (winner >= 0) { UI.celebrate(VS_COLORS[winner]); Sfx.play('win'); Sfx.haptic('success'); }
    else Sfx.play(vs.over ? 'whistle' : 'crowd');
    try { $('vs-next').focus({ preventScroll: true }); } catch (e) { /* older engines */ }
  }

  async function vsNext() {
    var vs = state.vs;
    if (!vs) return;
    $('vs-result').hidden = true;
    if (vs.stage === 'invite') { vs.stage = null; showHandoff(); return; }
    if (vs.stage === 'done') { endMatch(); return; }
    await (window.Ads ? window.Ads.maybeShowInterstitial() : Promise.resolve(false));
    if (state.vs !== vs) return;
    if (vs.over) { endMatch(); return; }
    vs.round += 1;
    newVsRound();
    showHandoff();
  }

  async function vsAlt() {
    var vs = state.vs;
    if (!vs) return;
    if (vs.stage === 'invite') { shareCode(matchText(vs)); return; }
    if (vs.stage === 'done' || (vs.remote === 'chase' && vs.over)) { shareCode(resultText(vs)); return; }
    if (!vs.over) { endMatch(); return; }
    $('vs-result').hidden = true;
    await (window.Ads ? window.Ads.maybeShowInterstitial() : Promise.resolve(false));
    if (state.vs !== vs) return;
    if (vs.remote) { closeVersus(); createMatch(); }
    else startMatch();
  }

  function vsShare() {
    var vs = state.vs;
    if (!vs) return;
    var lines = [APP_NAME + ' \u00b7 Versus'];
    if (vs.games.length > 1) lines.push(vs.names[0] + ' ' + vs.wins[0] + '\u2013' + vs.wins[1] + ' ' + vs.names[1]);
    vs.log.forEach(function (e) {
      lines.push(e.game.name + ': ' + vs.names[0] + ' ' + vsShown(e.results[0]) + ' v ' + vsShown(e.results[1]) + ' ' + vs.names[1]);
    });
    UI.share(lines.join('\n')).then(function (how) { track('share', { game: 'versus', how: how }); });
  }

  /* Drop the match and its overlays without navigating. */
  function closeVersus() {
    state.vs = null;
    $('handoff').hidden = true;
    $('vs-result').hidden = true;
    document.body.classList.remove('versus');
  }

  /* Back to the versus setup. */
  function endMatch() {
    var inGame = state.screen === 'game';
    closeVersus();
    leaveRound();
    if (inGame) history.back();
    else renderLobby();
  }

  /* ───────── versus: play by code ─────────
     No server. A match code carries the games, the shared seed and the
     creator's name, so both phones build the same questions and can play at
     the same time. Each player ends with a result code; pasting the other's
     shows who won. Codes are untrusted input: every field is checked before
     use and only ever shown as text. */

  var REMOTE_KEY = 'footballaio.remote.v2';
  var CODE_PREFIX = 'FAIO2.';

  /* created: match codes this phone made. played: this phone's own results, by seed. */
  function remoteStore() {
    try {
      var s = JSON.parse(window.Store.read(REMOTE_KEY) || 'null');
      if (s && Array.isArray(s.created) && s.played && typeof s.played === 'object') return s;
    } catch (e) { /* unreadable: start again */ }
    return { created: [], played: {} };
  }

  function saveRemote(s) {
    s.created = s.created.slice(-40);
    var keys = Object.keys(s.played);
    keys.slice(0, Math.max(0, keys.length - 40)).forEach(function (k) { delete s.played[k]; });
    window.Store.write(REMOTE_KEY, JSON.stringify(s));
  }

  function encodeCode(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj));
    var bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return CODE_PREFIX + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeCode(text) {
    var m = /FAIO2\.([A-Za-z0-9_-]{8,6000})/.exec(String(text || '').replace(/\s+/g, ''));
    if (!m) return null;
    try {
      var bin = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'));
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return checkCode(JSON.parse(new TextDecoder().decode(bytes)));
    } catch (e) { return null; }
  }

  function cleanShown(v) { return String(v === undefined || v === null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, 24); }

  function checkResults(list, max) {
    if (!Array.isArray(list) || !list.length || list.length > max) return null;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!Array.isArray(r)) return null;
      var v = r[0] === null ? null : Number(r[0]);
      if (v !== null && !isFinite(v)) return null;
      out.push([v, cleanShown(r[1]) || '\u2013', cleanShown(r[2])]);
    }
    return out;
  }

  /* t 'm': a match to play. t 's': one player's scores, p = 0 for the creator, 1 for the friend. */
  function checkCode(o) {
    if (!o || o.v !== 2 || (o.t !== 'm' && o.t !== 's')) return null;
    var ids = vsGames().map(function (g) { return g.id; });
    if (!Array.isArray(o.g) || !o.g.length || o.g.length > 5 || !o.g.every(function (id) { return ids.indexOf(id) >= 0; })) return null;
    if (typeof o.s !== 'string' || !/^[a-z0-9]{6,40}$/i.test(o.s)) return null;
    var code = { t: o.t, g: o.g.slice(), s: o.s, b: typeof o.b === 'string' ? o.b.slice(0, 30) : '', n: cleanName(o.n) || 'Your mate' };
    if (o.t === 'm') return code;
    if (o.p !== 0 && o.p !== 1) return null;
    code.p = o.p;
    code.r = checkResults(o.r, o.g.length);
    return code.r ? code : null;
  }

  function packResult(game, r) {
    var v = vsValue(game, r);
    return [isFinite(v) ? v : null, cleanShown(vsShown(r)), cleanShown(r.headline)];
  }

  /* A result from the other phone: enough to rank and show, no answers. */
  function unpackResult(p) {
    return { vs: p[0] === null ? undefined : p[0], display: p[1], vsDisplay: p[1], headline: p[2] };
  }

  function remoteGamesText(games) {
    var unique = games.filter(function (id, i) { return games.indexOf(id) === i; });
    var names = unique.map(function (id) { return Games.byId[id].name; });
    return UI.plural(games.length, 'round') + ' \u00b7 ' + (unique.length > 2 ? 'Mix it up' : names.join(', '));
  }

  function matchText(vs) {
    return vs.names[vs.me] + ' wants a game of ' + APP_NAME + '! ' + remoteGamesText(vs.games) + '.\n' +
      'Open Versus \u2192 Play by code and paste this message. We can play at the same time:\n' + vs.code;
  }

  function resultText(vs) {
    return vs.names[vs.me] + '\u2019s ' + APP_NAME + ' result is in.\n' +
      'Open Versus \u2192 Play by code and paste this message to see who won:\n' + vs.resultCode;
  }

  function shareCode(text) {
    UI.share(text).then(function (how) { track('share', { game: 'versus_code', how: how }); });
  }

  function codeBox(parent, code, note) {
    var box = UI.el('div', 'vs-code', parent);
    UI.el('p', 'vs-code__note', box, note);
    var text = UI.el('code', 'vs-code__text', box, code);
    text.tabIndex = 0;
    var copy = UI.el('button', 'btn btn--ghost btn--small', box, 'Copy code');
    copy.type = 'button';
    copy.addEventListener('click', function () {
      Promise.resolve(navigator.clipboard && navigator.clipboard.writeText(code))
        .then(function () { UI.toast('Code copied'); })
        .catch(function () { UI.toast('Select the code and copy it'); });
    });
  }

  function pasteBox(parent, label) {
    var box = UI.el('div', 'vs-code-in', parent);
    UI.el('span', 'kicker vs-label', box, label);
    var field = UI.el('textarea', 'vs-code-in__field', box);
    field.rows = 3;
    field.spellcheck = false;
    field.autocomplete = 'off';
    field.setAttribute('autocapitalize', 'off');
    field.placeholder = 'Paste the code or the whole message here';
    field.setAttribute('aria-label', label);
    var go = UI.el('button', 'btn btn--gold btn--wide', box, 'Go');
    go.type = 'button';
    go.addEventListener('click', function () { openCode(field.value); });
    return { field: field, go: go };
  }

  function remoteVs(role, me, games, base, names, built) {
    return { remote: role, me: me, names: names, games: games, base: base, built: built || '',
      round: 0, wins: [0, 0], log: [], mine: [], theirs: null, over: false };
  }

  function otherName(mine, theirs) { return mine.toLowerCase() === theirs.toLowerCase() ? mine + ' 2' : mine; }

  function noteData(vs, built, who) {
    if (built && window.Footy.built && built !== window.Footy.built) {
      vs.dataNote = 'Heads up: your football data is a different version from ' + who + '\u2019s, so a question or two may differ.';
    }
  }

  function beginRemote(vs, how) {
    state.vs = vs;
    newVsRound();
    Sfx.unlock();
    Sfx.play('whistle');
    track('versus_start', { game: vs.games.length > 1 ? 'mix' : vs.games[0], rounds: vs.games.length, remote: how });
  }

  function createMatch() {
    var me = vsSetup.me || 'Player 1';
    var games = vsSetup.game === 'mix'
      ? Daily.shuffle(vsGames().map(function (g) { return g.id; }), Math.random).slice(0, vsSetup.rounds)
      : new Array(vsSetup.rounds).fill(vsSetup.game);
    var base = (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, 16);
    var vs = remoteVs('live', 0, games, base, [me, 'Your mate'], window.Footy.built || '');
    vs.code = encodeCode({ v: 2, t: 'm', g: games, s: base, b: vs.built, n: me });
    var store = remoteStore();
    store.created.push(base);
    saveRemote(store);
    beginRemote(vs, 'create');
    showMatchCode(vs);
  }

  function showMatchCode(vs) {
    vs.stage = 'invite';
    var box = $('vs-result');
    box.style.setProperty('--g', MIX.color);
    $('vs-kicker').textContent = 'Match code \u00b7 ' + remoteGamesText(vs.games);
    $('vs-headline').textContent = 'Send this to your mate';
    UI.clear($('vs-board'));
    $('vs-sub').textContent = 'Then you both play, at the same time if you like. Same questions on both phones.';
    var detail = $('vs-detail');
    UI.clear(detail);
    codeBox(detail, vs.code, 'They paste it in Versus \u2192 Play by code.');
    $('vs-next').textContent = 'Kick off';
    $('vs-alt').textContent = 'Send code';
    $('vs-share').hidden = true;
    box.hidden = false;
    box.querySelector('.sheet').scrollTop = 0;
    try { $('vs-alt').focus({ preventScroll: true }); } catch (e) { /* older engines */ }
  }

  function openCode(text) {
    var code = decodeCode(text);
    if (!code) { UI.toast('That code doesn\u2019t look right \u2014 paste the whole thing'); return; }
    var store = remoteStore();
    var mine = store.played[code.s];
    var me = vsSetup.me;
    if (code.t === 'm') {
      if (mine) { UI.toast('You\u2019ve already played this one'); showOwnScores(fromStored(mine, code.s)); return; }
      closeVersus();
      applyPendingData();
      var vs;
      if (store.created.indexOf(code.s) >= 0) {
        vs = remoteVs('live', 0, code.g, code.s, [code.n, 'Your mate'], code.b);
      } else {
        vs = remoteVs('live', 1, code.g, code.s, [code.n, otherName(me || 'Player 2', code.n)], code.b);
        noteData(vs, code.b, code.n);
      }
      vs.code = encodeCode({ v: 2, t: 'm', g: code.g, s: code.s, b: code.b, n: code.n });
      beginRemote(vs, vs.me ? 'join' : 'rejoin');
      showHandoff();
      return;
    }
    if (mine && mine.p === code.p) { UI.toast('That\u2019s your own result \u2014 send it to your mate'); return; }
    if (mine) { showFinal(mine, code); return; }
    /* They finished first: play the same rounds, with their scores shown round by round. */
    closeVersus();
    applyPendingData();
    var at = 1 - code.p;
    var names = [];
    names[code.p] = code.n;
    names[at] = otherName(me || 'Player ' + (at + 1), code.n);
    var chase = remoteVs('chase', at, code.g.slice(0, code.r.length), code.s, names, code.b);
    chase.theirs = code.r;
    noteData(chase, code.b, code.n);
    beginRemote(chase, 'chase');
    showHandoff();
  }

  function finishRemoteTurn(vs, game, result) {
    vs.mine.push(packResult(game, result));
    if (vs.remote === 'live' && window.Ads) window.Ads.noteLevelComplete();
    setTimeout(async function () {
      if (state.vs !== vs) return;
      leaveRound();
      if (vs.remote === 'chase') {
        vs.results[1 - vs.me] = unpackResult(vs.theirs[vs.round]);
        settleVsRound(game);
        if (vs.over) saveOwnResult(vs);
        showVsResult();
        return;
      }
      if (vs.round + 1 < vs.games.length) {
        vs.round += 1;
        newVsRound();
        UI.clear($('game-root'));
        $('game-meta').textContent = '';
        await (window.Ads ? window.Ads.maybeShowInterstitial() : Promise.resolve(false));
        if (state.vs === vs) showHandoff();
        return;
      }
      saveOwnResult(vs);
      showOwnScores(vs);
    }, UI.reduced ? 300 : 1100);
  }

  function saveOwnResult(vs) {
    var store = remoteStore();
    store.played[vs.base] = { p: vs.me, n: vs.names[vs.me], opp: vs.names[1 - vs.me], g: vs.games, b: vs.built, r: vs.mine };
    saveRemote(store);
    vs.resultCode = encodeCode({ v: 2, t: 's', g: vs.games, s: vs.base, b: vs.built, n: vs.names[vs.me], p: vs.me, r: vs.mine });
    track('versus_code', { rounds: vs.mine.length });
  }

  function fromStored(mine, base) {
    var names = [];
    names[mine.p] = mine.n;
    names[1 - mine.p] = mine.opp || 'Your mate';
    var vs = remoteVs('live', mine.p, mine.g, base, names, mine.b);
    vs.mine = mine.r;
    vs.resultCode = encodeCode({ v: 2, t: 's', g: mine.g, s: base, b: mine.b, n: mine.n, p: mine.p, r: mine.r });
    state.vs = vs;
    return vs;
  }

  /* This player is done; the other may still be playing. */
  function showOwnScores(vs) {
    vs.stage = 'done';
    var opp = vs.names[1 - vs.me];
    var oppInline = opp === 'Your mate' ? 'your mate' : opp;
    var box = $('vs-result');
    box.style.setProperty('--g', MIX.color);
    $('vs-kicker').textContent = 'Your result \u00b7 ' + remoteGamesText(vs.games);
    $('vs-headline').textContent = 'Now swap result codes';
    UI.clear($('vs-board'));
    $('vs-sub').textContent = 'Send yours to ' + oppInline + ', and paste theirs below when it arrives.';
    var detail = $('vs-detail');
    UI.clear(detail);
    var log = UI.el('ol', 'vs-log', detail);
    vs.mine.forEach(function (p, i) {
      var game = Games.byId[vs.games[i]];
      var li = UI.el('li', null, log);
      li.style.setProperty('--g', game.color);
      UI.el('span', 'vs-log__game', li, game.name);
      var s = UI.el('span', 'vs-log__score is-win', li, p[1]);
      s.style.setProperty('--p', VS_COLORS[vs.me]);
    });
    codeBox(detail, vs.resultCode, 'Your result code. ' + opp + ' pastes it in Versus \u2192 Play by code.');
    pasteBox(detail, opp + '\u2019s result code');
    $('vs-next').textContent = 'Done';
    $('vs-alt').textContent = 'Send result';
    $('vs-share').hidden = true;
    box.hidden = false;
    box.querySelector('.sheet').scrollTop = 0;
    Sfx.play('whistle');
  }

  /* Both results in: the whole match, round by round. */
  function showFinal(mine, code) {
    var me = mine.p, them = code.p;
    var names = [];
    names[me] = mine.n;
    names[them] = otherName(code.n, mine.n);
    var n = Math.min(mine.r.length, code.r.length);
    var vs = remoteVs('final', me, mine.g, code.s, names, mine.b);
    for (var i = 0; i < n; i++) {
      var game = Games.byId[mine.g[i]];
      var results = [];
      results[me] = unpackResult(mine.r[i]);
      results[them] = unpackResult(code.r[i]);
      var a = vsValue(game, results[0]), b = vsValue(game, results[1]);
      var winner = a > b ? 0 : b > a ? 1 : -1;
      if (winner >= 0) vs.wins[winner] += 1;
      vs.log.push({ game: game, results: results, winner: winner });
    }
    vs.round = n - 1;
    vs.left = mine.g.length - n;
    vs.over = true;
    closeVersus();
    state.vs = vs;
    track('versus_final', { rounds: n });
    showVsResult();
  }

  /* ───────── fresh data ───────── */

  var pendingData = null;

  /* A build kept from last time goes in first; then the feed is asked for anything newer. */
  function startDataFeed() {
    var F = window.DataFeed;
    if (!F) return;
    F.restore().then(offerData).then(function () { return F.check(); }).then(offerData);
  }

  function offerData(d) {
    if (!d) return;
    pendingData = d;
    applyPendingData();
  }

  /* Only between rounds, and never mid-match in versus, so both players share one build. */
  function applyPendingData() {
    if (!pendingData || state.playing || (state.vs && (state.vs.remote || state.vs.turn > 0))) return;
    window.DataFeed.install(pendingData);
    pendingData = null;
    renderDataBuilt();
    track('data_update', { built: window.Footy.built.slice(0, 10) });
  }

  function renderDataBuilt() {
    var built = window.Footy.built;
    $('data-built').textContent = built ? 'Football data from Wikidata (CC0), ' + built.slice(0, 10) + '.' : '';
  }

  /* ───────── settings ───────── */

  function renderSettingsToggles() {
    setToggleBtn($('settings-sound'), prefs.sound);
    setToggleBtn($('settings-haptics'), prefs.haptics);
    setToggleBtn($('privacy-data-analytics'), prefs.analytics === true);
    setToggleBtn($('privacy-data-ads'), prefs.personalizedAds === true);
    $('privacy-data-ads-row').hidden = !(window.Ads && window.Ads.configured && window.Ads.configured());
    renderReminderRows();
    renderPurchaseRows();
  }

  function setToggleBtn(btn, on) {
    if (!btn) return;
    btn.textContent = on ? 'On' : 'Off';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  /* Show a dialog and put the keyboard in it, starting at its top. */
  function openModal(id, focusId) {
    var box = $(id);
    box.hidden = false;
    var panel = box.querySelector('.modal');
    if (panel) panel.scrollTop = 0;
    var target = $(focusId);
    if (!target) return;
    try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    if (panel) panel.scrollTop = 0;
  }

  function closeModal(id) { $(id).hidden = true; }

  /* Reset takes a held press: one tap cannot wipe every streak and best. */
  function bindReset() {
    var hold = $('reset-hold');
    var fill = hold.querySelector('.hold__fill');
    var timer = null;
    var start = 0;
    function begin(e) {
      e.preventDefault();
      start = Date.now();
      fill.style.transition = 'transform 1.4s linear';
      fill.style.transform = 'scaleX(1)';
      timer = setTimeout(function () {
        progress = freshProgress();
        saveProgress();
        if (window.Reminders) window.Reminders.sync(doneDays());
        closeModal('reset-modal');
        renderHome();
        UI.toast('Progress erased');
        track('reset_progress', {});
      }, 1400);
    }
    function cancel() {
      clearTimeout(timer);
      fill.style.transition = 'transform .25s ease';
      fill.style.transform = 'scaleX(0)';
      if (Date.now() - start < 1400) $('reset-hold-label').textContent = 'Keep holding';
    }
    hold.addEventListener('pointerdown', begin);
    hold.addEventListener('pointerup', cancel);
    hold.addEventListener('pointerleave', cancel);
    hold.addEventListener('pointercancel', cancel);
  }

  /* ───────── consent (capacitor-game-services) ───────── */

  async function setAdsPersonalized(on) {
    prefs.personalizedAds = on === true;
    savePrefs();
    applyConsent();
    renderSettingsToggles();
    if (!on) return;
    var Ads = window.Ads;
    if (!Ads || !Ads.isNative || !Ads.isNative()) return;
    var attPromise = Ads.getPlatform() === 'ios' ? Ads.ensureAtt(true) : Promise.resolve();
    try { await Ads.init(); } catch (e) {}
    try { await attPromise; } catch (e) {}
    applyConsent();
    renderSettingsToggles();
  }

  async function primeConsent() {
    var Ads = window.Ads;
    var native = !!(Ads && Ads.isNative && Ads.isNative());
    var attPromise = native && Ads.getPlatform() === 'ios' ? Ads.ensureAtt(true) : Promise.resolve();
    /* iOS shows one system prompt at a time, so notifications wait for the tracking answer. */
    attPromise.catch(function () {}).then(askForNotifications).catch(function () {});
    if (!native) return;
    try { await Ads.init(); } catch (e) {}
    var attStatus = null;
    try { attStatus = await attPromise; } catch (e) {}
    if (attStatus === 'authorized') {
      prefs.personalizedAds = true;
      savePrefs();
    }
    applyConsent();
    renderSettingsToggles();
  }

  /* First run only: the OS remembers the answer, and the Settings switch handles a change of mind. */
  function askForNotifications() {
    var R = window.Reminders;
    if (!R || !R.available() || R.state().asked) return;
    return R.enable(doneDays()).then(function (result) {
      if (result === 'on') track('daily_reminder', { on: true, hour: R.state().hour, from: 'first_run' });
      renderReminderRows();
    });
  }

  function openPrivacyModal() {
    setToggleBtn($('privacy-analytics'), prefs.analytics === true);
    var link = $('privacy-policy');
    if (link) {
      link.hidden = !PRIVACY_POLICY_URL;
      if (PRIVACY_POLICY_URL) link.href = PRIVACY_POLICY_URL;
    }
    openModal('privacy', 'privacy-title');
  }

  function openPrivacyDataModal() {
    setToggleBtn($('privacy-data-analytics'), prefs.analytics === true);
    setToggleBtn($('privacy-data-ads'), prefs.personalizedAds === true);
    renderSettingsToggles();
    openModal('privacy-data', 'privacy-data-title');
  }

  function maybeAskConsent() {
    /* A browser build without a GA4 ID sends nothing, so there is nothing to ask. */
    if (!window.Capacitor && !(window.Track && window.Track.id)) return;
    if (prefs.analytics !== null) {
      applyConsent();
      var Ads = window.Ads;
      if (Ads && Ads.isNative && Ads.isNative()) {
        Ads.init().then(function () { return Ads.ensureAtt(false); })
          .then(function () { applyConsent(); renderSettingsToggles(); })
          .catch(function () {});
      }
      return;
    }
    (function waitForBoot(tries) {
      if (!document.getElementById('boot') || tries > 40) { openPrivacyModal(); return; }
      setTimeout(function () { waitForBoot(tries + 1); }, 150);
    })(0);
  }

  function applyConsent() {
    function syncAnalytics() {
      window.__consentState = {
        analytics: prefs.analytics === true,
        ads: prefs.personalizedAds === true && !!(window.Ads && window.Ads.adsPersonalisedGranted && window.Ads.adsPersonalisedGranted())
      };
      if (window.Track && window.Track.sync) window.Track.sync();
    }
    syncAnalytics();
    if (window.Ads && window.Ads.setPersonalized) {
      // The shared plugin applies consent asynchronously; refresh Firebase
      // after it settles, reading the latest saved preferences again.
      Promise.resolve(window.Ads.setPersonalized(prefs.personalizedAds === true))
        .then(syncAnalytics).catch(syncAnalytics);
    }
  }

  /* Every call site is one line and none of them can fail: Track.event is a
     no-op without consent, and this wrapper tolerates Track being absent.
     Never delete it while callers remain — a ReferenceError here would stop
     every round from starting. */
  function track(name, params) {
    try {
      if (window.Track && window.Track.event) window.Track.event(name, params);
    } catch (e) { /* analytics must never break play */ }
  }

  /* ───────── daily reminders (js/reminders.js) ───────── */

  function hourLabel(h) {
    var suffix = h < 12 ? 'am' : 'pm';
    var n = h % 12 === 0 ? 12 : h % 12;
    return n + suffix;
  }

  function renderReminderRows() {
    var R = window.Reminders;
    var row = $('settings-reminder-row');
    if (!row) return;
    var show = !!(R && R.available());
    row.hidden = !show;
    if (show) setToggleBtn($('settings-reminder'), R.state().on);
  }

  var REMINDER_BLOCKED = 'Notifications are turned off for this game. Allow them in your phone\'s Settings app, then switch this on.';

  function showReminderBlocked(blocked) {
    $('settings-reminder-note').textContent = blocked ? REMINDER_BLOCKED : '';
    $('settings-reminder-note-row').hidden = !blocked;
  }

  /* The system setting can change while the game is closed. If it was turned
     off there, say so next to the switch. */
  function checkReminderPermission() {
    var R = window.Reminders;
    if (!R || !R.available()) return;
    R.permission().then(function (p) { showReminderBlocked(p === 'denied'); });
  }

  /* Set while the phone's Settings is open from the switch, so coming back
     with notifications allowed finishes switching it on. */
  var reminderFromSettings = false;

  async function finishReminderFromSettings() {
    reminderFromSettings = false;
    var R = window.Reminders;
    if ((await R.permission()) !== 'granted') return;
    var result = await R.enable(doneDays());
    showReminderBlocked(result !== 'on');
    if (result === 'on') track('daily_reminder', { on: true, hour: R.state().hour, from: 'settings' });
    renderReminderRows();
  }

  async function toggleReminder() {
    var R = window.Reminders;
    if (!R) return;
    var btn = $('settings-reminder');
    btn.disabled = true;
    try {
      if (R.state().on) {
        await R.disable();
        track('daily_reminder', { on: false });
      } else {
        var result = await R.enable(doneDays());
        if (result === 'blocked') {
          reminderFromSettings = true;
          R.openSettings();
        }
        showReminderBlocked(result === 'denied' || result === 'blocked');
        if (result === 'on') track('daily_reminder', { on: true, hour: R.state().hour });
      }
    } finally {
      btn.disabled = false;
      renderReminderRows();
    }
  }

  /* Offered once per install, at whichever comes first: the first daily
     played, or six rounds of any kind. Never at launch: the system prompt
     appears once per install, and spending it before the player cares
     wastes it. */
  var REMINDER_AFTER_ROUNDS = 6;
  async function maybeOfferReminder() {
    var R = window.Reminders;
    var daily = state.result && state.result.mode === 'daily';
    if (!daily && progress.rounds < REMINDER_AFTER_ROUNDS) return;
    if (!R || !(await R.shouldOffer())) return;
    if (!$('settings-modal').hidden || !$('result').hidden) return;
    R.markOffered();
    var lead = $('reminder-offer-lead');
    lead.hidden = daily;
    lead.textContent = daily ? '' : progress.rounds + ' rounds played, nice work! There are seven new daily challenges every day.';
    $('reminder-offer-time').textContent = hourLabel(R.state().hour);
    openModal('reminder-offer', 'reminder-offer-yes');
    track('reminder_offer', { from: daily ? 'daily' : 'rounds' });
  }

  function closeReminderOffer() { $('reminder-offer').hidden = true; }

  /* ───────── Remove Ads (js/purchases.js) ───────── */

  var REMOVE_ADS_NOTE = 'Pay once, no more ads. Stays removed if you reinstall or change phone.';

  /* Remove Ads is only sold where there are ads to remove. */
  function sellsRemoveAds() {
    var P = window.Purchases;
    return !!(P && P.available() && window.Ads && window.Ads.configured && window.Ads.configured());
  }

  function renderPurchaseRows(message) {
    var P = window.Purchases;
    var row = $('settings-remove-ads-row');
    if (!row) return;
    var show = sellsRemoveAds();
    row.hidden = !show;
    $('settings-restore-row').hidden = !show;
    var adsNote = $('privacy-data-ads-note');
    var adsBtn = $('privacy-data-ads');
    var removed = !!(P && P.adsRemoved());
    if (adsNote) {
      adsNote.textContent = removed
        ? 'You removed ads, so there are none to personalise.'
        : 'Ads matched to your interests. Left off, ads still appear but are generic.';
    }
    if (adsBtn) adsBtn.disabled = removed;
    renderHomeRemoveAds();
    if (!show) return;
    var st = P.status();
    var btn = $('settings-remove-ads');
    var note = $('settings-remove-ads-note');
    if (st.owned) {
      btn.textContent = 'Removed';
      btn.disabled = true;
      note.textContent = message || 'Thank you! Ads are gone for good.';
    } else if (st.pending) {
      btn.textContent = 'Pending';
      btn.disabled = true;
      note.textContent = message || 'Waiting for the payment to be approved. Ads switch off by themselves when it goes through.';
    } else {
      btn.textContent = st.busy ? '\u2026' : (st.price || 'Remove');
      btn.disabled = st.busy;
      note.textContent = message || REMOVE_ADS_NOTE;
    }
    $('settings-restore').disabled = st.busy || st.owned;
  }

  /* The home-screen button: the same purchase as the Settings row, one tap
     from the menu. Hidden on the web and once bought. */
  var homeThanksUntil = 0;
  function renderHomeRemoveAds() {
    var P = window.Purchases;
    var btn = $('home-remove-ads');
    if (!btn) return;
    if (!sellsRemoveAds()) { btn.hidden = true; return; }
    var st = P.status();
    if (st.owned) {
      var left = homeThanksUntil - Date.now();
      btn.hidden = left <= 0;
      btn.textContent = 'Thank you!';
      btn.disabled = true;
      if (left > 0) setTimeout(renderHomeRemoveAds, left + 20);
      return;
    }
    btn.hidden = false;
    btn.disabled = st.busy || st.pending;
    btn.textContent = '';
    if (st.pending) { btn.textContent = 'Pending'; return; }
    /* The price comes from the store, so it goes in as text, never as markup. */
    UI.el('span', 'ra-long', btn).textContent = 'Remove ads';
    UI.el('span', 'ra-short', btn).textContent = 'No ads';
    btn.appendChild(document.createTextNode(st.busy ? '\u2026' : st.price ? ' \u00b7 ' + st.price : ''));
  }

  async function buyFromHome() {
    var P = window.Purchases;
    if (!P) return;
    var result = await P.buy();
    track('remove_ads', { result: result, from: 'home' });
    if (result === 'owned') homeThanksUntil = Date.now() + 2500;
    renderPurchaseRows();
    if (result === 'failed' || result === 'pending') {
      renderSettingsToggles();
      renderPurchaseRows(result === 'failed'
        ? 'The purchase did not go through. Check your connection and try again. Bought it before? Tap Restore.'
        : 'Waiting for the payment to be approved. Ads switch off by themselves when it goes through.');
      openModal('settings-modal', 'settings-close');
    }
  }

  async function buyRemoveAds() {
    var P = window.Purchases;
    if (!P) return;
    var result = await P.buy();
    track('remove_ads', { result: result, from: 'settings' });
    var msg = {
      owned: 'Thank you! Ads are gone for good.',
      pending: 'Waiting for the payment to be approved. Ads switch off by themselves when it goes through.',
      cancelled: null,
      failed: 'The purchase did not go through. Check your connection and try again.'
    }[result];
    renderPurchaseRows(msg || undefined);
  }

  async function restorePurchases() {
    var P = window.Purchases;
    if (!P) return;
    var owned = await P.restore();
    track('remove_ads_restore', { found: owned });
    renderPurchaseRows(owned
      ? 'Restored. Ads are gone for good.'
      : 'No Remove Ads purchase found for this ' +
        (window.Capacitor && window.Capacitor.getPlatform() === 'ios' ? 'Apple ID.' : 'Google account.'));
  }

  function bindStoreAndReminders() {
    $('settings-reminder').addEventListener('click', toggleReminder);
    $('reminder-offer-yes').addEventListener('click', async function () {
      closeReminderOffer();
      var result = await window.Reminders.enable(doneDays());
      if (result === 'on') track('daily_reminder', { on: true, hour: window.Reminders.state().hour, from: 'offer' });
      renderReminderRows();
    });
    $('reminder-offer-no').addEventListener('click', closeReminderOffer);

    $('settings-remove-ads').addEventListener('click', buyRemoveAds);
    $('home-remove-ads').addEventListener('click', buyFromHome);
    $('settings-restore').addEventListener('click', restorePurchases);

    if (window.Purchases) {
      window.Purchases.onChange(function () { renderPurchaseRows(); });
    }
    if (window.Reminders) {
      /* A tapped reminder opens the games list, unless a round is in
         progress: that is left alone rather than thrown away. */
      window.Reminders.onOpen(function () {
        if (state.vs || (state.screen === 'game' && state.playing)) return;
        closeReminderOffer();
        closeResult();
        goHome();
      });
      window.Reminders.sync(doneDays());
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      /* A new day may have started while the game sat in the background. */
      if (window.Reminders) window.Reminders.sync(doneDays());
      if (reminderFromSettings) finishReminderFromSettings();
      if (state.screen === 'home') renderHome();
    });
    renderReminderRows();
    renderPurchaseRows();
  }

  /* ───────── keyboard ───────── */

  function onKey(e) {
    if (e.key !== 'Escape') return;
    if (!$('reminder-offer').hidden) { closeReminderOffer(); return; }
    if (!$('privacy').hidden) {
      if (prefs.analytics !== null) { closeModal('privacy'); openModal('settings-modal', 'settings-close'); }
      return;
    }
    if (!$('privacy-data').hidden) { closeModal('privacy-data'); openModal('settings-modal', 'settings-close'); return; }
    if (!$('settings-modal').hidden) { closeModal('settings-modal'); return; }
    if (!$('reset-modal').hidden) { closeModal('reset-modal'); return; }
    if (!$('quit').hidden) { closeModal('quit'); return; }
    if (!$('vs-result').hidden) { vsNext(); return; }
    if (!$('handoff').hidden) {
      if (state.screen === 'lobby') endMatch(); else askQuit();
      return;
    }
    if (!$('result').hidden) { resultContinue(); return; }
    if (state.screen !== 'home') history.back();
  }

  /* The visual viewport, published for CSS: on iOS the keyboard shrinks it,
     and sizing the app to it keeps the search box in view. */
  function trackViewport() {
    var vv = window.visualViewport;
    if (!vv) return;
    var set = function () { document.documentElement.style.setProperty('--vvh', Math.round(vv.height) + 'px'); };
    vv.addEventListener('resize', set);
    set();
  }

  function warnIfNotSaved() {
    var w = $('save-warning');
    if (window.Store.kind === 'kept') return;
    w.hidden = false;
    w.textContent = window.Store.kind === 'this-visit'
      ? 'This browser keeps your results only until you close the tab.'
      : 'This browser is not letting the game save, so results will not be kept.';
  }

  /* ───────── start ───────── */

  function init() {
    loadPrefs();
    applyPrefs();
    loadProgress();
    maybeAskConsent();
    trackViewport();
    warnIfNotSaved();
    history.replaceState({ s: 'home' }, '');
    window.addEventListener('popstate', onPopState);
    document.addEventListener('keydown', onKey);

    $('lobby-back').addEventListener('click', function () { Sfx.play('tap'); history.back(); });
    $('game-back').addEventListener('click', function () {
      if (state.playing && !state.finished) { askQuit(); return; }
      history.back();
    });
    $('quit-stay').addEventListener('click', function () { closeModal('quit'); });
    $('quit-go').addEventListener('click', confirmQuit);
    $('result-next').addEventListener('click', resultContinue);
    $('result-again').addEventListener('click', resultAgain);
    $('result-share').addEventListener('click', shareResult);

    $('home-versus').addEventListener('click', function () { Sfx.unlock(); Sfx.play('tap'); openVersus(); });
    $('handoff-go').addEventListener('click', startVsTurn);
    $('handoff-quit').addEventListener('click', function () {
      if (state.screen === 'lobby') endMatch(); else askQuit();
    });
    $('vs-next').addEventListener('click', vsNext);
    $('vs-alt').addEventListener('click', vsAlt);
    $('vs-share').addEventListener('click', vsShare);

    $('settings').addEventListener('click', function () {
      Sfx.unlock();
      renderSettingsToggles();
      openModal('settings-modal', 'settings-close');
      checkReminderPermission();
    });
    $('settings-close').addEventListener('click', function () { closeModal('settings-modal'); });
    $('settings-sound').addEventListener('click', function () {
      prefs.sound = !prefs.sound; savePrefs(); applyPrefs(); renderSettingsToggles(); Sfx.play('tap');
    });
    $('settings-haptics').addEventListener('click', function () {
      prefs.haptics = !prefs.haptics; savePrefs(); applyPrefs(); renderSettingsToggles(); Sfx.haptic('medium');
    });
    $('settings-reset').addEventListener('click', function () {
      closeModal('settings-modal');
      $('reset-hold-label').textContent = 'Press and hold';
      openModal('reset-modal', 'reset-cancel');
    });
    $('reset-cancel').addEventListener('click', function () { closeModal('reset-modal'); });
    bindReset();

    function bindToggle(id) {
      $(id).addEventListener('click', function () {
        var on = this.getAttribute('aria-pressed') !== 'true';
        setToggleBtn(this, on);
      });
    }
    bindToggle('privacy-analytics');
    $('privacy-continue').addEventListener('click', function () {
      prefs.analytics = $('privacy-analytics').getAttribute('aria-pressed') === 'true';
      savePrefs();
      applyConsent();
      $('privacy').hidden = true;
      primeConsent();
    });

    function bindPrivacyDataToggle(id) {
      $(id).addEventListener('click', function () {
        var on = this.getAttribute('aria-pressed') !== 'true';
        setToggleBtn(this, on);
        if (id === 'privacy-data-analytics') prefs.analytics = on;
        else setAdsPersonalized(on);
        savePrefs();
        applyConsent();
      });
    }
    bindPrivacyDataToggle('privacy-data-analytics');
    bindPrivacyDataToggle('privacy-data-ads');
    $('privacy-data-close').addEventListener('click', function () {
      $('privacy-data').hidden = true;
      openModal('settings-modal', 'settings-close');
    });
    $('settings-privacy').addEventListener('click', function () {
      $('settings-modal').hidden = true;
      openPrivacyDataModal();
    });
    renderDataBuilt();

    bindStoreAndReminders();
    renderHome();
    startDataFeed();
  }

  init();
})();
