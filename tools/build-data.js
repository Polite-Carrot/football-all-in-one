#!/usr/bin/env node
/* build-data.js — the football facts behind 501, Pointless and LONGSHOTS.
 *
 *   node tools/build-data.js          (uses tools/.cache, so re-runs are offline)
 *   node tools/build-data.js --fresh  (re-query everything)
 *
 * Source: Wikidata (CC0), via the public SPARQL endpoint. For every team in
 * TEAMS it reads each player's "member of sports team" statements with their
 * league-appearance, goal and date qualifiers (imported from Wikipedia
 * infoboxes), plus the player's name, birth year, position, nationality and
 * number of Wikipedia language editions — the last is the fame measure that
 * scores Pointless and LONGSHOTS answers.
 *
 * Writes js/data/db.js (players + team memberships) and js/data/categories.js
 * (the curated question sets, chosen here so every one has a sensible size). */

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CACHE = path.join(__dirname, '.cache');
const FRESH = process.argv.includes('--fresh');
const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'FootballAllInOne-databuild/1.0 (Polite Carrot; offline data snapshot)';

/* key, English Wikipedia title, short display name, flags.
   big: used for pair questions; nt: national team (caps). */
const TEAMS = [
  ['arsenal', 'Arsenal F.C.', 'Arsenal', 'big'],
  ['astonvilla', 'Aston Villa F.C.', 'Aston Villa', 'big'],
  ['bournemouth', 'AFC Bournemouth', 'Bournemouth'],
  ['barnsley', 'Barnsley F.C.', 'Barnsley'],
  ['birmingham', 'Birmingham City F.C.', 'Birmingham City'],
  ['blackburn', 'Blackburn Rovers F.C.', 'Blackburn Rovers', 'big'],
  ['blackpool', 'Blackpool F.C.', 'Blackpool'],
  ['bolton', 'Bolton Wanderers F.C.', 'Bolton Wanderers'],
  ['bradford', 'Bradford City A.F.C.', 'Bradford City'],
  ['brentford', 'Brentford F.C.', 'Brentford'],
  ['brighton', 'Brighton & Hove Albion F.C.', 'Brighton'],
  ['burnley', 'Burnley F.C.', 'Burnley'],
  ['cardiff', 'Cardiff City F.C.', 'Cardiff City'],
  ['charlton', 'Charlton Athletic F.C.', 'Charlton Athletic'],
  ['chelsea', 'Chelsea F.C.', 'Chelsea', 'big'],
  ['coventry', 'Coventry City F.C.', 'Coventry City'],
  ['palace', 'Crystal Palace F.C.', 'Crystal Palace', 'big'],
  ['derby', 'Derby County F.C.', 'Derby County'],
  ['everton', 'Everton F.C.', 'Everton', 'big'],
  ['fulham', 'Fulham F.C.', 'Fulham', 'big'],
  ['huddersfield', 'Huddersfield Town A.F.C.', 'Huddersfield Town'],
  ['hull', 'Hull City A.F.C.', 'Hull City'],
  ['ipswich', 'Ipswich Town F.C.', 'Ipswich Town'],
  ['leeds', 'Leeds United F.C.', 'Leeds United', 'big'],
  ['leicester', 'Leicester City F.C.', 'Leicester City', 'big'],
  ['liverpool', 'Liverpool F.C.', 'Liverpool', 'big'],
  ['luton', 'Luton Town F.C.', 'Luton Town'],
  ['mancity', 'Manchester City F.C.', 'Manchester City', 'big'],
  ['manutd', 'Manchester United F.C.', 'Manchester United', 'big'],
  ['middlesbrough', 'Middlesbrough F.C.', 'Middlesbrough', 'big'],
  ['newcastle', 'Newcastle United F.C.', 'Newcastle United', 'big'],
  ['norwich', 'Norwich City F.C.', 'Norwich City'],
  ['forest', 'Nottingham Forest F.C.', 'Nottingham Forest', 'big'],
  ['oldham', 'Oldham Athletic A.F.C.', 'Oldham Athletic'],
  ['portsmouth', 'Portsmouth F.C.', 'Portsmouth'],
  ['qpr', 'Queens Park Rangers F.C.', 'QPR'],
  ['reading', 'Reading F.C.', 'Reading'],
  ['sheffutd', 'Sheffield United F.C.', 'Sheffield United'],
  ['sheffwed', 'Sheffield Wednesday F.C.', 'Sheffield Wednesday'],
  ['southampton', 'Southampton F.C.', 'Southampton', 'big'],
  ['stoke', 'Stoke City F.C.', 'Stoke City'],
  ['sunderland', 'Sunderland A.F.C.', 'Sunderland', 'big'],
  ['swansea', 'Swansea City A.F.C.', 'Swansea City'],
  ['swindon', 'Swindon Town F.C.', 'Swindon Town'],
  ['spurs', 'Tottenham Hotspur F.C.', 'Tottenham Hotspur', 'big'],
  ['watford', 'Watford F.C.', 'Watford'],
  ['westbrom', 'West Bromwich Albion F.C.', 'West Brom'],
  ['westham', 'West Ham United F.C.', 'West Ham United', 'big'],
  ['wigan', 'Wigan Athletic F.C.', 'Wigan Athletic'],
  ['wimbledon', 'Wimbledon F.C.', 'Wimbledon'],
  ['wolves', 'Wolverhampton Wanderers F.C.', 'Wolves'],
  ['celtic', 'Celtic F.C.', 'Celtic', 'big'],
  ['rangers', 'Rangers F.C.', 'Rangers', 'big'],
  ['realmadrid', 'Real Madrid CF', 'Real Madrid', 'big'],
  ['barcelona', 'FC Barcelona', 'Barcelona', 'big'],
  ['atletico', 'Atlético Madrid', 'Atlético Madrid', 'big'],
  ['valencia', 'Valencia CF', 'Valencia'],
  ['sevilla', 'Sevilla FC', 'Sevilla'],
  ['bayern', 'FC Bayern Munich', 'Bayern Munich', 'big'],
  ['dortmund', 'Borussia Dortmund', 'Borussia Dortmund', 'big'],
  ['leverkusen', 'Bayer 04 Leverkusen', 'Bayer Leverkusen'],
  ['juventus', 'Juventus FC', 'Juventus', 'big'],
  ['milan', 'AC Milan', 'AC Milan', 'big'],
  ['inter', 'Inter Milan', 'Inter Milan', 'big'],
  ['roma', 'AS Roma', 'Roma'],
  ['napoli', 'SSC Napoli', 'Napoli'],
  ['lazio', 'S.S. Lazio', 'Lazio'],
  ['psg', 'Paris Saint-Germain F.C.', 'Paris Saint-Germain', 'big'],
  ['marseille', 'Olympique de Marseille', 'Marseille'],
  ['lyon', 'Olympique Lyonnais', 'Lyon'],
  ['monaco', 'AS Monaco FC', 'Monaco'],
  ['ajax', 'AFC Ajax', 'Ajax', 'big'],
  ['psv', 'PSV Eindhoven', 'PSV Eindhoven'],
  ['feyenoord', 'Feyenoord', 'Feyenoord'],
  ['benfica', 'S.L. Benfica', 'Benfica'],
  ['porto', 'FC Porto', 'Porto'],
  ['sporting', 'Sporting CP', 'Sporting CP'],
  ['galatasaray', 'Galatasaray S.K. (football)', 'Galatasaray'],
  ['fenerbahce', 'Fenerbahçe S.K. (football)', 'Fenerbahçe'],
  ['lagalaxy', 'LA Galaxy', 'LA Galaxy'],
  ['intermiami', 'Inter Miami CF', 'Inter Miami'],
  ['alnassr', 'Al-Nassr FC', 'Al-Nassr'],
  ['alhilal', 'Al-Hilal SFC', 'Al-Hilal'],
  ['eng', 'England national football team', 'England', 'nt'],
  ['sco', 'Scotland national football team', 'Scotland', 'nt'],
  ['wal', 'Wales national football team', 'Wales', 'nt'],
  ['nir', 'Northern Ireland national football team', 'Northern Ireland', 'nt'],
  ['irl', 'Republic of Ireland national football team', 'Republic of Ireland', 'nt'],
  ['bra', 'Brazil national football team', 'Brazil', 'nt'],
  ['arg', 'Argentina national football team', 'Argentina', 'nt'],
  ['fra', 'France national football team', 'France', 'nt'],
  ['ger', 'Germany national football team', 'Germany', 'nt'],
  ['esp', 'Spain national football team', 'Spain', 'nt'],
  ['ita', 'Italy national football team', 'Italy', 'nt'],
  ['ned', 'Netherlands national football team', 'Netherlands', 'nt'],
  ['por', 'Portugal national football team', 'Portugal', 'nt'],
  ['bel', 'Belgium national football team', 'Belgium', 'nt'],
  ['den', 'Denmark national football team', 'Denmark', 'nt'],
  ['nor', 'Norway national football team', 'Norway', 'nt'],
  ['swe', 'Sweden national football team', 'Sweden', 'nt'],
  ['cro', 'Croatia national football team', 'Croatia', 'nt'],
  ['uru', 'Uruguay national football team', 'Uruguay', 'nt'],
  ['usa', "United States men's national soccer team", 'United States', 'nt'],
  ['nga', 'Nigeria national football team', 'Nigeria', 'nt'],
  ['civ', 'Ivory Coast national football team', 'Ivory Coast', 'nt'],
  ['sen', 'Senegal national football team', 'Senegal', 'nt'],
  ['gha', 'Ghana national football team', 'Ghana', 'nt'],
  ['cmr', 'Cameroon national football team', 'Cameroon', 'nt'],
  ['jam', 'Jamaica national football team', 'Jamaica', 'nt'],
  ['aus', 'Australia men\'s national soccer team', 'Australia', 'nt'],
  ['kor', 'South Korea national football team', 'South Korea', 'nt'],
  ['jpn', 'Japan national football team', 'Japan', 'nt']
];

