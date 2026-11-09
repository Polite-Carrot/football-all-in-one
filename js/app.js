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
  var state = { screen: 'home', gameId: null, mode: null, round: null, result: null, playing: false, finished: false };

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
    leaveRound();
    var depth = state.screen === 'game' ? 2 : state.screen === 'lobby' ? 1 : 0;
    if (depth) { ignorePop = true; history.go(-depth); }
    showScreen('home', true);
    renderHome();
  }

  function onPopState() {
    if (ignorePop) { ignorePop = false; return; }
    if (state.screen === 'game') {
      if (state.playing && !state.finished) {
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

  var BALL = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="none" stroke="#18241c" stroke-width="1.6"/>' +
    '<path d="M20 12.5l6.2 4.5-2.4 7.3h-7.6l-2.4-7.3z" fill="#18241c"/><path d="M20 12.5V4.6M26.2 17l7.4-2.6M23.8 24.3l4.6 6.4M16.2 24.3l-4.6 6.4M13.8 17l-7.4-2.6" stroke="#18241c" stroke-width="1.6" fill="none"/></svg>';

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
    renderLobby();
    go('lobby');
  }

  function renderLobby() {
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
    UI.el('span', null, text, entry ? 'Back tomorrow for a new one.' : 'Same for everyone, one go.');
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
    var now = today();
    var key = Daily.key(now);
    state.gameId = id;
    state.mode = mode;
    state.playing = true;
    state.finished = false;
    state.result = null;

    var screen = $('screen-game');
    screen.style.setProperty('--g', game.color);
    $('game-title').textContent = game.name;
    $('game-mode').textContent = mode === 'daily' ? 'Daily #' + Daily.number(now) : 'Practice';
    $('game-meta').textContent = '';
    var root = $('game-root');
    UI.clear(root);
    $('game-scroll').scrollTop = 0;

    if (mode === 'daily') {
      /* A daily counts from the first move: leaving it, or closing the app, keeps it as played. */
      (progress.daily[key] = progress.daily[key] || {})[id] = { s: null, d: 'Unfinished' };
      saveProgress();
    }

    var ctx = {
      root: root,
      mode: mode,
      date: now,
      number: Daily.number(now),
      rand: mode === 'daily' ? Daily.rng(id + ':' + key) : Math.random,
      choose: function (n) {
        if (mode === 'daily') return Daily.pick(n, id, now);
        var recent = progress.recent[id] || [];
        var keep = Math.min(recent.length, Math.max(0, n - 1), 12);
        var avoid = recent.slice(-keep);
        var options = [];
        for (var i = 0; i < n; i++) if (avoid.indexOf(i) < 0) options.push(i);
        var pick = options[Math.floor(Math.random() * options.length)];
        progress.recent[id] = recent.concat([pick]).slice(-12);
        return pick;
      },
      setMeta: function (text) { $('game-meta').textContent = text; },
      finish: function (result) { finishRound(game, mode, key, result); }
    };
    track('round_start', { game: id, mode: mode });
    state.round = game.start(ctx);
    if (state.screen !== 'game') go('game');
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
    var daily = state.mode === 'daily';
    $('quit-line').textContent = daily
      ? 'Today\u2019s challenge is one go. If you leave now, it ends here and counts as played.'
      : 'This practice round will be thrown away.';
    $('quit-go').textContent = daily ? 'End it here' : 'Leave';
    openModal('quit', 'quit-stay');
  }

  function confirmQuit() {
    $('quit').hidden = true;
    if (state.mode === 'daily' && state.round && state.round.quit) {
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
        if (state.screen === 'game' && state.playing) return;
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
    UI.svg(BALL, null, $('brand-ball'));
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
    $('data-built').textContent = window.Footy.built ? 'Football data from Wikidata (CC0), ' + window.Footy.built + '.' : '';

    bindStoreAndReminders();
    renderHome();
  }

  init();
})();
