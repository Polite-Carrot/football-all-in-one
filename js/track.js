/* track.js — optional, consented analytics.
 *
 * On the iOS and Android builds events go through the Capacitor Firebase
 * Analytics plugin to the app's GA4 property (configured by
 * GoogleService-Info.plist / google-services.json). The web build sends
 * nothing.
 *
 * Nothing runs until somebody has said yes. Firebase writes an install id,
 * which UK PECR and GDPR require consent for BEFORE anything is stored — which
 * is why native SDK collection defaults to OFF (see AndroidManifest.xml and
 * Info.plist flags).
 *
 * Every call is safe to make at any time. Before consent, or with no Firebase
 * plugin registered, event() does nothing and throws nothing: a tracking
 * failure must never cost somebody their game.
 */
(function (global) {
  'use strict';

  /* GA4 web measurement id. Left empty: the web build is not tracked. */
  var MEASUREMENT_ID = '';

  var enabled = false;

  function isNative() { return !!global.Capacitor; }

  function configured() {
    return isNative() && !!firebasePlugin();
  }

  /* Cached proxy to @capacitor-firebase/analytics's native plugin. */
  var _fb = null;
  function firebasePlugin() {
    if (_fb) return _fb;
    if (!global.Capacitor) return null;
    if (global.Capacitor.registerPlugin) {
      _fb = global.Capacitor.registerPlugin('FirebaseAnalytics');
    } else if (global.Capacitor.Plugins && global.Capacitor.Plugins.FirebaseAnalytics) {
      _fb = global.Capacitor.Plugins.FirebaseAnalytics;
    }
    return _fb;
  }

  /* Turn collection on: after consent, or after somebody switches the setting
     back on. Safe to call repeatedly. adsAllowed false keeps the ad-related
     Consent Mode v2 grants DENIED while ANALYTICS_STORAGE is GRANTED. */
  async function load(adsAllowed) {
    if (!configured()) return;
    enabled = true;

    var fb = firebasePlugin();
    if (!fb) return;
    var adStatus = adsAllowed === false ? 'DENIED' : 'GRANTED';
    try {
      await fb.setEnabled({ enabled: true });
      if (fb.setConsent) {
        /* @capacitor-firebase/analytics 8.x takes { type, status } per call,
           not an array — four separate awaits to grant/deny each type. */
        await fb.setConsent({ type: 'ANALYTICS_STORAGE',  status: 'GRANTED' });
        await fb.setConsent({ type: 'AD_STORAGE',         status: adStatus });
        await fb.setConsent({ type: 'AD_USER_DATA',       status: adStatus });
        await fb.setConsent({ type: 'AD_PERSONALIZATION', status: adStatus });
      }
    } catch (e) { console.warn('Track: Firebase enable failed', e && e.message); }
  }

  function sync() {
    var choice = global.__consentState || {};
    if (choice.analytics === true) load(choice.ads === true);
    else unload();
  }

  async function unload() {
    if (isNative()) {
      var fb = firebasePlugin();
      if (fb) {
        try {
          await fb.setEnabled({ enabled: false });
          if (fb.setConsent) {
            await fb.setConsent({ type: 'ANALYTICS_STORAGE',  status: 'DENIED' });
            await fb.setConsent({ type: 'AD_STORAGE',         status: 'DENIED' });
            await fb.setConsent({ type: 'AD_USER_DATA',       status: 'DENIED' });
            await fb.setConsent({ type: 'AD_PERSONALIZATION', status: 'DENIED' });
          }
        } catch (e) { /* nothing to do */ }
      }
    }
    enabled = false;
  }

  function event(name, params) {
    if (!enabled || !isNative()) return;
    var fb = firebasePlugin();
    if (!fb) return;
    /* Firebase Analytics parameter names are limited to 40 chars and values
       to 100. Trim quietly rather than reject. */
    var safe = {};
    if (params) for (var k in params) {
      if (Object.prototype.hasOwnProperty.call(params, k)) {
        safe[String(k).slice(0, 40)] = typeof params[k] === 'string'
          ? params[k].slice(0, 100) : params[k];
      }
    }
    fb.logEvent({ name: name, params: safe }).catch(function () {});
  }

  global.Track = {
    configured: configured,
    load: load,
    sync: sync,
    unload: unload,
    event: event,
    get id() { return isNative() ? 'firebase' : MEASUREMENT_ID; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