/* ─────────────── querying ─────────────── */

fs.mkdirSync(CACHE, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function sparql(key, query) {
  const file = path.join(CACHE, key + '.json');
  if (!FRESH && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/sparql-results+json',
          'User-Agent': UA
        },
        body: 'query=' + encodeURIComponent(query)
      });
      if (res.status === 429 || res.status >= 500) throw new Error('HTTP ' + res.status);
      if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()).slice(0, 400));
      const json = await res.json();
      const rows = json.results.bindings.map(b => {
        const o = {};
        for (const k in b) o[k] = b[k].value;
        return o;
      });
      fs.writeFileSync(file, JSON.stringify(rows));
      await sleep(350);
      return rows;
    } catch (err) {
      if (attempt >= 5) throw new Error(key + ': ' + err.message);
      console.warn('  retry ' + key + ' (' + err.message + ')');
      await sleep(2000 * attempt);
    }
  }
}

const qid = uri => Number(uri.slice(uri.lastIndexOf('/Q') + 2));
const year = iso => (iso && /^\d{4}/.test(iso) ? Number(iso.slice(0, 4)) : 0);
const num = v => (v === undefined || v === '' ? null : Math.round(Number(v)));

/* Titles go through the Wikipedia API rather than SPARQL so renamed
   articles (PSG's "F.C." became "FC") still resolve through their redirects. */
