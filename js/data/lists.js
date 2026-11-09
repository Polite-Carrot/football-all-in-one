/* lists.js — the Top-10 boards for Football Tenable and Tension.
 *
 * Only closed, historical facts: nothing here can change with a new season,
 * so a board never goes stale. Every answer is written as it appears in the
 * search directory (js/data/db.js); test/content.test.js checks that each one
 * can be found there.
 *
 * Each board: id, question, answer type (player | club | nation | manager),
 * and ten [slot, answer] pairs in board order. `slot` labels the place on the
 * board; `kill` phrases a slot as a Tension killer ("the 2004 winner").
 * `unranked` boards have no meaningful order, so Tension never uses them. */
(function (g) {
  'use strict';

  var XI = 'the {s}';

  g.FA_LISTS = [
    { id: 'bdo-2000s', q: "Ballon d'Or winners, 2000\u20132009", type: 'player', kill: 'the {s} winner', a: [
      ['2000', 'Lu\u00eds Figo'], ['2001', 'Michael Owen'], ['2002', 'Ronaldo'], ['2003', 'Pavel Nedv\u011bd'],
      ['2004', 'Andriy Shevchenko'], ['2005', 'Ronaldinho'], ['2006', 'Fabio Cannavaro'], ['2007', 'Kak\u00e1'],
      ['2008', 'Cristiano Ronaldo'], ['2009', 'Lionel Messi']] },

    { id: 'bdo-1990s', q: "Ballon d'Or winners, 1990\u20131999", type: 'player', kill: 'the {s} winner', a: [
      ['1990', 'Lothar Matth\u00e4us'], ['1991', 'Jean-Pierre Papin'], ['1992', 'Marco van Basten'], ['1993', 'Roberto Baggio'],
      ['1994', 'Hristo Stoichkov'], ['1995', 'George Weah'], ['1996', 'Matthias Sammer'], ['1997', 'Ronaldo'],
      ['1998', 'Zinedine Zidane'], ['1999', 'Rivaldo']] },

    { id: 'boot-first10', q: 'Every player to win or share the Premier League Golden Boot in its first ten seasons (1992\u201393 to 2001\u201302)', type: 'player', kill: 'the {s} winner', a: [
      ['1992\u201393', 'Teddy Sheringham'], ['1993\u201394', 'Andy Cole'], ['1994\u201395', 'Alan Shearer'],
      ['1997\u201398', 'Michael Owen'], ['1997\u201398', 'Dion Dublin'], ['1997\u201398', 'Chris Sutton'],
      ['1998\u201399', 'Jimmy Floyd Hasselbaink'], ['1998\u201399', 'Dwight Yorke'], ['1999\u20132000', 'Kevin Phillips'],
      ['2001\u201302', 'Thierry Henry']], note: 'Slot shows each player\u2019s first Golden Boot.' },

    { id: 'boot-2003-15', q: 'Every winner or joint winner of the Premier League Golden Boot from 2002\u201303 to 2014\u201315', type: 'player', kill: 'the {s} winner', a: [
      ['2002\u201303', 'Ruud van Nistelrooy'], ['2003\u201304', 'Thierry Henry'], ['2006\u201307', 'Didier Drogba'],
      ['2007\u201308', 'Cristiano Ronaldo'], ['2008\u201309', 'Nicolas Anelka'], ['2010\u201311', 'Dimitar Berbatov'],
      ['2010\u201311', 'Carlos Tevez'], ['2011\u201312', 'Robin van Persie'], ['2013\u201314', 'Luis Su\u00e1rez'],
      ['2014\u201315', 'Sergio Ag\u00fcero']], note: 'Slot shows each player\u2019s first Golden Boot in the period.' },

    { id: 'pl-top-scorers', q: "The Premier League's ten highest scorers of all time", type: 'player', unranked: true, a: [
      ['', 'Alan Shearer'], ['', 'Harry Kane'], ['', 'Wayne Rooney'], ['', 'Andy Cole'], ['', 'Mohamed Salah'],
      ['', 'Sergio Ag\u00fcero'], ['', 'Frank Lampard'], ['', 'Thierry Henry'], ['', 'Robbie Fowler'], ['', 'Jermain Defoe']],
      note: 'Any order.' },

    { id: 'pfa-2000-11', q: "PFA Players' Player of the Year winners, 2000\u20132011", type: 'player', kill: 'the {s} winner', a: [
      ['2000', 'Roy Keane'], ['2001', 'Teddy Sheringham'], ['2002', 'Ruud van Nistelrooy'], ['2003', 'Thierry Henry'],
      ['2005', 'John Terry'], ['2006', 'Steven Gerrard'], ['2007', 'Cristiano Ronaldo'], ['2009', 'Ryan Giggs'],
      ['2010', 'Wayne Rooney'], ['2011', 'Gareth Bale']], note: 'Henry also won in 2004, Ronaldo in 2008.' },

    { id: 'wc-boot-82-14', q: 'World Cup top scorers (Golden Boot), 1982\u20132014', type: 'player', kill: 'the {s} winner', a: [
      ['1982', 'Paolo Rossi'], ['1986', 'Gary Lineker'], ['1990', 'Salvatore Schillaci'], ['1994', 'Hristo Stoichkov'],
      ['1994', 'Oleg Salenko'], ['1998', 'Davor \u0160uker'], ['2002', 'Ronaldo'], ['2006', 'Miroslav Klose'],
      ['2010', 'Thomas M\u00fcller'], ['2014', 'James Rodr\u00edguez']] },

    { id: 'wc-final-scorers', q: 'Every goalscorer in a World Cup final from 2002 to 2018 (shootouts excluded)', type: 'player', kill: 'the {s} scorer', a: [
      ['2002', 'Ronaldo'], ['2006', 'Zinedine Zidane'], ['2006', 'Marco Materazzi'], ['2010', 'Andr\u00e9s Iniesta'],
      ['2014', 'Mario G\u00f6tze'], ['2018', 'Mario Mand\u017euki\u0107'], ['2018', 'Ivan Peri\u0161i\u0107'],
      ['2018', 'Antoine Griezmann'], ['2018', 'Paul Pogba'], ['2018', 'Kylian Mbapp\u00e9']] },

    { id: 'wc-captains', q: 'World Cup-winning captains, 1974\u20132010', type: 'player', kill: 'the {s} captain', a: [
      ['1974', 'Franz Beckenbauer'], ['1978', 'Daniel Passarella'], ['1982', 'Dino Zoff'], ['1986', 'Diego Maradona'],
      ['1990', 'Lothar Matth\u00e4us'], ['1994', 'Dunga'], ['1998', 'Didier Deschamps'], ['2002', 'Cafu'],
      ['2006', 'Fabio Cannavaro'], ['2010', 'Iker Casillas']] },

    { id: 'wc-managers', q: 'World Cup-winning managers, 1978\u20132014', type: 'manager', kill: 'the {s} winner', a: [
      ['1978', 'C\u00e9sar Luis Menotti'], ['1982', 'Enzo Bearzot'], ['1986', 'Carlos Bilardo'], ['1990', 'Franz Beckenbauer'],
      ['1994', 'Carlos Alberto Parreira'], ['1998', 'Aim\u00e9 Jacquet'], ['2002', 'Luiz Felipe Scolari'], ['2006', 'Marcello Lippi'],
      ['2010', 'Vicente del Bosque'], ['2014', 'Joachim L\u00f6w']] },

    { id: 'pl-managers', q: 'The first ten managers to win the Premier League', type: 'manager', kill: 'the {s} champion', a: [
      ['1992\u201393', 'Alex Ferguson'], ['1994\u201395', 'Kenny Dalglish'], ['1997\u201398', 'Ars\u00e8ne Wenger'],
      ['2004\u201305', 'Jos\u00e9 Mourinho'], ['2009\u201310', 'Carlo Ancelotti'], ['2011\u201312', 'Roberto Mancini'],
      ['2013\u201314', 'Manuel Pellegrini'], ['2015\u201316', 'Claudio Ranieri'], ['2016\u201317', 'Antonio Conte'],
      ['2017\u201318', 'Pep Guardiola']] },

    { id: 'cl-managers', q: 'Champions League-winning managers, 2000\u20132013', type: 'manager', kill: 'the {s} winner', a: [
      ['2000', 'Vicente del Bosque'], ['2001', 'Ottmar Hitzfeld'], ['2003', 'Carlo Ancelotti'], ['2004', 'Jos\u00e9 Mourinho'],
      ['2005', 'Rafa Ben\u00edtez'], ['2006', 'Frank Rijkaard'], ['2008', 'Alex Ferguson'], ['2009', 'Pep Guardiola'],
      ['2012', 'Roberto Di Matteo'], ['2013', 'Jupp Heynckes']], note: 'Slot shows each manager\u2019s first win in the period.' },

    { id: 'eng-managers', q: "England's permanent managers between 1990 and 2024", type: 'manager', kill: 'the man appointed in {s}', a: [
      ['1990', 'Graham Taylor'], ['1994', 'Terry Venables'], ['1996', 'Glenn Hoddle'], ['1999', 'Kevin Keegan'],
      ['2001', 'Sven-G\u00f6ran Eriksson'], ['2006', 'Steve McClaren'], ['2008', 'Fabio Capello'], ['2012', 'Roy Hodgson'],
      ['2016', 'Sam Allardyce'], ['2016', 'Gareth Southgate']], note: 'Caretakers not included.' },

    { id: 'cl-first-clubs', q: 'The first ten different clubs to win the Champions League (from 1992\u201393)', type: 'club', kill: 'the {s} winner', a: [
      ['1993', 'Olympique de Marseille'], ['1994', 'AC Milan'], ['1995', 'AFC Ajax'], ['1996', 'Juventus FC'],
      ['1997', 'Borussia Dortmund'], ['1998', 'Real Madrid CF'], ['1999', 'Manchester United F.C.'],
      ['2001', 'FC Bayern Munich'], ['2004', 'FC Porto'], ['2005', 'Liverpool F.C.']] },

    { id: 'ec-1980-91', q: 'European Cup winners, 1980\u20131991 (ten different clubs)', type: 'club', kill: 'the {s} winner', a: [
      ['1980', 'Nottingham Forest F.C.'], ['1981', 'Liverpool F.C.'], ['1982', 'Aston Villa F.C.'], ['1983', 'Hamburger SV'],
      ['1985', 'Juventus FC'], ['1986', 'FCSB'], ['1987', 'FC Porto'], ['1988', 'PSV Eindhoven'],
      ['1989', 'AC Milan'], ['1991', 'FK Crvena zvezda']], note: 'Liverpool won again in 1984, Milan in 1990.' },

    { id: 'uefa-cup-00s', q: 'UEFA Cup / Europa League winners, 2000\u20132010 (ten different clubs)', type: 'club', kill: 'the {s} winner', a: [
      ['2000', 'Galatasaray S.K.'], ['2001', 'Liverpool F.C.'], ['2002', 'Feyenoord Rotterdam'], ['2003', 'FC Porto'],
      ['2004', 'Valencia CF'], ['2005', 'PFC CSKA Moscow'], ['2006', 'Sevilla FC'], ['2008', 'FC Zenit Saint Petersburg'],
      ['2009', 'FC Shakhtar Donetsk'], ['2010', 'Atl\u00e9tico Madrid']], note: 'Sevilla won again in 2007.' },

    { id: 'euro-winners', q: 'The ten nations to have won the European Championship', type: 'nation', kill: 'the {s} winner', a: [
      ['1960', 'Soviet Union'], ['1964', 'Spain'], ['1968', 'Italy'], ['1972', 'Germany'], ['1976', 'Czechoslovakia'],
      ['1984', 'France'], ['1988', 'Netherlands'], ['1992', 'Denmark'], ['2004', 'Greece'], ['2016', 'Portugal']],
      note: 'Slot shows each nation\u2019s first title. Germany won as West Germany in 1972.' },

    { id: 'wc-hosts', q: 'World Cup hosts, 1930\u20131974', type: 'nation', kill: 'the {s} host', a: [
      ['1930', 'Uruguay'], ['1934', 'Italy'], ['1938', 'France'], ['1950', 'Brazil'], ['1954', 'Switzerland'],
      ['1958', 'Sweden'], ['1962', 'Chile'], ['1966', 'England'], ['1970', 'Mexico'], ['1974', 'Germany']],
      note: 'Germany hosted as West Germany in 1974.' },

    { id: 'eng-1966', q: "England's 1966 World Cup final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right-back', 'George Cohen'], ['centre-back', 'Jack Charlton'], ['captain', 'Bobby Moore'], ['left-back', 'Ray Wilson'],
      ['holding midfielder', 'Nobby Stiles'], ['right midfielder', 'Alan Ball'], ['playmaker', 'Bobby Charlton'],
      ['left midfielder', 'Martin Peters'], ['No. 21 striker', 'Roger Hunt'], ['hat-trick hero', 'Geoff Hurst']] },

    { id: 'mufc-1999', q: "Manchester United's 1999 Champions League final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right-back', 'Gary Neville'], ['centre-back', 'Ronny Johnsen'], ['centre-back', 'Jaap Stam'], ['left-back', 'Denis Irwin'],
      ['right winger', 'Ryan Giggs'], ['central midfielder', 'David Beckham'], ['central midfielder', 'Nicky Butt'],
      ['left winger', 'Jesper Blomqvist'], ['striker', 'Dwight Yorke'], ['striker', 'Andy Cole']] },

    { id: 'mufc-2008', q: "Manchester United's 2008 Champions League final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right-back', 'Wes Brown'], ['centre-back', 'Rio Ferdinand'], ['centre-back', 'Nemanja Vidi\u0107'], ['left-back', 'Patrice Evra'],
      ['right midfielder', 'Owen Hargreaves'], ['central midfielder', 'Michael Carrick'], ['central midfielder', 'Paul Scholes'],
      ['left midfielder', 'Cristiano Ronaldo'], ['forward', 'Wayne Rooney'], ['forward', 'Carlos Tevez']] },

    { id: 'lfc-2005', q: "Liverpool's 2005 Champions League final XI (Istanbul) \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right-back', 'Steve Finnan'], ['centre-back', 'Jamie Carragher'], ['centre-back', 'Sami Hyypi\u00e4'], ['left-back', 'Djimi Traor\u00e9'],
      ['right midfielder', 'Luis Garc\u00eda'], ['central midfielder', 'Xabi Alonso'], ['captain', 'Steven Gerrard'],
      ['left midfielder', 'John Arne Riise'], ['support striker', 'Harry Kewell'], ['striker', 'Milan Baro\u0161']] },

    { id: 'lfc-2019', q: "Liverpool's 2019 Champions League final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right-back', 'Trent Alexander-Arnold'], ['centre-back', 'Jo\u00ebl Matip'], ['centre-back', 'Virgil van Dijk'],
      ['left-back', 'Andy Robertson'], ['captain', 'Jordan Henderson'], ['holding midfielder', 'Fabinho'],
      ['central midfielder', 'Georginio Wijnaldum'], ['right winger', 'Mohamed Salah'], ['centre-forward', 'Roberto Firmino'],
      ['left winger', 'Sadio Man\u00e9']] },

    { id: 'cfc-2012', q: "Chelsea's 2012 Champions League final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right-back', 'Jos\u00e9 Bosingwa'], ['centre-back', 'Gary Cahill'], ['centre-back', 'David Luiz'], ['left-back', 'Ashley Cole'],
      ['holding midfielder', 'John Obi Mikel'], ['central midfielder', 'Frank Lampard'], ['right winger', 'Salomon Kalou'],
      ['playmaker', 'Juan Mata'], ['left winger', 'Ryan Bertrand'], ['striker', 'Didier Drogba']] },

    { id: 'cfc-2021', q: "Chelsea's 2021 Champions League final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right centre-back', 'C\u00e9sar Azpilicueta'], ['centre-back', 'Thiago Silva'], ['left centre-back', 'Antonio R\u00fcdiger'],
      ['right wing-back', 'Reece James'], ['central midfielder', "N'Golo Kant\u00e9"], ['central midfielder', 'Jorginho'],
      ['left wing-back', 'Ben Chilwell'], ['attacking midfielder', 'Mason Mount'], ['match-winner', 'Kai Havertz'],
      ['striker', 'Timo Werner']] },

    { id: 'mcfc-2023', q: "Manchester City's 2023 Champions League final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right-back', 'Manuel Akanji'], ['centre-back', 'R\u00faben Dias'], ['left-back', 'Nathan Ak\u00e9'],
      ['centre-back turned midfielder', 'John Stones'], ['match-winner', 'Rodri'], ['right winger', 'Bernardo Silva'],
      ['playmaker', 'Kevin De Bruyne'], ['captain', '\u0130lkay G\u00fcndo\u011fan'], ['left winger', 'Jack Grealish'],
      ['striker', 'Erling Haaland']] },

    { id: 'fcb-2009', q: "Barcelona's 2009 Champions League final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right-back', 'Carles Puyol'], ['centre-back', 'Yaya Tour\u00e9'], ['centre-back', 'Gerard Piqu\u00e9'], ['left-back', 'Sylvinho'],
      ['holding midfielder', 'Sergio Busquets'], ['central midfielder', 'Xavi'], ['central midfielder', 'Andr\u00e9s Iniesta'],
      ['right forward', 'Lionel Messi'], ['striker', "Samuel Eto'o"], ['left forward', 'Thierry Henry']] },

    { id: 'fcb-2011', q: "Barcelona's 2011 Champions League final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right-back', 'Dani Alves'], ['centre-back', 'Gerard Piqu\u00e9'], ['centre-back', 'Javier Mascherano'], ['left-back', 'Eric Abidal'],
      ['holding midfielder', 'Sergio Busquets'], ['central midfielder', 'Xavi'], ['central midfielder', 'Andr\u00e9s Iniesta'],
      ['right forward', 'Pedro'], ['false nine', 'Lionel Messi'], ['left forward', 'David Villa']] },

    { id: 'afc-invincibles', q: "Arsenal's Invincibles (2003\u201304) \u2014 the regular outfield XI", type: 'player', kill: XI, a: [
      ['right-back', 'Lauren'], ['centre-back', 'Sol Campbell'], ['centre-back', 'Kolo Tour\u00e9'], ['left-back', 'Ashley Cole'],
      ['right midfielder', 'Freddie Ljungberg'], ['captain', 'Patrick Vieira'], ['holding midfielder', 'Gilberto Silva'],
      ['left midfielder', 'Robert Pir\u00e8s'], ['No. 10', 'Dennis Bergkamp'], ['No. 14', 'Thierry Henry']] },

    { id: 'lcfc-2016', q: "Leicester City's 2015\u201316 title winners \u2014 the regular outfield XI", type: 'player', kill: XI, a: [
      ['right-back', 'Danny Simpson'], ['captain', 'Wes Morgan'], ['centre-back', 'Robert Huth'], ['left-back', 'Christian Fuchs'],
      ['right midfielder', 'Riyad Mahrez'], ['ball-winner', "N'Golo Kant\u00e9"], ['central midfielder', 'Danny Drinkwater'],
      ['left midfielder', 'Marc Albrighton'], ['second striker', 'Shinji Okazaki'], ['striker', 'Jamie Vardy']] },

    { id: 'eng-euro96-sf', q: "England's Euro 96 semi-final XI against Germany \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['centre-back', 'Gareth Southgate'], ['captain', 'Tony Adams'], ['left centre-back', 'Stuart Pearce'],
      ['right midfielder', 'Darren Anderton'], ['holding midfielder', 'Paul Ince'], ['central midfielder', 'David Platt'],
      ['playmaker', 'Paul Gascoigne'], ['left midfielder', 'Steve McManaman'], ['scorer', 'Alan Shearer'],
      ['support striker', 'Teddy Sheringham']] },

    { id: 'eng-2018-sf', q: "England's 2018 World Cup semi-final XI against Croatia \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right centre-back', 'Kyle Walker'], ['centre-back', 'John Stones'], ['left centre-back', 'Harry Maguire'],
      ['scorer', 'Kieran Trippier'], ['holding midfielder', 'Jordan Henderson'], ['central midfielder', 'Jesse Lingard'],
      ['central midfielder', 'Dele Alli'], ['left wing-back', 'Ashley Young'], ['forward', 'Raheem Sterling'],
      ['captain', 'Harry Kane']] },

    { id: 'eng-euro2020', q: "England's Euro 2020 final XI against Italy \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right centre-back', 'Kyle Walker'], ['centre-back', 'John Stones'], ['left centre-back', 'Harry Maguire'],
      ['right wing-back', 'Kieran Trippier'], ['central midfielder', 'Declan Rice'], ['central midfielder', 'Kalvin Phillips'],
      ['scorer', 'Luke Shaw'], ['attacking midfielder', 'Mason Mount'], ['forward', 'Raheem Sterling'], ['captain', 'Harry Kane']] },

    { id: 'fra-1998', q: "France's 1998 World Cup final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right-back', 'Lilian Thuram'], ['centre-back', 'Marcel Desailly'], ['centre-back', 'Frank Leb\u0153uf'],
      ['left-back', 'Bixente Lizarazu'], ['right midfielder', 'Christian Karembeu'], ['captain', 'Didier Deschamps'],
      ['scorer of the third', 'Emmanuel Petit'], ['two-goal hero', 'Zinedine Zidane'], ['No. 6', 'Youri Djorkaeff'],
      ['striker', "St\u00e9phane Guivarc'h"]] },

    { id: 'bra-2002', q: "Brazil's 2002 World Cup final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['centre-back', 'L\u00facio'], ['sweeper', 'Edm\u00edlson'], ['centre-back', 'Roque J\u00fanior'], ['captain', 'Cafu'],
      ['central midfielder', 'Kl\u00e9berson'], ['holding midfielder', 'Gilberto Silva'], ['left wing-back', 'Roberto Carlos'],
      ['No. 11', 'Ronaldinho'], ['No. 10', 'Rivaldo'], ['two-goal hero', 'Ronaldo']] },

    { id: 'ita-2006', q: "Italy's 2006 World Cup final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right-back', 'Gianluca Zambrotta'], ['captain', 'Fabio Cannavaro'], ['scorer', 'Marco Materazzi'],
      ['left-back', 'Fabio Grosso'], ['right midfielder', 'Mauro Camoranesi'], ['ball-winner', 'Gennaro Gattuso'],
      ['playmaker', 'Andrea Pirlo'], ['left midfielder', 'Simone Perrotta'], ['No. 10', 'Francesco Totti'], ['striker', 'Luca Toni']] },

    { id: 'esp-2010', q: "Spain's 2010 World Cup final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right-back', 'Sergio Ramos'], ['centre-back', 'Gerard Piqu\u00e9'], ['centre-back', 'Carles Puyol'],
      ['left-back', 'Joan Capdevila'], ['holding midfielder', 'Sergio Busquets'], ['central midfielder', 'Xabi Alonso'],
      ['right winger', 'Pedro'], ['playmaker', 'Xavi'], ['match-winner', 'Andr\u00e9s Iniesta'], ['striker', 'David Villa']] },

    { id: 'ned-2010', q: "The Netherlands' 2010 World Cup final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right-back', 'Gregory van der Wiel'], ['sent-off centre-back', 'John Heitinga'], ['centre-back', 'Joris Mathijsen'],
      ['captain', 'Giovanni van Bronckhorst'], ['holding midfielder', 'Mark van Bommel'], ['holding midfielder', 'Nigel de Jong'],
      ['right winger', 'Arjen Robben'], ['playmaker', 'Wesley Sneijder'], ['left winger', 'Dirk Kuyt'], ['striker', 'Robin van Persie']] },

    { id: 'ger-2014', q: "Germany's 2014 World Cup final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['captain', 'Philipp Lahm'], ['centre-back', 'J\u00e9r\u00f4me Boateng'], ['centre-back', 'Mats Hummels'],
      ['left-back', 'Benedikt H\u00f6wedes'], ['late call-up', 'Christoph Kramer'], ['holding midfielder', 'Bastian Schweinsteiger'],
      ['central midfielder', 'Toni Kroos'], ['right forward', 'Thomas M\u00fcller'], ['No. 8', 'Mesut \u00d6zil'], ['striker', 'Miroslav Klose']] },

    { id: 'arg-2022', q: "Argentina's 2022 World Cup final XI \u2014 the ten outfield starters", type: 'player', kill: XI, a: [
      ['right-back', 'Nahuel Molina'], ['centre-back', 'Cristian Romero'], ['centre-back', 'Nicol\u00e1s Otamendi'],
      ['left-back', 'Nicol\u00e1s Tagliafico'], ['central midfielder', 'Rodrigo De Paul'], ['holding midfielder', 'Enzo Fern\u00e1ndez'],
      ['central midfielder', 'Alexis Mac Allister'], ['captain', 'Lionel Messi'], ['striker', 'Juli\u00e1n \u00c1lvarez'],
      ['left winger', '\u00c1ngel Di Mar\u00eda']] }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
