/* sfx.js — little synthesised sounds and haptic taps.
 *
 * No audio files: every sound is a few oscillators and a burst of noise from
 * Web Audio, so the app stays small and works offline. The audio context is
 * created on the first tap (browsers refuse to start one sooner). Haptics go
 * through @capacitor/haptics in the app and navigator.vibrate on Android web;
 * iOS Safari has neither, so there they are silently skipped. */
(function (g) {
  'use strict';

  var ctx = null;
  var soundOn = true;
  var hapticsOn = true;
  var plugin = null;

  function audio() {
    if (!soundOn) return null;
    if (!ctx) {
      var C = g.AudioContext || g.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }

  function tone(freq, dur, type, vol, delay, slideTo) {
    var a = audio();
    if (!a) return;
    var t = a.currentTime + (delay || 0);
    var o = a.createOscillator();
    var v = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.012);
    v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(v).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  var noiseBuf = null;
  function noise(dur, vol, freq, q, delay, swell) {
    var a = audio();
    if (!a) return;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var t = a.currentTime + (delay || 0);
    var src = a.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq || 1000;
    f.Q.value = q || 0.8;
    var v = a.createGain();
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(vol || 0.1, t + (swell || 0.01));
    v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(v).connect(a.destination);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  var SOUNDS = {
    tap: function () { tone(540, 0.05, 'sine', 0.04); },
    good: function () { tone(659, 0.1, 'triangle', 0.12); tone(988, 0.16, 'triangle', 0.11, 0.07); },
    great: function () { tone(659, 0.1, 'triangle', 0.12); tone(831, 0.1, 'triangle', 0.12, 0.07); tone(1319, 0.22, 'triangle', 0.12, 0.14); },
    bad: function () { tone(170, 0.24, 'square', 0.06, 0, 110); },
    tick: function () { tone(1250, 0.03, 'square', 0.03); },
    whistle: function () {
      var a = audio();
      if (!a) return;
      var t = a.currentTime;
      var o = a.createOscillator(), lfo = a.createOscillator(), depth = a.createGain(), v = a.createGain();
      o.type = 'sine'; o.frequency.value = 2900;
      lfo.frequency.value = 28; depth.gain.value = 180;
      lfo.connect(depth).connect(o.frequency);
      v.gain.setValueAtTime(0.0001, t);
      v.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
      v.gain.setValueAtTime(0.07, t + 0.34);
      v.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(v).connect(a.destination);
      o.start(t); lfo.start(t); o.stop(t + 0.45); lfo.stop(t + 0.45);
    },
    kick: function () { tone(140, 0.12, 'sine', 0.22, 0, 60); noise(0.06, 0.08, 1800, 1.2); },
    net: function () { noise(0.5, 0.09, 700, 0.6, 0.02, 0.05); tone(98, 0.18, 'sine', 0.12); },
    crowd: function () { noise(1.4, 0.12, 900, 0.4, 0, 0.35); noise(1.2, 0.06, 2200, 0.9, 0.1, 0.4); },
    dart: function () { noise(0.04, 0.12, 3200, 2); tone(220, 0.09, 'triangle', 0.1, 0.01, 160); },
    bust: function () { tone(330, 0.12, 'sawtooth', 0.05); tone(220, 0.22, 'sawtooth', 0.05, 0.1); },
    coin: function () { tone(988, 0.07, 'square', 0.05); tone(1319, 0.18, 'square', 0.05, 0.06); },
    drain: function () { tone(880, 0.05, 'sine', 0.03); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.11, i * 0.09); }); },
    killed: function () { tone(392, 0.16, 'sawtooth', 0.07); tone(311, 0.16, 'sawtooth', 0.07, 0.14); tone(196, 0.4, 'sawtooth', 0.07, 0.28); },
    spin: function () { tone(760, 0.025, 'square', 0.025); }
  };

  function play(name) {
    if (!soundOn || !SOUNDS[name]) return;
    try { SOUNDS[name](); } catch (e) { /* sound must never break play */ }
  }

  function hapticsPlugin() {
    if (plugin) return plugin;
    var C = g.Capacitor;
    if (C && C.isNativePlatform && C.isNativePlatform() && C.registerPlugin) plugin = C.registerPlugin('Haptics');
    return plugin;
  }

  /* light | medium | heavy | success | warning | error | select */
  function haptic(kind) {
    if (!hapticsOn) return;
    var H = hapticsPlugin();
    try {
      if (H) {
        if (kind === 'success' || kind === 'warning' || kind === 'error') {
          H.notification({ type: kind.toUpperCase() }).catch(function () {});
        } else if (kind === 'select') {
          H.selectionChanged().catch(function () {});
        } else {
          H.impact({ style: (kind || 'light').toUpperCase() }).catch(function () {});
        }
      } else if (g.navigator && g.navigator.vibrate) {
        g.navigator.vibrate(kind === 'error' ? [30, 40, 30] : kind === 'heavy' || kind === 'success' ? 25 : 10);
      }
    } catch (e) { /* nothing to do */ }
  }

  g.Sfx = {
    play: play,
    haptic: haptic,
    setSound: function (on) { soundOn = !!on; },
    setHaptics: function (on) { hapticsOn = !!on; },
    unlock: function () { if (soundOn) audio(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