async function resolveTeams() {
  const file = path.join(CACHE, 'teams.json');
  let map = !FRESH && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  if (!map) {
    map = {};
    for (let i = 0; i < TEAMS.length; i += 40) {
      const titles = TEAMS.slice(i, i + 40).map(t => t[1]);
      const url = 'https://en.wikipedia.org/w/api.php?action=query&redirects=1&prop=pageprops' +
        '&ppprop=wikibase_item&format=json&formatversion=2&titles=' + encodeURIComponent(titles.join('|'));
      const json = await (await fetch(url, { headers: { 'User-Agent': UA } })).json();
      const via = new Map();
      for (const n of json.query.normalized || []) via.set(n.to, n.from);
      for (const r of json.query.redirects || []) via.set(r.to, via.get(r.from) || r.from);
      for (const page of json.query.pages) {
        const asked = via.get(page.title) || page.title;
        if (page.pageprops && page.pageprops.wikibase_item) map[asked] = Number(page.pageprops.wikibase_item.slice(1));
      }
    }
    fs.writeFileSync(file, JSON.stringify(map));
  }
  const missing = TEAMS.filter(t => !map[t[1]]);
  if (missing.length) throw new Error('No Wikidata item for: ' + missing.map(t => t[1]).join(', '));
  return TEAMS.map(([key, title, name, flags]) => ({ key, title, name, q: map[title], nt: flags === 'nt', big: flags === 'big' }));
}

