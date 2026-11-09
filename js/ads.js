"use strict";
/* App-specific Unity configuration and frequency policy. SDK lifecycle,
 * consent signals, ATT and playback live in the shared package.
 *
 * UNITY holds this app's own game IDs and interstitial placements, from the
 * Unity dashboard (Monetization > Ad Units). Until both are filled in for a
 * platform, ads are OFF there: Unity is never started, no ATT prompt is
 * shown and Remove Ads is not offered. Never reuse another game's IDs. */
(function () {
  var UNITY = {
    ios: { gameId: "800427558", interstitial: "BP_Interstitial_iOS" },
    android: { gameId: "800427560", interstitial: "BP_Interstitial_Android" },
  };
  var MIN_MILLIS = 2 * 60 * 1000;
  var MIN_LEVELS = 3;
  var lastShownAt = Date.now();
  var levelsSinceLast = 0;
  var preparing = null;
  var showing = false;
  var attPromise = null;

  function nativePlatform() {
    var C = window.Capacitor;
    return C && C.isNativePlatform && C.isNativePlatform() ? C.getPlatform() : 'web';
  }
  var ids = UNITY[nativePlatform()];
  var configured = !!(ids && ids.gameId && ids.interstitial);

  /* Stands in for the Unity client where this app has no IDs yet. */
  function inertClient() {
    var platform = nativePlatform();
    var none = function () { return Promise.resolve({ loaded: false, shown: false, rewarded: false, reason: 'not configured' }); };
    return {
      init: function () { return Promise.resolve(false); },
      setPersonalized: function () { return Promise.resolve(); },
      requestTracking: function () { return Promise.resolve(null); },
      prepareInterstitial: none, prepareRewarded: none, showInterstitial: none, showRewarded: none,
      state: function () {
        return { platform: platform, ready: false, showing: false, personalized: false, attStatus: null,
          effectivePersonalized: false, prepared: { interstitial: false, rewarded: false } };
      },
    };
  }

  var client = configured ? window.PoliteCarrotAds.createUnityAds({
    ios: UNITY.ios,
    android: UNITY.android,
    testMode: false,
  }) : inertClient();

  function getPlatform() { return client.state().platform; }
  function isNative() { return getPlatform() === 'ios' || getPlatform() === 'android'; }
  function warn(error) { console.warn('Ads:', error && error.message || error); }
  /* Bought "Remove Ads" (js/purchases.js): Unity is never started, nothing is
   * loaded or shown. Read live, so a purchase or a refund mid-session takes
   * effect on the next round without a restart. */
  function removed() {
    return !configured ||
      !!(window.Purchases && window.Purchases.adsRemoved && window.Purchases.adsRemoved());
  }
  function init() {
    return removed() ? Promise.resolve(false) : client.init();
  }

  function warm() {
    if (!isNative() || showing || removed()) return Promise.resolve(false);
    if (preparing) return preparing;
    preparing = client.prepareInterstitial().then(function (result) {
      if (!result.loaded) warn(result.reason);
      return result.loaded === true;
    }).catch(function (error) {
      warn(error);
      return false;
    }).finally(function () { preparing = null; });
    return preparing;
  }

  function noteLevelComplete() {
    if (!isNative() || removed()) return;
    levelsSinceLast += 1;
    if (levelsSinceLast >= MIN_LEVELS - 1 && !client.state().prepared.interstitial) warm();
  }

  async function maybeShowInterstitial() {
    if (!isNative() || showing || removed() || levelsSinceLast < MIN_LEVELS ||
        Date.now() - lastShownAt < MIN_MILLIS) return false;
    // Never wait for an ad to load in a button handler.
    if (!client.state().prepared.interstitial) { warm(); return false; }
    showing = true;
    try {
      var result = await client.showInterstitial();
      if (!result.shown) { warn(result.reason); return false; }
      lastShownAt = Date.now();
      levelsSinceLast = 0;
      return true;
    } catch (error) {
      warn(error);
      return false;
    } finally {
      showing = false;
      warm();
    }
  }

  async function setPersonalized(on) {
    if (!configured) return;
    try {
      if (client.state().personalized !== (on === true)) {
        await client.setPersonalized(on === true);
      }
      if (isNative() && client.state().ready) warm();
    } catch (error) { warn(error); }
  }

  function ensureAtt(mayPrompt) {
    if (!configured || getPlatform() !== 'ios') return Promise.resolve(null);
    if (attPromise) return attPromise;
    // Prompt only from the app's existing onboarding/settings actions.
    attPromise = (mayPrompt ? client.requestTracking() : init().then(function () {
      return client.state().attStatus;
    })).catch(function (error) {
      warn(error);
      return null;
    }).finally(function () { attPromise = null; });
    return attPromise;
  }

  function adsPersonalisedGranted() { return client.state().effectivePersonalized; }
  window.Ads = {
    configured: function () { return configured; },
    init: init,
    isNative: isNative,
    getPlatform: getPlatform,
    setPersonalized: setPersonalized,
    ensureAtt: ensureAtt,
    requestTracking: function () { return ensureAtt(true); },
    adsPersonalisedGranted: adsPersonalisedGranted,
    noteLevelComplete: noteLevelComplete,
    maybeShowInterstitial: maybeShowInterstitial,
    warm: warm,
    consentState: client.state,
  };
  window.__consentDebug = function () {
    var state = client.state();
    return { configured: configured, attStatus: state.attStatus, personalizedAds: state.personalized,
      unityConsent: state.effectivePersonalized, granted: state.effectivePersonalized };
  };
})();
