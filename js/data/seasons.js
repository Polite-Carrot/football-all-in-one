/* seasons.js — the club-seasons 38-0 spins between.
 *
 * Squads are the players who really played for that club in that season.
 * Ratings (50–99) are the game's own judgement of each player in that
 * season, not data from anywhere. Positions: GK, RB, CB, LB, DM, CM, AM,
 * RW, LW, ST. Colours are the home shirt and its trim. */
(function (g) {
  'use strict';

  g.FA_SEASONS = [
    { club: 'Arsenal', season: '2003\u201304', c: '#EF0107', c2: '#FFFFFF', p: [
      ['Jens Lehmann', 'GK', 85], ['Lauren', 'RB', 83], ['Sol Campbell', 'CB', 89], ['Kolo Tour\u00e9', 'CB', 84],
      ['Martin Keown', 'CB', 79], ['Pascal Cygan', 'CB', 73], ['Ashley Cole', 'LB', 88], ['Ga\u00ebl Clichy', 'LB', 72],
      ['Patrick Vieira', 'CM', 92], ['Gilberto Silva', 'DM', 84], ['Ray Parlour', 'CM', 79], ['Edu', 'CM', 80],
      ['Freddie Ljungberg', 'RW', 85], ['Robert Pir\u00e8s', 'LW', 90], ['Jos\u00e9 Antonio Reyes', 'LW', 80],
      ['Dennis Bergkamp', 'ST', 89], ['Thierry Henry', 'ST', 95], ['Sylvain Wiltord', 'ST', 80], ['Kanu', 'ST', 77]] },

    { club: 'Manchester United', season: '1998\u201399', c: '#DA291C', c2: '#FFFFFF', p: [
      ['Peter Schmeichel', 'GK', 91], ['Gary Neville', 'RB', 86], ['Jaap Stam', 'CB', 90], ['Ronny Johnsen', 'CB', 83],
      ['Henning Berg', 'CB', 80], ['Denis Irwin', 'LB', 85], ['Phil Neville', 'LB', 77], ['Roy Keane', 'CM', 92],
      ['Paul Scholes', 'CM', 87], ['Nicky Butt', 'CM', 81], ['David Beckham', 'RW', 90], ['Ryan Giggs', 'LW', 89],
      ['Jesper Blomqvist', 'LW', 77], ['Dwight Yorke', 'ST', 89], ['Andy Cole', 'ST', 87], ['Teddy Sheringham', 'ST', 82],
      ['Ole Gunnar Solskj\u00e6r', 'ST', 82]] },

    { club: 'Chelsea', season: '2004\u201305', c: '#034694', c2: '#FFFFFF', p: [
      ['Petr \u010cech', 'GK', 91], ['Paulo Ferreira', 'RB', 80], ['Glen Johnson', 'RB', 76], ['John Terry', 'CB', 91],
      ['Ricardo Carvalho', 'CB', 88], ['William Gallas', 'CB', 85], ['Wayne Bridge', 'LB', 80], ['Claude Mak\u00e9l\u00e9l\u00e9', 'DM', 90],
      ['Frank Lampard', 'CM', 92], ['Tiago', 'CM', 80], ['Alexey Smertin', 'CM', 75], ['Joe Cole', 'AM', 85],
      ['Damien Duff', 'RW', 86], ['Arjen Robben', 'LW', 89], ['Didier Drogba', 'ST', 85], ['Ei\u00f0ur Gu\u00f0johnsen', 'ST', 83],
      ['Mateja Ke\u017eman', 'ST', 76]] },

    { club: 'Manchester City', season: '2017\u201318', c: '#6CABDD', c2: '#1C2C5B', p: [
      ['Ederson', 'GK', 87], ['Kyle Walker', 'RB', 86], ['Danilo', 'RB', 77], ['Vincent Kompany', 'CB', 86],
      ['Nicol\u00e1s Otamendi', 'CB', 85], ['John Stones', 'CB', 84], ['Aymeric Laporte', 'CB', 84], ['Fabian Delph', 'LB', 79],
      ['Benjamin Mendy', 'LB', 78], ['Fernandinho', 'DM', 87], ['Kevin De Bruyne', 'CM', 94], ['David Silva', 'AM', 91],
      ['\u0130lkay G\u00fcndo\u011fan', 'CM', 83], ['Raheem Sterling', 'RW', 88], ['Bernardo Silva', 'RW', 84], ['Leroy San\u00e9', 'LW', 88],
      ['Sergio Ag\u00fcero', 'ST', 91], ['Gabriel Jesus', 'ST', 83]] },

    { club: 'Liverpool', season: '2019\u201320', c: '#C8102E', c2: '#FFFFFF', p: [
      ['Alisson', 'GK', 91], ['Adri\u00e1n', 'GK', 74], ['Trent Alexander-Arnold', 'RB', 89], ['Virgil van Dijk', 'CB', 93],
      ['Joe Gomez', 'CB', 83], ['Jo\u00ebl Matip', 'CB', 82], ['Dejan Lovren', 'CB', 77], ['Andy Robertson', 'LB', 88],
      ['Fabinho', 'DM', 87], ['Jordan Henderson', 'CM', 86], ['Georginio Wijnaldum', 'CM', 84], ['Naby Ke\u00efta', 'CM', 78],
      ['Alex Oxlade-Chamberlain', 'CM', 78], ['James Milner', 'CM', 79], ['Mohamed Salah', 'RW', 91], ['Sadio Man\u00e9', 'LW', 91],
      ['Roberto Firmino', 'ST', 88], ['Divock Origi', 'ST', 75], ['Takumi Minamino', 'AM', 74]] },

    { club: 'Leicester City', season: '2015\u201316', c: '#003090', c2: '#FDBE11', p: [
      ['Kasper Schmeichel', 'GK', 84], ['Danny Simpson', 'RB', 76], ['Wes Morgan', 'CB', 80], ['Robert Huth', 'CB', 81],
      ['Christian Fuchs', 'LB', 79], ["N'Golo Kant\u00e9", 'DM', 88], ['Danny Drinkwater', 'CM', 82], ['Andy King', 'CM', 74],
      ['Riyad Mahrez', 'RW', 88], ['Marc Albrighton', 'LW', 79], ['Jeffrey Schlupp', 'LW', 72], ['Demarai Gray', 'LW', 71],
      ['Shinji Okazaki', 'ST', 79], ['Jamie Vardy', 'ST', 89], ['Leonardo Ulloa', 'ST', 73]] },

    { club: 'Blackburn Rovers', season: '1994\u201395', c: '#009EE0', c2: '#FFFFFF', p: [
      ['Tim Flowers', 'GK', 86], ['Henning Berg', 'RB', 82], ['Jeff Kenna', 'RB', 76], ['Colin Hendry', 'CB', 86],
      ['Ian Pearce', 'CB', 78], ['Tony Gale', 'CB', 74], ['Graeme Le Saux', 'LB', 85], ['Tim Sherwood', 'CM', 83],
      ['David Batty', 'DM', 82], ['Mark Atkins', 'CM', 75], ['Paul Warhurst', 'CM', 72], ['Stuart Ripley', 'RW', 81],
      ['Jason Wilcox', 'LW', 81], ['Alan Shearer', 'ST', 93], ['Chris Sutton', 'ST', 86], ['Mike Newell', 'ST', 74]] },

    { club: 'Newcastle United', season: '1995\u201396', c: '#241F20', c2: '#FFFFFF', p: [
      ['Shaka Hislop', 'GK', 80], ['Pavel Srn\u00ed\u010dek', 'GK', 79], ['Warren Barton', 'RB', 79], ['Steve Howey', 'CB', 82],
      ['Philippe Albert', 'CB', 83], ['Darren Peacock', 'CB', 79], ['John Beresford', 'LB', 80], ['Rob Lee', 'CM', 85],
      ['Lee Clark', 'CM', 79], ['David Batty', 'DM', 82], ['Keith Gillespie', 'RW', 82], ['David Ginola', 'LW', 89],
      ['Peter Beardsley', 'AM', 86], ['Les Ferdinand', 'ST', 89], ['Faustino Asprilla', 'ST', 85]] },

    { club: 'Manchester United', season: '2007\u201308', c: '#DA291C', c2: '#FFFFFF', p: [
      ['Edwin van der Sar', 'GK', 88], ['Wes Brown', 'RB', 81], ["John O'Shea", 'RB', 78], ['Rio Ferdinand', 'CB', 90],
      ['Nemanja Vidi\u0107', 'CB', 90], ['Patrice Evra', 'LB', 87], ['Owen Hargreaves', 'DM', 83], ['Michael Carrick', 'CM', 85],
      ['Paul Scholes', 'CM', 86], ['Anderson', 'CM', 79], ['Cristiano Ronaldo', 'RW', 95], ['Nani', 'RW', 80],
      ['Ryan Giggs', 'LW', 84], ['Park Ji-sung', 'LW', 81], ['Wayne Rooney', 'ST', 89], ['Carlos Tevez', 'ST', 87],
      ['Louis Saha', 'ST', 79]] },

    { club: 'Arsenal', season: '1997\u201398', c: '#EF0107', c2: '#FFFFFF', p: [
      ['David Seaman', 'GK', 89], ['Alex Manninger', 'GK', 76], ['Lee Dixon', 'RB', 83], ['Tony Adams', 'CB', 89],
      ['Martin Keown', 'CB', 85], ['Steve Bould', 'CB', 79], ['Nigel Winterburn', 'LB', 82], ['Patrick Vieira', 'CM', 88],
      ['Emmanuel Petit', 'DM', 86], ['Gilles Grimandi', 'CM', 72], ['Ray Parlour', 'RW', 81], ['Marc Overmars', 'LW', 88],
      ['Dennis Bergkamp', 'ST', 92], ['Ian Wright', 'ST', 84], ['Nicolas Anelka', 'ST', 82], ['Christopher Wreh', 'ST', 70]] },

    { club: 'Chelsea', season: '2016\u201317', c: '#034694', c2: '#FFFFFF', p: [
      ['Thibaut Courtois', 'GK', 89], ['Victor Moses', 'RB', 80], ['C\u00e9sar Azpilicueta', 'CB', 86], ['David Luiz', 'CB', 85],
      ['Gary Cahill', 'CB', 84], ['Marcos Alonso', 'LB', 82], ["N'Golo Kant\u00e9", 'DM', 91], ['Nemanja Mati\u0107', 'CM', 84],
      ['Cesc F\u00e0bregas', 'CM', 85], ['Pedro', 'RW', 83], ['Willian', 'RW', 83], ['Eden Hazard', 'LW', 92],
      ['Diego Costa', 'ST', 89], ['Michy Batshuayi', 'ST', 74]] },

    { club: 'Tottenham Hotspur', season: '2016\u201317', c: '#132257', c2: '#FFFFFF', p: [
      ['Hugo Lloris', 'GK', 88], ['Kyle Walker', 'RB', 85], ['Kieran Trippier', 'RB', 79], ['Toby Alderweireld', 'CB', 88],
      ['Jan Vertonghen', 'CB', 87], ['Danny Rose', 'LB', 85], ['Ben Davies', 'LB', 77], ['Eric Dier', 'DM', 82],
      ['Victor Wanyama', 'DM', 83], ['Mousa Demb\u00e9l\u00e9', 'CM', 86], ['Christian Eriksen', 'AM', 88], ['Dele Alli', 'AM', 88],
      ['Son Heung-min', 'LW', 84], ['Harry Kane', 'ST', 92], ['Vincent Janssen', 'ST', 70]] },

    { club: 'Liverpool', season: '2008\u201309', c: '#C8102E', c2: '#FFFFFF', p: [
      ['Pepe Reina', 'GK', 87], ['\u00c1lvaro Arbeloa', 'RB', 80], ['Jamie Carragher', 'CB', 86], ['Martin \u0160krtel', 'CB', 81],
      ['Daniel Agger', 'CB', 83], ['Sami Hyypi\u00e4', 'CB', 80], ['F\u00e1bio Aur\u00e9lio', 'LB', 80], ['Andrea Dossena', 'LB', 74],
      ['Javier Mascherano', 'DM', 87], ['Lucas', 'DM', 77], ['Xabi Alonso', 'CM', 89], ['Steven Gerrard', 'AM', 93],
      ['Dirk Kuyt', 'RW', 82], ['Albert Riera', 'LW', 80], ['Ryan Babel', 'LW', 76], ['Fernando Torres', 'ST', 91],
      ['Robbie Keane', 'ST', 80]] },

    { club: 'Manchester City', season: '2011\u201312', c: '#6CABDD', c2: '#1C2C5B', p: [
      ['Joe Hart', 'GK', 85], ['Micah Richards', 'RB', 82], ['Pablo Zabaleta', 'RB', 82], ['Vincent Kompany', 'CB', 89],
      ['Joleon Lescott', 'CB', 84], ['Kolo Tour\u00e9', 'CB', 78], ['Ga\u00ebl Clichy', 'LB', 81], ['Aleksandar Kolarov', 'LB', 79],
      ['Gareth Barry', 'DM', 81], ['Nigel de Jong', 'DM', 81], ['Yaya Tour\u00e9', 'CM', 90], ['David Silva', 'AM', 91],
      ['Samir Nasri', 'AM', 84], ['James Milner', 'RW', 81], ['Adam Johnson', 'RW', 78], ['Sergio Ag\u00fcero', 'ST', 90],
      ['Edin D\u017eeko', 'ST', 84], ['Mario Balotelli', 'ST', 82], ['Carlos Tevez', 'ST', 83]] },

    { club: 'Manchester United', season: '1993\u201394', c: '#DA291C', c2: '#FFFFFF', p: [
      ['Peter Schmeichel', 'GK', 90], ['Paul Parker', 'RB', 81], ['Steve Bruce', 'CB', 85], ['Gary Pallister', 'CB', 86],
      ['Denis Irwin', 'LB', 84], ['Roy Keane', 'CM', 86], ['Paul Ince', 'CM', 87], ['Brian McClair', 'CM', 79],
      ['Andrei Kanchelskis', 'RW', 85], ['Ryan Giggs', 'LW', 86], ['Lee Sharpe', 'LW', 81], ['Eric Cantona', 'ST', 92],
      ['Mark Hughes', 'ST', 86]] },

    { club: 'Leeds United', season: '2000\u201301', c: '#F4F4F4', c2: '#1D428A', p: [
      ['Nigel Martyn', 'GK', 85], ['Gary Kelly', 'RB', 79], ['Danny Mills', 'RB', 80], ['Rio Ferdinand', 'CB', 87],
      ['Lucas Radebe', 'CB', 82], ['Jonathan Woodgate', 'CB', 82], ['Dominic Matteo', 'CB', 80], ['Ian Harte', 'LB', 81],
      ['David Batty', 'DM', 80], ['Lee Bowyer', 'CM', 84], ['Olivier Dacourt', 'CM', 83], ['Eirik Bakke', 'CM', 76],
      ['Harry Kewell', 'LW', 85], ['Mark Viduka', 'ST', 87], ['Alan Smith', 'ST', 80], ['Robbie Keane', 'ST', 81]] },

    { club: 'Chelsea', season: '2009\u201310', c: '#034694', c2: '#FFFFFF', p: [
      ['Petr \u010cech', 'GK', 90], ['Branislav Ivanovi\u0107', 'RB', 84], ['Paulo Ferreira', 'RB', 74], ['John Terry', 'CB', 89],
      ['Alex', 'CB', 82], ['Ricardo Carvalho', 'CB', 84], ['Ashley Cole', 'LB', 88], ['Yuri Zhirkov', 'LB', 76],
      ['John Obi Mikel', 'DM', 80], ['Frank Lampard', 'CM', 91], ['Michael Ballack', 'CM', 84], ['Deco', 'CM', 79],
      ['Joe Cole', 'RW', 80], ['Salomon Kalou', 'RW', 78], ['Florent Malouda', 'LW', 85], ['Didier Drogba', 'ST', 92],
      ['Nicolas Anelka', 'ST', 85]] },

    { club: 'Manchester City', season: '2022\u201323', c: '#6CABDD', c2: '#1C2C5B', p: [
      ['Ederson', 'GK', 88], ['Kyle Walker', 'RB', 85], ['Manuel Akanji', 'CB', 83], ['R\u00faben Dias', 'CB', 89],
      ['John Stones', 'CB', 87], ['Nathan Ak\u00e9', 'CB', 83], ['Jo\u00e3o Cancelo', 'LB', 84], ['Rodri', 'DM', 91],
      ['Kevin De Bruyne', 'CM', 92], ['\u0130lkay G\u00fcndo\u011fan', 'CM', 87], ['Bernardo Silva', 'RW', 88], ['Riyad Mahrez', 'RW', 84],
      ['Phil Foden', 'LW', 86], ['Jack Grealish', 'LW', 85], ['Erling Haaland', 'ST', 93], ['Juli\u00e1n \u00c1lvarez', 'ST', 82]] },

    { club: 'Liverpool', season: '2013\u201314', c: '#C8102E', c2: '#FFFFFF', p: [
      ['Simon Mignolet', 'GK', 80], ['Glen Johnson', 'RB', 80], ['Jon Flanagan', 'LB', 74], ['Martin \u0160krtel', 'CB', 82],
      ['Daniel Agger', 'CB', 80], ['Mamadou Sakho', 'CB', 79], ['Kolo Tour\u00e9', 'CB', 75], ['Steven Gerrard', 'DM', 88],
      ['Jordan Henderson', 'CM', 82], ['Joe Allen', 'CM', 79], ['Lucas', 'DM', 77], ['Raheem Sterling', 'RW', 84],
      ['Victor Moses', 'RW', 72], ['Philippe Coutinho', 'AM', 85], ['Luis Su\u00e1rez', 'ST', 94], ['Daniel Sturridge', 'ST', 89],
      ['Iago Aspas', 'ST', 68]] },

    { club: 'Manchester United', season: '2012\u201313', c: '#DA291C', c2: '#FFFFFF', p: [
      ['David de Gea', 'GK', 85], ['Anders Lindegaard', 'GK', 74], ['Rafael', 'RB', 80], ['Phil Jones', 'CB', 78],
      ['Rio Ferdinand', 'CB', 84], ['Jonny Evans', 'CB', 81], ['Nemanja Vidi\u0107', 'CB', 84], ['Chris Smalling', 'CB', 78],
      ['Patrice Evra', 'LB', 82], ['Michael Carrick', 'CM', 87], ['Tom Cleverley', 'CM', 76], ['Paul Scholes', 'CM', 79],
      ['Shinji Kagawa', 'AM', 80], ['Antonio Valencia', 'RW', 80], ['Nani', 'RW', 78], ['Ashley Young', 'LW', 77],
      ['Ryan Giggs', 'LW', 78], ['Robin van Persie', 'ST', 93], ['Wayne Rooney', 'ST', 87], ['Javier Hern\u00e1ndez', 'ST', 81],
      ['Danny Welbeck', 'ST', 77]] },

    { club: 'Arsenal', season: '2023\u201324', c: '#EF0107', c2: '#FFFFFF', p: [
      ['David Raya', 'GK', 85], ['Ben White', 'RB', 85], ['Takehiro Tomiyasu', 'RB', 79], ['William Saliba', 'CB', 90],
      ['Gabriel Magalh\u00e3es', 'CB', 87], ['Jakub Kiwior', 'CB', 76], ['Oleksandr Zinchenko', 'LB', 80], ['Declan Rice', 'DM', 89],
      ['Jorginho', 'DM', 80], ['Thomas Partey', 'DM', 79], ['Martin \u00d8degaard', 'AM', 90], ['Kai Havertz', 'CM', 84],
      ['Bukayo Saka', 'RW', 90], ['Gabriel Martinelli', 'LW', 83], ['Leandro Trossard', 'LW', 82], ['Gabriel Jesus', 'ST', 80]] },

    { club: 'Liverpool', season: '2004\u201305', c: '#C8102E', c2: '#FFFFFF', p: [
      ['Jerzy Dudek', 'GK', 80], ['Steve Finnan', 'RB', 80], ['Jamie Carragher', 'CB', 87], ['Sami Hyypi\u00e4', 'CB', 84],
      ['Djimi Traor\u00e9', 'LB', 72], ['John Arne Riise', 'LB', 80], ['Dietmar Hamann', 'DM', 82], ['Xabi Alonso', 'CM', 86],
      ['Steven Gerrard', 'CM', 91], ['Luis Garc\u00eda', 'RW', 82], ['Harry Kewell', 'LW', 78], ['Vladim\u00edr \u0160micer', 'AM', 76],
      ['Milan Baro\u0161', 'ST', 80], ['Djibril Ciss\u00e9', 'ST', 78], ['Fernando Morientes', 'ST', 79]] },

    { club: 'Ipswich Town', season: '2000\u201301', c: '#0033A0', c2: '#FFFFFF', p: [
      ['Richard Wright', 'GK', 83], ['Fabian Wilnis', 'RB', 72], ['John McGreal', 'CB', 74], ['Hermann Hrei\u00f0arsson', 'CB', 76],
      ['Titus Bramble', 'CB', 72], ['Mark Venus', 'CB', 72], ['Jamie Clapham', 'LB', 73], ['Gary Croft', 'LB', 70],
      ['Matt Holland', 'CM', 79], ['Jim Magilton', 'CM', 77], ['Jermaine Wright', 'CM', 72], ['Martijn Reuser', 'LW', 76],
      ['Marcus Stewart', 'ST', 80], ['James Scowcroft', 'ST', 74], ['Richard Naylor', 'ST', 70], ['Alun Armstrong', 'ST', 70]] },

    { club: 'Derby County', season: '2007\u201308', c: '#F4F4F4', c2: '#111111', p: [
      ['Stephen Bywater', 'GK', 67], ['Roy Carroll', 'GK', 70], ['Tyrone Mears', 'RB', 66], ['Darren Moore', 'CB', 68],
      ['Claude Davis', 'CB', 65], ['Dean Leacock', 'CB', 64], ['Alan Stubbs', 'CB', 70], ['Jay McEveley', 'LB', 64],
      ['Robbie Savage', 'CM', 70], ['Stephen Pearson', 'CM', 65], ['Giles Barnes', 'AM', 68], ['Eddie Lewis', 'LW', 66],
      ['Craig Fagan', 'RW', 66], ['Hossam Ghaly', 'RW', 67], ['Kenny Miller', 'ST', 70], ['Steve Howard', 'ST', 67],
      ['Emanuel Villa', 'ST', 66], ['Robert Earnshaw', 'ST', 69]] },

    { club: 'Sunderland', season: '2005\u201306', c: '#EB172B', c2: '#FFFFFF', p: [
      ['Kelvin Davis', 'GK', 68], ['Ben Alnwick', 'GK', 64], ['Stephen Wright', 'RB', 66], ['Nyron Nosworthy', 'CB', 64],
      ['Gary Breen', 'CB', 69], ['Steven Caldwell', 'CB', 70], ['Danny Collins', 'LB', 67], ['George McCartney', 'LB', 69],
      ['Dean Whitehead', 'CM', 70], ['Tommy Miller', 'CM', 68], ['Liam Lawrence', 'RW', 68], ['Julio Arca', 'LW', 70],
      ['Jon Stead', 'ST', 66], ['Anthony Le Tallec', 'ST', 67], ['Chris Brown', 'ST', 64], ['Daryl Murphy', 'ST', 66]] }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