async function spells(team) {
  return sparql('spells-' + team.key, `SELECT ?p ?st ?apps ?goals ?start ?end WHERE {
    ?p p:P54 ?st . ?st ps:P54 wd:Q${team.q} .
    ?p wdt:P31 wd:Q5 .
    OPTIONAL { ?st pq:P1350 ?apps }
    OPTIONAL { ?st pq:P1351 ?goals }
    OPTIONAL { ?st pq:P580 ?start }
    OPTIONAL { ?st pq:P582 ?end }
  }`);
}

async function playerInfo(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 350) {
    const batch = ids.slice(i, i + 350);
    const rows = await sparql('info-' + batch[0] + '-' + batch.length, `SELECT ?p ?label (SAMPLE(?b) AS ?birth) (SAMPLE(?l) AS ?links)
      (GROUP_CONCAT(DISTINCT ?posL; separator="|") AS ?pos) (GROUP_CONCAT(DISTINCT ?natL; separator="|") AS ?nat)
      (GROUP_CONCAT(DISTINCT ?citL; separator="|") AS ?cit) WHERE {
      VALUES ?p { ${batch.map(q => 'wd:Q' + q).join(' ')} }
      OPTIONAL { ?p rdfs:label ?label FILTER(LANG(?label) = "en") }
      OPTIONAL { ?p wdt:P569 ?b }
      OPTIONAL { ?p wikibase:sitelinks ?l }
      OPTIONAL { ?p wdt:P413 ?posI . ?posI rdfs:label ?posL FILTER(LANG(?posL) = "en") }
      OPTIONAL { ?p wdt:P1532 ?natI . ?natI rdfs:label ?natL FILTER(LANG(?natL) = "en") }
      OPTIONAL { ?p wdt:P27 ?citI . ?citI rdfs:label ?citL FILTER(LANG(?citL) = "en") }
    } GROUP BY ?p ?label`);
    out.push(...rows);
    process.stdout.write('\r  player info ' + Math.min(i + 350, ids.length) + '/' + ids.length);
  }
  process.stdout.write('\n');
  return out;
}

/* Clubs and managers the Top-10 lists can be answered with: searchable
   decoys as well as answers, so a suggestion never gives the answer away.
   Wikidata keeps many names only under "mul" (all languages), so that is
   the fallback when there is no English label. */
async function directories() {
  const clubs = await sparql('dir-clubs-v2', `SELECT ?c ?label ?links WHERE {
    ?c wdt:P31 wd:Q476028 ; wikibase:sitelinks ?links . FILTER(?links >= 28)
    OPTIONAL { ?c rdfs:label ?en FILTER(LANG(?en) = "en") }
    OPTIONAL { ?c rdfs:label ?mul FILTER(LANG(?mul) = "mul") }
    BIND(COALESCE(?en, ?mul) AS ?label) FILTER(BOUND(?label))
  }`);
  const managers = await sparql('dir-managers-v2', `SELECT ?m ?label ?links WHERE {
    ?m wdt:P106 wd:Q628099 ; wikibase:sitelinks ?links . FILTER(?links >= 18)
    OPTIONAL { ?m rdfs:label ?en FILTER(LANG(?en) = "en") }
    OPTIONAL { ?m rdfs:label ?mul FILTER(LANG(?mul) = "mul") }
    BIND(COALESCE(?en, ?mul) AS ?label) FILTER(BOUND(?label))
  }`);
  return { clubs, managers };
}

