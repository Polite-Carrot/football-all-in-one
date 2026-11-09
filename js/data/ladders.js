/* ladders.js — Back Yourself questions.
 *
 * Each ladder is one topic climbed in three rungs: easy, hard, expert. The
 * right answer is always written first; the game shuffles the options.
 * Only settled history — no "current", "latest" or "record holder" questions
 * that a new season could make wrong. */
(function (g) {
  'use strict';

  g.FA_LADDERS = [
    { topic: 'World Cup 2014', q: [
      ['Who won the 2014 World Cup?', 'Germany', 'Argentina', 'Brazil', 'Netherlands'],
      ['Who scored the winning goal in the 2014 final?', 'Mario G\u00f6tze', 'Thomas M\u00fcller', 'Miroslav Klose', 'Toni Kroos'],
      ['Who crossed for that winning goal?', 'Andr\u00e9 Sch\u00fcrrle', 'Mesut \u00d6zil', 'Toni Kroos', 'Philipp Lahm']] },

    { topic: 'Premier League beginnings', q: [
      ['In which year did the Premier League kick off?', '1992', '1990', '1994', '1988'],
      ['Who won the first Premier League title?', 'Manchester United', 'Aston Villa', 'Blackburn Rovers', 'Arsenal'],
      ['Who scored the first ever Premier League goal?', 'Brian Deane', 'Alan Shearer', 'Teddy Sheringham', 'Eric Cantona']] },

    { topic: 'The Invincibles', q: [
      ['Which club went unbeaten through the 2003\u201304 Premier League season?', 'Arsenal', 'Chelsea', 'Manchester United', 'Liverpool'],
      ['How many league games did they draw that season?', '12', '8', '10', '14'],
      ["Who ended Arsenal's 49-game unbeaten run in October 2004?", 'Manchester United', 'Chelsea', 'Liverpool', 'Bolton Wanderers']] },

    { topic: 'Leicester 2015\u201316', q: [
      ['Who managed Leicester City to the 2015\u201316 title?', 'Claudio Ranieri', 'Nigel Pearson', 'Brendan Rodgers', 'Craig Shakespeare'],
      ['Jamie Vardy set a record by scoring in how many consecutive Premier League games?', '11', '9', '10', '13'],
      ["What were Leicester's widely quoted pre-season odds to win the league?", '5000\u20131', '500\u20131', '1000\u20131', '10000\u20131']] },

    { topic: "Ballon d'Or", q: [
      ["Who has won the most Ballon d'Or awards?", 'Lionel Messi', 'Cristiano Ronaldo', 'Michel Platini', 'Johan Cruyff'],
      ["Who won the 2018 Ballon d'Or, breaking the Messi\u2013Ronaldo run?", 'Luka Modri\u0107', 'Antoine Griezmann', 'Kylian Mbapp\u00e9', 'Mohamed Salah'],
      ["Who won the very first Ballon d'Or in 1956?", 'Stanley Matthews', 'Alfredo Di St\u00e9fano', 'Raymond Kopa', 'Ferenc Pusk\u00e1s']] },

    { topic: 'Istanbul 2005', q: [
      ['Liverpool won the 2005 Champions League final against which club?', 'AC Milan', 'Juventus', 'Inter Milan', 'Chelsea'],
      ['What was the score at half-time?', 'Milan 3\u20130 Liverpool', 'Milan 2\u20130 Liverpool', 'Milan 3\u20131 Liverpool', 'Milan 1\u20130 Liverpool'],
      ["Which goalkeeper saved Andriy Shevchenko's decisive penalty?", 'Jerzy Dudek', 'Pepe Reina', 'Scott Carson', 'Chris Kirkland']] },

    { topic: 'The Crazy Gang', q: [
      ['Who did Wimbledon beat in the 1988 FA Cup final?', 'Liverpool', 'Everton', 'Arsenal', 'Manchester United'],
      ["Who scored Wimbledon's winning goal?", 'Lawrie Sanchez', 'Vinnie Jones', 'John Fashanu', 'Dennis Wise'],
      ['Dave Beasant became the first keeper to save a penalty in an FA Cup final at Wembley. Whose?', 'John Aldridge', 'Ian Rush', 'John Barnes', 'Peter Beardsley']] },

    { topic: 'Euro 96', q: [
      ['Which country hosted Euro 96?', 'England', 'Germany', 'Netherlands', 'France'],
      ['Who won Euro 96?', 'Germany', 'Czech Republic', 'France', 'England'],
      ['Who scored the golden goal that won the Euro 96 final?', 'Oliver Bierhoff', 'J\u00fcrgen Klinsmann', 'Andreas M\u00f6ller', 'Matthias Sammer']] },

    { topic: 'Record transfers', q: [
      ['Which club did Neymar join for a world-record fee in 2017?', 'Paris Saint-Germain', 'Real Madrid', 'Manchester United', 'Chelsea'],
      ['What was that fee?', '\u20ac222 million', '\u20ac180 million', '\u20ac150 million', '\u20ac250 million'],
      ["Whose world-record fee did Neymar's move break?", 'Paul Pogba', 'Gareth Bale', 'Cristiano Ronaldo', 'Philippe Coutinho']] },

    { topic: 'Mexico 86', q: [
      ['Which country did Diego Maradona captain at the 1986 World Cup?', 'Argentina', 'Uruguay', 'Brazil', 'Spain'],
      ['Against which country did he score the "Hand of God" goal?', 'England', 'West Germany', 'Belgium', 'Italy'],
      ['Which goalkeeper was beaten by the Hand of God?', 'Peter Shilton', 'Ray Clemence', 'Chris Woods', 'Gary Bailey']] },

    { topic: '93:20', q: [
      ["Who scored Manchester City's last-gasp title winner on the final day of 2011\u201312?", 'Sergio Ag\u00fcero', 'Edin D\u017eeko', 'Carlos Tevez', 'Mario Balotelli'],
      ['Who were City playing that day?', 'Queens Park Rangers', 'Sunderland', 'Newcastle United', 'Stoke City'],
      ['Who provided the assist for the winner?', 'Mario Balotelli', 'David Silva', 'Samir Nasri', 'Yaya Tour\u00e9']] },

    { topic: 'Euro 2016', q: [
      ['Who won Euro 2016?', 'Portugal', 'France', 'Wales', 'Germany'],
      ['Who scored the only goal of the final?', '\u00c9der', 'Cristiano Ronaldo', 'Nani', 'Renato Sanches'],
      ['Which country knocked England out of Euro 2016?', 'Iceland', 'Wales', 'Slovakia', 'Russia']] },

    { topic: 'Haaland\u2019s first season', q: [
      ['How many Premier League goals did Erling Haaland score in 2022\u201323?', '36', '32', '34', '38'],
      ['Whose 38-game-season record of 32 goals did he beat?', 'Mohamed Salah', 'Luis Su\u00e1rez', 'Cristiano Ronaldo', 'Alan Shearer'],
      ['The old 42-game record of 34 was shared by Alan Shearer and who?', 'Andy Cole', 'Kevin Phillips', 'Thierry Henry', 'Robin van Persie']] },

    { topic: 'Arsène Wenger', q: [
      ['Which club did Ars\u00e8ne Wenger manage for 22 years?', 'Arsenal', 'Monaco', 'Nagoya Grampus', 'Paris Saint-Germain'],
      ['From which club did Arsenal hire him in 1996?', 'Nagoya Grampus Eight', 'Kashima Antlers', 'Yokohama F. Marinos', 'Gamba Osaka'],
      ['Which French club did Wenger lead to the 1987\u201388 league title?', 'Monaco', 'Marseille', 'Bordeaux', 'Nancy']] },

    { topic: 'Fergie', q: [
      ['Roughly how many years did Sir Alex Ferguson manage Manchester United?', '26', '20', '23', '30'],
      ['Which Scottish club did he lead to the 1983 Cup Winners\u2019 Cup?', 'Aberdeen', 'Dundee United', 'Celtic', 'St Mirren'],
      ['Who did Aberdeen beat in that 1983 final?', 'Real Madrid', 'Bayern Munich', 'Barcelona', 'Juventus']] },

    { topic: '1966', q: [
      ['Who won the 1966 World Cup?', 'England', 'West Germany', 'Portugal', 'Brazil'],
      ['Who scored a hat-trick in the final?', 'Geoff Hurst', 'Bobby Charlton', 'Martin Peters', 'Roger Hunt'],
      ["Who scored England's other goal in the final?", 'Martin Peters', 'Bobby Charlton', 'Roger Hunt', 'Alan Ball']] },

    { topic: 'Cristiano Ronaldo', q: [
      ['From which club did Manchester United sign Cristiano Ronaldo in 2003?', 'Sporting CP', 'Benfica', 'Porto', 'Real Madrid'],
      ['In 2009 he joined Real Madrid for a then world record of roughly\u2026', '\u00a380 million', '\u00a350 million', '\u00a360 million', '\u00a3100 million'],
      ["In which year did Ronaldo win his first Ballon d'Or?", '2008', '2007', '2009', '2013']] },

    { topic: 'Lionel Messi', q: [
      ['Which club did Messi join in 2021 after leaving Barcelona?', 'Paris Saint-Germain', 'Manchester City', 'Inter Miami', 'Al-Hilal'],
      ['Against which country did Messi win the 2022 World Cup final?', 'France', 'Croatia', 'Brazil', 'Netherlands'],
      ['Against which club did Messi make his competitive Barcelona debut in 2004?', 'Espanyol', 'Albacete', 'Real Betis', 'Osasuna']] },

    { topic: 'Nicknames', q: [
      ['Which club is nicknamed "the Toffees"?', 'Everton', 'Liverpool', 'Blackburn Rovers', 'Norwich City'],
      ['Which club is nicknamed "the Cottagers"?', 'Fulham', 'Brentford', 'Queens Park Rangers', 'Crystal Palace'],
      ['Which club is nicknamed "the Baggies"?', 'West Bromwich Albion', 'Wolverhampton Wanderers', 'Birmingham City', 'Stoke City']] },

    { topic: 'Grounds', q: [
      ['Which club plays its home games at Anfield?', 'Liverpool', 'Everton', 'Manchester United', 'Leeds United'],
      ['Which club plays at Selhurst Park?', 'Crystal Palace', 'Charlton Athletic', 'Fulham', 'Brentford'],
      ['Which club played at Burnden Park until 1997?', 'Bolton Wanderers', 'Blackburn Rovers', 'Burnley', 'Preston North End']] },

    { topic: 'Treble night', q: [
      ['Who did Manchester United beat in the 1999 Champions League final?', 'Bayern Munich', 'Juventus', 'Barcelona', 'Inter Milan'],
      ["Who scored United's injury-time winner?", 'Ole Gunnar Solskj\u00e6r', 'Teddy Sheringham', 'Dwight Yorke', 'Andy Cole'],
      ['In which stadium was that final played?', 'Camp Nou', 'Wembley', 'San Siro', 'Santiago Bernab\u00e9u']] },

    { topic: 'Centurions', q: [
      ['Which club reached 100 points to win the 2017\u201318 Premier League?', 'Manchester City', 'Liverpool', 'Chelsea', 'Manchester United'],
      ['Who managed them?', 'Pep Guardiola', 'Manuel Pellegrini', 'Roberto Mancini', 'Mikel Arteta'],
      ["How many points did Liverpool's 2019\u201320 champions finish with?", '99', '97', '98', '100']] },

    { topic: 'European Cup 1967', q: [
      ['Which Scottish club won the European Cup in 1967?', 'Celtic', 'Rangers', 'Aberdeen', 'Hearts'],
      ['What nickname was given to that team?', 'The Lisbon Lions', 'The Busby Babes', 'The Famous Five', 'The Quality Street Gang'],
      ['Who did they beat in the final?', 'Inter Milan', 'Real Madrid', 'Benfica', 'AC Milan']] },

    { topic: 'Lionesses 2022', q: [
      ["Which country won the women's Euro 2022?", 'England', 'Germany', 'Spain', 'Sweden'],
      ['Who scored the winning goal in the final?', 'Chloe Kelly', 'Ella Toone', 'Alessia Russo', 'Beth Mead'],
      ['Who managed that team?', 'Sarina Wiegman', 'Phil Neville', 'Hope Powell', 'Mark Sampson']] },

    { topic: 'Munich 2012', q: [
      ['Which club won the 2012 Champions League final in Munich?', 'Chelsea', 'Bayern Munich', 'Barcelona', 'Real Madrid'],
      ["Who scored Chelsea's 88th-minute equaliser?", 'Didier Drogba', 'Fernando Torres', 'Juan Mata', 'Frank Lampard'],
      ["Who was Chelsea's interim manager?", 'Roberto Di Matteo', 'Andr\u00e9 Villas-Boas', 'Rafael Ben\u00edtez', 'Guus Hiddink']] },

    { topic: 'Harry Kane', q: [
      ['Which club did Harry Kane leave Tottenham for in 2023?', 'Bayern Munich', 'Manchester City', 'Manchester United', 'Real Madrid'],
      ["Who did Kane overtake to become Tottenham's all-time top scorer?", 'Jimmy Greaves', 'Bobby Smith', 'Martin Chivers', 'Cliff Jones'],
      ['Kane went out on his first loan in January 2011. To which club?', 'Leyton Orient', 'Millwall', 'Norwich City', 'Leicester City']] },

    { topic: 'Bundesliga', q: [
      ['Which club has won the most Bundesliga titles?', 'Bayern Munich', 'Borussia Dortmund', 'Hamburger SV', 'Werder Bremen'],
      ["Which club ended Bayern's run of 11 straight titles in 2023\u201324?", 'Bayer Leverkusen', 'Borussia Dortmund', 'RB Leipzig', 'VfB Stuttgart'],
      ['Who managed that unbeaten Leverkusen side?', 'Xabi Alonso', 'Julian Nagelsmann', 'Thomas Tuchel', 'Edin Terzi\u0107']] },

    { topic: 'Calcio', q: [
      ['Which Italian club is nicknamed "the Old Lady"?', 'Juventus', 'Inter Milan', 'AC Milan', 'Roma'],
      ['Which club won its first Serie A title in 1987 with Diego Maradona?', 'Napoli', 'Roma', 'Fiorentina', 'Sampdoria'],
      ['Which club were surprise Serie A champions in 1984\u201385?', 'Hellas Verona', 'Sampdoria', 'Torino', 'Udinese']] },

    { topic: 'La Liga', q: [
      ['Which two clubs contest El Cl\u00e1sico?', 'Real Madrid and Barcelona', 'Real Madrid and Atl\u00e9tico', 'Barcelona and Espanyol', 'Sevilla and Real Betis'],
      ['Which club won La Liga in 2020\u201321?', 'Atl\u00e9tico Madrid', 'Real Madrid', 'Barcelona', 'Sevilla'],
      ['Which Basque club won back-to-back titles in 1981 and 1982?', 'Real Sociedad', 'Athletic Bilbao', 'Osasuna', 'Alav\u00e9s']] },

    { topic: 'Goalkeepers', q: [
      ["Who is the only goalkeeper to have won the Ballon d'Or?", 'Lev Yashin', 'Gordon Banks', 'Dino Zoff', 'Gianluigi Buffon'],
      ['Who saved the decisive penalty in the 2008 Champions League final shootout?', 'Edwin van der Sar', 'Petr \u010cech', 'Ben Foster', 'Tim Howard'],
      ['Whose penalty did he save to win it?', 'Nicolas Anelka', 'John Terry', 'Didier Drogba', 'Michael Ballack']] },

    { topic: 'World Cup 1970', q: [
      ['Who did Brazil beat in the 1970 World Cup final?', 'Italy', 'West Germany', 'Uruguay', 'England'],
      ["Who scored Brazil's celebrated fourth goal in that final?", 'Carlos Alberto', 'Jairzinho', 'Pel\u00e9', 'Rivelino'],
      ['In which stadium was the final played?', 'Estadio Azteca', 'Maracan\u00e3', 'Estadio Jalisco', 'Estadio Centenario']] },

    { topic: 'Africa', q: [
      ["Which Liberian striker won the 1995 Ballon d'Or?", 'George Weah', "Samuel Eto'o", 'Didier Drogba', 'Abedi Pel\u00e9'],
      ['Which nation won the 2023 Africa Cup of Nations, played in early 2024?', 'Ivory Coast', 'Nigeria', 'Senegal', 'South Africa'],
      ['Which became the first African nation to reach a World Cup semi-final, in 2022?', 'Morocco', 'Senegal', 'Ghana', 'Cameroon']] },

    { topic: 'Euro 2024', q: [
      ['Which country won Euro 2024?', 'Spain', 'England', 'France', 'Germany'],
      ['Who scored the winning goal in the final?', 'Mikel Oyarzabal', 'Nico Williams', 'Lamine Yamal', 'Dani Olmo'],
      ['In which city was the final played?', 'Berlin', 'Munich', 'Dortmund', 'Frankfurt']] },

    { topic: 'Chelsea 2004\u201305', q: [
      ['Who managed Chelsea to the 2004\u201305 Premier League title?', 'Jos\u00e9 Mourinho', 'Claudio Ranieri', 'Carlo Ancelotti', 'Guus Hiddink'],
      ['How many points did they finish with?', '95', '91', '93', '97'],
      ['How many league goals did they concede, a Premier League record?', '15', '12', '19', '22']] }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
