/* ui.js — the small kit every screen is built from: elements, the player
 * search box, countdowns, toasts, number tickers and sharing. */
(function (g) {
  'use strict';

  var doc = g.document;
  var reduced = !!(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function $(id) { return doc.getElementById(id); }

  function el(tag, cls, parent, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); return n; }

  /* Inline SVG from trusted, hard-coded markup only (the game icons). */
  function svg(markup, cls, parent) {
    var wrap = el('span', cls, parent);
    wrap.innerHTML = markup;
    wrap.setAttribute('aria-hidden', 'true');
    return wrap;
  }

  function after(ms) { return new Promise(function (r) { setTimeout(r, reduced ? Math.min(ms, 60) : ms); }); }

  /* Restart a CSS animation class on an element. */
  function pulse(n, cls) {
    if (!n) return;
    n.classList.remove(cls);
    void n.offsetWidth;
    n.classList.add(cls);
  }

  var toastTimer = null;
  function toast(msg, kind) {
    var t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast is-on' + (kind ? ' toast--' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.className = 'toast';
      /* Empty the live region once it has faded, so it is not re-read later. */
      toastTimer = setTimeout(function () { t.textContent = ''; }, 400);
    }, 2200);
  }

  function countUp(n, from, to, ms, fmt) {
    fmt = fmt || function (v) { return String(Math.round(v)); };
    if (reduced || !ms) { n.textContent = fmt(to); return Promise.resolve(); }
    return new Promise(function (done) {
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var k = Math.min(1, (ts - start) / ms);
        var e = 1 - Math.pow(1 - k, 3);
        n.textContent = fmt(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step); else done();
      }
      requestAnimationFrame(step);
    });
  }

  /* ───────── search box ─────────
     Type a few letters, tap a suggestion. Enter takes the top one. The list
     is the whole directory of that kind, never the answers. */
  function searchBox(opts) {
    var root = el('div', 'search' + (opts.compact ? ' search--compact' : ''), opts.parent);
    var field = el('div', 'search__field', root);
    var input = el('input', 'search__input', field);
    input.type = 'text';
    input.autocomplete = 'off';
    input.autocapitalize = 'words';
    input.spellcheck = false;
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('enterkeyhint', 'go');
    input.placeholder = opts.placeholder || 'Type a name\u2026';
    input.setAttribute('aria-label', opts.placeholder || 'Search');
    var clearBtn = el('button', 'search__clear', field, '\u00d7');
    clearBtn.type = 'button';
    clearBtn.setAttribute('aria-label', 'Clear');
    clearBtn.hidden = true;
    var list = el('div', 'search__list', root);
    list.setAttribute('role', 'listbox');
    var results = [];
    var active = 0;
    var disabled = false;

    function render() {
      clear(list);
      clearBtn.hidden = !input.value;
      results.forEach(function (r, i) {
        var b = el('button', 'search__item' + (i === active ? ' is-active' : ''), list);
        b.type = 'button';
        b.setAttribute('role', 'option');
        el('span', 'search__name', b, r.label);
        if (r.sub) el('span', 'search__sub', b, r.sub);
        b.addEventListener('pointerdown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () { pick(r); });
      });
      root.classList.toggle('has-results', results.length > 0);
      if (input.value.trim().length >= 2 && !results.length) {
        el('div', 'search__empty', list, 'No match \u2014 check the spelling');
        root.classList.add('has-results');
      }
    }

    function update() {
      var q = input.value;
      results = q.trim().length >= 1 ? g.Footy.search(opts.kind || 'player', q, opts.limit || 6) : [];
      active = 0;
      render();
    }

    function pick(r) {
      if (disabled || !r) return;
      input.value = '';
      results = [];
      render();
      if (opts.keepFocus !== false) input.focus({ preventScroll: true });
      opts.onPick(r);
    }

    input.addEventListener('input', update);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { active = Math.min(results.length - 1, active + 1); render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); render(); e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) pick(results[active]); }
      else if (e.key === 'Escape') { input.value = ''; update(); }
    });
    clearBtn.addEventListener('click', function () { input.value = ''; update(); input.focus({ preventScroll: true }); });

    return {
      root: root,
      input: input,
      focus: function () { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } },
      blur: function () { input.blur(); },
      reset: function () { input.value = ''; update(); },
      setDisabled: function (on) {
        disabled = !!on;
        input.disabled = disabled;
        root.classList.toggle('is-disabled', disabled);
        if (disabled) { input.value = ''; results = []; render(); input.blur(); }
      }
    };
  }

  /* ───────── countdown ─────────
     Ticks by wall clock, not by setInterval counts, so a backgrounded tab or a
     paused WebView cannot hand out extra time. */
  function countdown(seconds, onTick, onEnd) {
    var endAt = 0, raf = 0, last = -1, running = false;
    function frame() {
      if (!running) return;
      var left = Math.max(0, endAt - Date.now());
      var s = Math.ceil(left / 1000);
      onTick(left / 1000, seconds, s !== last);
      last = s;
      if (left <= 0) { running = false; onEnd(); return; }
      raf = requestAnimationFrame(frame);
    }
    return {
      start: function () { endAt = Date.now() + seconds * 1000; running = true; last = -1; frame(); },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      left: function () { return running ? Math.max(0, (endAt - Date.now()) / 1000) : 0; },
      add: function (s) { endAt += s * 1000; }
    };
  }

  /* A circular timer: an SVG ring whose stroke drains. */
  function ring(parent, cls) {
    var wrap = el('div', 'ring ' + (cls || ''), parent);
    wrap.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ring__bg" cx="22" cy="22" r="19"/><circle class="ring__fg" cx="22" cy="22" r="19"/></svg>';
    var num = el('span', 'ring__num', wrap);
    var fg = wrap.querySelector('.ring__fg');
    var len = 2 * Math.PI * 19;
    fg.style.strokeDasharray = len.toFixed(2);
    return {
      root: wrap,
      set: function (left, total) {
        var k = Math.max(0, Math.min(1, left / total));
        fg.style.strokeDashoffset = (len * (1 - k)).toFixed(2);
        num.textContent = String(Math.ceil(left));
        wrap.classList.toggle('is-late', left <= Math.min(5, total * 0.25));
      }
    };
  }

  async function share(text) {
    try {
      if (g.navigator.share) {
        await g.navigator.share({ text: text });
        return 'shared';
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
    try {
      await g.navigator.clipboard.writeText(text);
      toast('Copied \u2014 paste it anywhere');
      return 'copied';
    } catch (e) {
      toast('Could not share on this device');
      return 'failed';
    }
  }

  /* Ticker-tape burst for a big moment. */
  function celebrate(color) {
    if (reduced) return;
    var c = $('confetti');
    if (!c || !c.getContext) return;
    var x = c.getContext('2d');
    var w = c.width = g.innerWidth * (g.devicePixelRatio || 1);
    var h = c.height = g.innerHeight * (g.devicePixelRatio || 1);
    var cols = [color || '#c8f03c', '#ffffff', '#ffc83d', '#2ee67a'];
    var bits = [];
    for (var i = 0; i < 110; i++) {
      bits.push({ x: w / 2 + (Math.random() - 0.5) * w * 0.3, y: h * 0.32, vx: (Math.random() - 0.5) * w * 0.022,
        vy: -Math.random() * h * 0.022 - h * 0.006, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
        s: (6 + Math.random() * 8) * (g.devicePixelRatio || 1), c: cols[i % cols.length] });
    }
    var t0 = performance.now();
    c.style.display = 'block';
    function frame(ts) {
      var k = (ts - t0) / 1600;
      x.clearRect(0, 0, w, h);
      bits.forEach(function (b) {
        b.vy += h * 0.00055; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.vx *= 0.99;
        x.save(); x.translate(b.x, b.y); x.rotate(b.r);
        x.globalAlpha = Math.max(0, 1 - k * 0.8);
        x.fillStyle = b.c; x.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
        x.restore();
      });
      if (k < 1) requestAnimationFrame(frame); else { x.clearRect(0, 0, w, h); c.style.display = 'none'; }
    }
    requestAnimationFrame(frame);
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  g.UI = {
    $: $, el: el, clear: clear, svg: svg, after: after, pulse: pulse, toast: toast, countUp: countUp,
    searchBox: searchBox, countdown: countdown, ring: ring, share: share, celebrate: celebrate, plural: plural,
    reduced: reduced
  };
})(typeof window !== 'undefined' ? window : globalThis);