/* Labels for players with no English one (Sergio Ramos is filed under "mul"). */
async function fallbackLabels(ids) {
  const out = new Map();
  const rank = { mul: 0, 'en-gb': 1, 'en-ca': 2, 'en-us': 3 };
  for (let i = 0; i < ids.length; i += 350) {
    const batch = ids.slice(i, i + 350);
    const rows = await sparql('labels-' + batch[0] + '-' + batch.length, `SELECT ?p ?label (LANG(?label) AS ?lang) WHERE {
      VALUES ?p { ${batch.map(q => 'wd:Q' + q).join(' ')} }
      ?p rdfs:label ?label FILTER(LANG(?label) IN ("mul", "en-gb", "en-ca", "en-us"))
    }`);
    for (const r of rows) {
      const q = qid(r.p), had = out.get(q);
      if (!had || rank[r.lang] < had.rank) out.set(q, { label: r.label, rank: rank[r.lang] });
    }
  }
  return new Map([...out].map(([q, v]) => [q, v.label]));
}

/* Countries, written out: Wikidata files senior national teams under
   several classes, and the names people type are the plain ones. The first
   group ranks higher in suggestions. */
const NATIONS_MAJOR = ['England', 'Brazil', 'Germany', 'Argentina', 'France', 'Italy', 'Spain', 'Netherlands', 'Portugal',
  'Belgium', 'Uruguay', 'Croatia', 'Scotland', 'Wales', 'Northern Ireland', 'Republic of Ireland', 'United States', 'Mexico',
  'Denmark', 'Sweden', 'Norway', 'Switzerland', 'Austria', 'Poland', 'Czech Republic', 'Hungary', 'Russia', 'Ukraine',
  'Turkey', 'Greece', 'Serbia', 'Romania', 'Bulgaria', 'Colombia', 'Chile', 'Peru', 'Paraguay', 'Ecuador', 'Japan',
  'South Korea', 'Australia', 'Nigeria', 'Ghana', 'Senegal', 'Cameroon', 'Ivory Coast', 'Morocco', 'Egypt', 'Algeria',
  'Tunisia', 'Saudi Arabia', 'Iran', 'Canada', 'Costa Rica', 'Jamaica', 'Soviet Union', 'Czechoslovakia', 'Yugoslavia',
  'West Germany', 'East Germany'];
const NATIONS_OTHER = ['Afghanistan', 'Albania', 'American Samoa', 'Andorra', 'Angola', 'Anguilla', 'Antigua and Barbuda',
  'Armenia', 'Aruba', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belize', 'Benin', 'Bermuda',
  'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'British Virgin Islands', 'Brunei', 'Burkina Faso', 'Burundi',
  'Cambodia', 'Cape Verde', 'Cayman Islands', 'Central African Republic', 'Chad', 'China', 'Chinese Taipei', 'Comoros',
  'Congo', 'Cook Islands', 'Cuba', 'Cura\u00e7ao', 'Cyprus', 'DR Congo', 'Djibouti', 'Dominica', 'Dominican Republic',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Faroe Islands', 'Fiji', 'Finland',
  'Gabon', 'Gambia', 'Georgia', 'Gibraltar', 'Grenada', 'Guam', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti',
  'Honduras', 'Hong Kong', 'Iceland', 'India', 'Indonesia', 'Iraq', 'Israel', 'Jordan', 'Kazakhstan', 'Kenya', 'Kosovo',
  'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Macau', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Mauritania', 'Mauritius',
  'Moldova', 'Mongolia', 'Montenegro', 'Montserrat', 'Mozambique', 'Myanmar', 'Namibia', 'Nepal', 'New Caledonia',
  'New Zealand', 'Nicaragua', 'Niger', 'North Korea', 'North Macedonia', 'Oman', 'Pakistan', 'Palestine', 'Panama',
  'Papua New Guinea', 'Philippines', 'Puerto Rico', 'Qatar', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
  'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'S\u00e3o Tom\u00e9 and Pr\u00edncipe', 'Seychelles',
  'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan',
  'Sri Lanka', 'Sudan', 'Suriname', 'Syria', 'Tahiti', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Turkmenistan', 'Turks and Caicos Islands', 'Uganda', 'United Arab Emirates', 'US Virgin Islands',
  'Uzbekistan', 'Vanuatu', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe', 'Zaire', 'Serbia and Montenegro',
  'Dutch East Indies'];

/* 501 boards come from these teams only: the clubs and national sides most
   players can name a dozen former players of. */
