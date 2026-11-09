/* footy.js — the football data every game reads, and the search box behind it.
 *
 * FA_DB (js/data/db.js) is packed for size: names in one string, numbers in
 * flat arrays, team members delta-encoded. This unpacks it lazily, builds a
 * prefix index for the search box, and answers the questions the games ask:
 * who played for whom, how famous each answer is, and what a 501 board pays.
 *
 * Search never looks at the question being played. Suggestions always come
 * from the whole directory, so typing can never reveal an answer. */
(function (g) {
  'use strict';

  var DB = g.FA_DB || { names: '', birth: '', fame: '', nat: '', pos: '', nats: [], teams: [], clubs: '', managers: '', nations: '' };
  var SETS = g.FA_SETS || { sets: [], boards: [] };

  /* ───────── names ───────── */

  var FOLD = { '\u00f8': 'o', '\u00d8': 'o', '\u00e6': 'ae', '\u00c6': 'ae', '\u0153': 'oe', '\u0152': 'oe', '\u00df': 'ss',
    '\u0142': 'l', '\u0141': 'l', '\u0111': 'd', '\u0110': 'd', '\u00f0': 'd', '\u00d0': 'd', '\u00fe': 'th', '\u00de': 'th', '\u0131': 'i' };

  function norm(s) {
    return String(s || '')
      .replace(/[\u00f8\u00d8\u00e6\u00c6\u0153\u0152\u00df\u0142\u0141\u0111\u0110\u00f0\u00d0\u00fe\u00de\u0131]/g, function (c) { return FOLD[c]; })
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['\u2019`]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  var CLUB_STOP = { fc: 1, afc: 1, cf: 1, sc: 1, sk: 1, ac: 1, as: 1, ss: 1, ssc: 1, pfc: 1, cd: 1, rc: 1, rcd: 1, us: 1,
    sv: 1, bv: 1, fk: 1, nk: 1, sl: 1, ud: 1, sd: 1, sfc: 1, cp: 1, club: 1, de: 1, futbol: 1 };

  /* The same club is "FC Porto", "Porto" or "F.C. Porto" depending on who
     wrote it; matching ignores the letters around the name. */
  function clubKey(s) {
    return norm(s).split(' ').filter(function (t) { return t.length > 1 && !CLUB_STOP[t]; }).join(' ');
  }

  /* How a club is shown: its everyday name, not the registered one. */
  var CLUB_SHOWN = { 'crvena zvezda': 'Red Star Belgrade', 'fcsb': 'Steaua Bucure\u0219ti (FCSB)' };

  function prettyClub(s) {
    var shown = CLUB_SHOWN[clubKey(s)];
    if (shown) return shown;
    return String(s)
      .replace(/\s+Club de F\u00fatbol$/, '')
      .replace(/^(A\.?F\.?C\.?|F\.?C\.?|F\.?K\.?)\s+(?=\S)/, '')
      .replace(/\s+(A\.?F\.?C\.?|F\.?C\.?|C\.?F\.?)$/, '');
  }

  /* ───────── the player directory ───────── */

  var names = null;
  function players() {
    if (!names) names = DB.names ? DB.names.split('|') : [];
    return names;
  }
  /* Two base-36 characters per player. */
  function packed(str, i) { return parseInt(str.substr(i * 2, 2), 36) || 0; }
  function count() { return players().length; }
  function name(i) { return players()[i]; }
  function fame(i) { return packed(DB.fame, i); }
  function birth(i) { var y = packed(DB.birth, i); return y ? y + 1800 : 0; }
  function nation(i) { var n = packed(DB.nat, i); return n ? DB.nats[n - 1] : ''; }
  function position(i) { return DB.pos.charAt(i); }

  /* ───────── teams ───────── */

  function undelta(s) {
    var prev = 0;
    return s ? s.split(',').map(function (d) { prev += parseInt(d, 36); return prev; }) : [];
  }

  var teamIndex = null;
  function team(key) {
    if (!teamIndex) {
      teamIndex = {};
      DB.teams.forEach(function (t) { teamIndex[t.k] = t; });
    }
    var t = teamIndex[key];
    if (!t) return null;
    if (!t._set) {
      t._list = undelta(t.m);
      t._set = new Set(t._list);
      t._former = new Map();
      var apps = t.a ? t.a.split(',') : [];
      var goals = t.g !== undefined ? String(t.g).split(',') : [];
      undelta(t.f).forEach(function (p, n) {
        t._former.set(p, { apps: parseInt(apps[n], 36), goals: goals[n] === '' || goals[n] === undefined ? -1 : parseInt(goals[n], 36) });
      });
    }
    return t;
  }
  function teamName(key) { var t = team(key); return t ? t.n : key; }
  function teamKeys() { return DB.teams.map(function (t) { return t.k; }); }

  /* ───────── question sets (Pointless, LONGSHOTS) ───────── */

  var NATION_WORD = {
    eng: 'England', sco: 'Scotland', wal: 'Wales', nir: 'Northern Ireland', irl: 'Republic of Ireland',
    bra: 'Brazil', arg: 'Argentina', fra: 'France', ger: 'Germany', esp: 'Spain', ita: 'Italy', ned: 'Netherlands',
    por: 'Portugal', bel: 'Belgium', den: 'Denmark', nor: 'Norway', swe: 'Sweden', cro: 'Croatia', uru: 'Uruguay',
    usa: 'United States', nga: 'Nigeria', civ: 'Ivory Coast', sen: 'Senegal', gha: 'Ghana', cmr: 'Cameroon',
    jam: 'Jamaica', aus: 'Australia', kor: 'South Korea', jpn: 'Japan'
  };

  function setText(s) {
    switch (s.t) {
      case 'both': return 'Played for both ' + teamName(s.a) + ' and ' + teamName(s.b);
      case 'nt': return (NATION_WORD[s.b] || teamName(s.b)) + ' internationals who played for ' + teamName(s.a);
      case 'gk': return 'Goalkeepers who played for ' + teamName(s.a);
      case 'club': return 'Played for ' + teamName(s.a);
      default: return '';
    }
  }

  function setMembers(s) {
    var A = team(s.a);
    if (!A) return [];
    if (s.t === 'club') return A._list.slice();
    if (s.t === 'gk') return A._list.filter(function (p) { return position(p) === 'G'; });
    var B = team(s.b);
    if (!B) return [];
    return A._list.filter(function (p) { return B._set.has(p); });
  }

  /* Where each answer sits in its own question's fame order: 0 for the least
     known, 1 for the best known. Ties share a place, so two equally obscure
     players always score the same. */
  function fameRanks(list) {
    var sorted = list.slice().sort(function (a, b) { return fame(a) - fame(b); });
    var out = new Map();
    var n = sorted.length;
    var i = 0;
    while (i < n) {
      var j = i;
      while (j + 1 < n && fame(sorted[j + 1]) === fame(sorted[i])) j++;
      var r = n > 1 ? ((i + j) / 2) / (n - 1) : 1;
      for (var k = i; k <= j; k++) out.set(sorted[k], r);
      i = j + 1;
    }
    return out;
  }

  /* ───────── 501 boards ───────── */

  function boardText(b) {
    var name = teamName(b.a);
    if (b.t === 'caps') return (NATION_WORD[b.a] || name) + ' caps';
    if (b.t === 'goals') return 'League goals for ' + name;
    return 'League appearances for ' + name;
  }

  function boardValue(b, p) {
    var t = team(b.a);
    if (!t) return { kind: 'none' };
    if (!t._set.has(p)) return { kind: 'never' };
    var f = t._former.get(p);
    if (!f) return { kind: 'unknown' };
    var v = b.t === 'goals' ? f.goals : f.apps;
    if (v === null || v === undefined || v < 0) return { kind: 'unknown' };
    return { kind: 'value', value: v };
  }

  /* ───────── search ───────── */

  var kinds = {};

  function entriesFor(kind) {
    if (kinds[kind]) return kinds[kind];
    var list = [];
    if (kind === 'player') {
      players().forEach(function (n, i) {
        var y = birth(i), c = nation(i);
        list.push({ id: i, label: n, sub: (y ? 'b. ' + y : '') + (y && c ? ' \u00b7 ' : '') + c, key: norm(n), fame: fame(i) });
      });
    } else {
      var raw = kind === 'club' ? DB.clubs : kind === 'manager' ? DB.managers : DB.nations;
      (raw ? raw.split('|') : []).forEach(function (s, i) {
        var cut = s.lastIndexOf('~');
        var label = s.slice(0, cut);
        var shown = kind === 'club' ? prettyClub(label) : label;
        var key = kind === 'club' ? clubKey(label) : norm(label);
        var alias = ALIASES[kind] && ALIASES[kind][key];
        list.push({ id: i, label: shown, raw: label, sub: '', key: key,
          extra: alias ? norm(alias.join(' ')) : '', fame: Number(s.slice(cut + 1)) || 0 });
      });
    }
    var buckets = {};
    list.forEach(function (e, n) {
      var words = (e.key + ' ' + (e.extra || '')).split(' ').filter(Boolean);
      e.words = words;
      var seen = {};
      words.forEach(function (w) {
        var b = w.slice(0, 2);
        if (!b || seen[b]) return;
        seen[b] = 1;
        (buckets[b] = buckets[b] || []).push(n);
      });
    });
    kinds[kind] = { list: list, buckets: buckets };
    return kinds[kind];
  }

  /* Keyed by the normalised name, so a relabelled club still finds its nicknames. */
  var ALIASES = {
    nation: {
      'germany': ['West Germany'], 'netherlands': ['Holland'], 'soviet union': ['USSR'], 'united states': ['USA', 'America'],
      'republic of ireland': ['Ireland', 'Eire'], 'ivory coast': ['Cote dIvoire'], 'czech republic': ['Czechia'],
      'south korea': ['Korea Republic']
    },
    club: {
      'manchester united': ['Man Utd', 'Man United'], 'manchester city': ['Man City'], 'tottenham hotspur': ['Spurs'],
      'wolverhampton wanderers': ['Wolves'], 'middlesbrough': ['Boro'], 'barcelona': ['Barca'],
      'paris saint germain': ['PSG'], 'atletico madrid': ['Atleti'], 'juventus': ['Juve'], 'inter milan': ['Internazionale'],
      'steaua bucuresti': ['Steaua Bucharest', 'FCSB'], 'fcsb': ['Steaua Bucharest', 'Steaua Bucuresti'],
      'crvena zvezda': ['Red Star Belgrade', 'Red Star'],
      'west bromwich albion': ['West Brom', 'Baggies'], 'queens park rangers': ['QPR'], 'sporting': ['Sporting Lisbon'],
      'psv eindhoven': ['PSV'], 'hamburger': ['Hamburg']
    }
  };

  function search(kind, query, limit) {
    var q = kind === 'club' ? clubKey(query) || norm(query) : norm(query);
    if (!q) return [];
    var parts = q.split(' ');
    var idx = entriesFor(kind);
    var first = parts[0];
    var pool = first.length >= 2 ? (idx.buckets[first.slice(0, 2)] || []) : null;
    var hits = [];
    var test = function (e) {
      for (var p = 0; p < parts.length; p++) {
        var ok = false;
        for (var w = 0; w < e.words.length; w++) if (e.words[w].indexOf(parts[p]) === 0) { ok = true; break; }
        if (!ok) return false;
      }
      return true;
    };
    var scan = pool ? pool.map(function (n) { return idx.list[n]; }) : idx.list;
    for (var i = 0; i < scan.length; i++) if (test(scan[i])) hits.push(scan[i]);
    hits.sort(function (a, b) {
      var ea = a.key === q ? 1 : 0, eb = b.key === q ? 1 : 0;
      if (ea !== eb) return eb - ea;
      var la = lastStarts(a, first), lb = lastStarts(b, first);
      if (la !== lb) return lb - la;
      return b.fame - a.fame;
    });
    return hits.slice(0, limit || 6);
  }

  /* A surname typed on its own should find the famous surname first. */
  function lastStarts(e, t) {
    var w = e.words;
    return (w[w.length - 1].indexOf(t) === 0 || w[0].indexOf(t) === 0) ? 1 : 0;
  }

  /* Does a chosen entry answer a Top-10 board slot? */
  function same(kind, entry, answer) {
    if (kind === 'club') return clubKey(entry.raw || entry.label) === clubKey(answer);
    return norm(entry.raw || entry.label) === norm(answer);
  }

  g.Footy = {
    norm: norm,
    clubKey: clubKey,
    prettyClub: prettyClub,
    count: count,
    name: name,
    fame: fame,
    birth: birth,
    nation: nation,
    position: position,
    team: team,
    teamName: teamName,
    teamKeys: teamKeys,
    sets: function () { return SETS.sets; },
    boards: function () { return SETS.boards; },
    setText: setText,
    setMembers: setMembers,
    fameRanks: fameRanks,
    boardText: boardText,
    boardValue: boardValue,
    search: search,
    same: same,
    built: DB.built || ''
  };
})(typeof window !== 'undefined' ? window : globalThis);