const BOARD_TEAMS = new Set(['arsenal', 'astonvilla', 'blackburn', 'chelsea', 'palace', 'everton', 'fulham', 'leeds',
  'leicester', 'liverpool', 'mancity', 'manutd', 'middlesbrough', 'newcastle', 'forest', 'southampton', 'sunderland',
  'spurs', 'westham', 'celtic', 'rangers', 'realmadrid', 'barcelona', 'juventus', 'milan', 'inter', 'bayern',
  'eng', 'sco', 'wal', 'nir', 'irl']);

/* ─────────────── shaping ─────────────── */

const NOW = 2026;

/* Wikidata sometimes labels a player by his full registered name; show the
   name fans use. */
const LABEL_FIX = {
  'Juan Mata Pata': 'Juan Mata', 'Mikel John Obi': 'John Obi Mikel', 'Daniel Alves': 'Dani Alves',
  'Xavi Hern\u00e1ndez': 'Xavi', 'Jos\u00e9 Kl\u00e9berson': 'Kl\u00e9berson', 'Alan Ball Jr.': 'Alan Ball',
  'Marcelo Vieira': 'Marcelo'
};

/* Players whose club history is missing from Wikidata, added by hand so the
   games do not mark them wrong. Memberships only: no 501 numbers. */
const PATCHES = [
  { q: 5670856, teams: ['sheffutd', 'hull', 'wigan', 'leicester', 'manutd', 'eng'] } // Harry Maguire
];

function classify(posLabels) {
  const p = posLabels.toLowerCase();
  if (/goalkeeper/.test(p)) return 'G';
  if (/forward|striker|winger|attacker/.test(p)) return 'F';
  if (/midfield|wing half|playmaker/.test(p)) return 'M';
  if (/defender|back|sweeper|libero/.test(p)) return 'D';
  return '';
}

/* One player's spells at one team, folded together. Apps are only trusted
   when every spell has them and every spell has ended: that is what 501
   scores with, and a current player's total goes stale. */
function fold(rows) {
  const byStatement = new Map();
  for (const r of rows) if (!byStatement.has(r.st)) byStatement.set(r.st, r);
  let apps = 0, goals = 0, appsKnown = true, goalsKnown = true, ended = true, allZero = true;
  let last = 0, first = 9999;
  for (const r of byStatement.values()) {
    const a = num(r.apps), g = num(r.goals);
    if (a === null) appsKnown = false; else apps += a;
    if (g === null) goalsKnown = false; else goals += g;
    if (a === null || a > 0) allZero = false;
    if (!r.end) ended = false;
    const s = year(r.start), e = year(r.end);
    if (s) first = Math.min(first, s);
    last = Math.max(last, e || s || 0);
    if (!r.end && s) last = Math.max(last, NOW);
  }
  return { apps: appsKnown ? apps : null, goals: goalsKnown ? goals : null, ended, allZero, first, last };
}

async function main() {
  const teams = await resolveTeams();
  console.log(teams.length + ' teams');

  /* player -> team key -> folded spell */
  const rowsBy = new Map();
  for (const t of teams) {
    const rows = await spells(t);
    if (!rows.length) { console.warn('  ! no spells for ' + t.title + ' — dropped'); t.empty = true; continue; }
    for (const r of rows) {
      const q = qid(r.p);
      if (!rowsBy.has(q)) rowsBy.set(q, new Map());
      const m = rowsBy.get(q);
      if (!m.has(t.key)) m.set(t.key, []);
      m.get(t.key).push(r);
    }
  }
  const live = teams.filter(t => !t.empty);
  const ids = [...rowsBy.keys()].sort((a, b) => a - b);
  console.log(ids.length + ' players with spells');
  const info = new Map((await playerInfo(ids)).map(r => [qid(r.p), r]));
  const unlabelled = [...info.values()].filter(r => !r.label).map(r => qid(r.p)).sort((a, b) => a - b);
  const extra = await fallbackLabels(unlabelled);
  for (const [q, label] of extra) info.get(q).label = label;
  console.log('  ' + extra.size + '/' + unlabelled.length + ' players labelled from mul/en-*');

  /* Hand patches go in after the main lookup, in a batch of their own, so
     adding one does not shift (and invalidate) every cached batch. */
  const patchIds = PATCHES.map(p => p.q).filter(q => !info.has(q));
  if (patchIds.length) for (const r of await playerInfo(patchIds)) info.set(qid(r.p), r);
  for (const patch of PATCHES) {
    if (!rowsBy.has(patch.q)) { rowsBy.set(patch.q, new Map()); ids.push(patch.q); }
    for (const key of patch.teams) {
      const m = rowsBy.get(patch.q);
      if (!m.has(key)) m.set(key, [{ p: 'Q' + patch.q, st: 'patch-' + key, start: '2010-01-01T00:00:00Z' }]);
    }
  }

  /* Who goes in the searchable directory. Everyone active since 1965, plus
     undated players born since 1945, plus older names people still know. */
  const players = [];
  for (const q of ids) {
    const i = info.get(q);
    if (!i || !i.label || /^Q\d+$/.test(i.label)) continue;
    const spellsAt = new Map([...rowsBy.get(q)].map(([k, rows]) => [k, fold(rows)]));
    const last = Math.max(...[...spellsAt.values()].map(s => s.last));
    const birth = year(i.birth);
    const fame = Number(i.links || 0);
    const keep = last >= 1965 || (!last && (birth >= 1945 || fame >= 8)) || fame >= 20;
    if (!keep) continue;
    const nat = (i.nat || i.cit || '').split('|').filter(Boolean)[0] || '';
    const label = i.label.trim();
    players.push({ q, name: LABEL_FIX[label] || label, birth, fame, nat, pos: classify(i.pos || ''), spellsAt });
  }
  /* Famous first: the search lists the likeliest player first among equal matches. */
  players.sort((a, b) => b.fame - a.fame || a.name.localeCompare(b.name));
  console.log(players.length + ' players in the directory');

  /* ── team memberships ── */
  const teamOut = live.map(t => {
    const members = [], apps = [], goals = [], former = [];
    players.forEach((p, n) => {
      const s = p.spellsAt.get(t.key);
      if (!s || s.allZero) return;
      members.push(n);
      if (BOARD_TEAMS.has(t.key) && s.ended && s.apps !== null && s.apps > 0) {
        former.push(n); apps.push(s.apps); goals.push(s.goals === null ? -1 : s.goals);
      }
    });
    return { k: t.key, n: t.name, nt: t.nt ? 1 : 0, big: t.big ? 1 : 0, members, former, apps, goals };
  });

  /* ── question sets ── */
  const cats = [];
  const size = (a, b) => a.filter(x => b.has(x)).length;
  const big = teamOut.filter(t => t.big);
  const nts = teamOut.filter(t => t.nt);
  for (let i = 0; i < big.length; i++) {
    for (let j = i + 1; j < big.length; j++) {
      const A = big[i], B = big[j];
      const n = size(A.members, new Set(B.members));
      if (n >= 10 && n <= 160) cats.push({ id: 'both-' + A.k + '-' + B.k, t: 'both', a: A.k, b: B.k, n });
    }
  }
  for (const club of big) {
    const set = new Set(club.members);
    for (const nt of nts) {
      const n = size(nt.members, set);
      if (n >= 10 && n <= 160) cats.push({ id: 'nt-' + nt.k + '-' + club.k, t: 'nt', a: club.k, b: nt.k, n });
    }
    const keepers = club.members.filter(x => players[x].pos === 'G').length;
    if (keepers >= 12) cats.push({ id: 'gk-' + club.k, t: 'gk', a: club.k, n: keepers });
  }
  for (const club of teamOut.filter(t => !t.nt)) {
    if (club.members.length >= 150) cats.push({ id: 'club-' + club.k, t: 'club', a: club.k, n: club.members.length });
  }
  /* 501 boards: enough former players with a usable number, and enough of
     them under 180 to finish on. */
  const boards = [];
  for (const t of teamOut.filter(x => BOARD_TEAMS.has(x.k))) {
    const under = t.apps.filter(v => v <= 180).length;
    if (t.former.length >= 80 && under >= 60) boards.push({ id: 'apps-' + t.k, t: t.nt ? 'caps' : 'apps', a: t.k, n: t.former.length });
    const goalsUsable = t.goals.filter(v => v > 0).length;
    if (!t.nt && t.big && goalsUsable >= 60) boards.push({ id: 'goals-' + t.k, t: 'goals', a: t.k, n: goalsUsable });
  }
  console.log(cats.length + ' Pointless/LONGSHOTS sets, ' + boards.length + ' 501 boards');

  /* ── directories for the Top-10 lists ── */
  const dirs = await directories();
  const tidy = s => s.replace(/\s*\((football|soccer)( club)?\)$/i, '').trim();
  const notFirstTeam = /women|ladies|w\.?f\.?c|femen|frauen|feminin|reserve|futsal|beach|\bjong\b|\bII\b|\bB\b|\bU-?\d\d|under-\d|youth|academy/i;
  const clubs = [...new Map(dirs.clubs
    .filter(r => !/^Q\d+$/.test(r.label) && !notFirstTeam.test(r.label))
    .sort((a, b) => b.links - a.links)
    .map(r => [tidy(r.label), Number(r.links)])).entries()];
  const managers = [...new Map(dirs.managers
    .filter(r => !/^Q\d+$/.test(r.label) && Number(r.links) >= 25)
    .sort((a, b) => b.links - a.links)
    .map(r => [r.label.trim(), Number(r.links)])).entries()];
  const nations = NATIONS_MAJOR.map(n => [n, 10]).concat(NATIONS_OTHER.map(n => [n, 1]));

  /* ── write ──
     Per-player numbers are fixed-width base-36 strings (two characters
     each), team lists are delta-encoded: a third of the size of JSON arrays. */
  const natList = [...new Set(players.map(p => p.nat).filter(Boolean))].sort();
  const natIndex = new Map(natList.map((n, i) => [n, i]));
  const b36 = (v, w) => Math.max(0, Math.min(Math.pow(36, w) - 1, v)).toString(36).padStart(w, '0');
  const delta = list => {
    let prev = 0;
    return list.map(v => { const d = v - prev; prev = v; return d.toString(36); }).join(',');
  };
  const db = {
    v: 2,
    built: new Date().toISOString().slice(0, 10),
    names: players.map(p => p.name.replace(/\|/g, '/')).join('|'),
    birth: players.map(p => b36(p.birth ? p.birth - 1800 : 0, 2)).join(''),
    fame: players.map(p => b36(p.fame, 2)).join(''),
    nat: players.map(p => b36(natIndex.has(p.nat) ? natIndex.get(p.nat) + 1 : 0, 2)).join(''),
    pos: players.map(p => p.pos || '-').join(''),
    nats: natList,
    teams: teamOut.map(t => ({
      k: t.k, n: t.n, nt: t.nt, big: t.big, m: delta(t.members),
      f: delta(t.former), a: t.apps.map(v => v.toString(36)).join(','),
      g: t.goals.map(v => (v < 0 ? '' : v.toString(36))).join(',')
    })),
    clubs: clubs.map(([n, f]) => n + '~' + f).join('|'),
    managers: managers.map(([n, f]) => n + '~' + f).join('|'),
    nations: nations.map(([n, f]) => n + '~' + f).join('|')
  };
  const header = '/* GENERATED by tools/build-data.js from Wikidata (CC0) — do not edit by hand. */\n';
  fs.mkdirSync(path.join(ROOT, 'js/data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'js/data/db.js'), header + 'window.FA_DB=' + JSON.stringify(db) + ';\n');
  fs.writeFileSync(path.join(ROOT, 'js/data/categories.js'), header +
    'window.FA_SETS=' + JSON.stringify({ sets: cats, boards }) + ';\n');
  const kb = f => (fs.statSync(path.join(ROOT, f)).size / 1024).toFixed(0) + ' KB';
  console.log('wrote js/data/db.js (' + kb('js/data/db.js') + '), js/data/categories.js (' + kb('js/data/categories.js') + ')');
  console.log(clubs.length + ' clubs, ' + managers.length + ' managers, ' + nations.length + ' nations in the list directories');
}

module.exports = { TEAMS, sparql, resolveTeams, spells, playerInfo, directories, qid, year, num, ROOT };

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}
