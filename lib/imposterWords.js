// Wortliste für Imposter. Jeder Eintrag: [Lösungswort, Tippwort für den Imposter].
// Das Tippwort passt grob zum Thema, verrät das Lösungswort aber nicht direkt.
// Neue Wörter einfach unten in eine Liste eintragen – mehr ist nicht nötig.

export const WORD_CATEGORIES = [
  {
    key: 'essen', name: 'Essen & Trinken', icon: '🍔', words: [
      ['Pizza', 'Italien'], ['Döner', 'Imbiss'], ['Sushi', 'Japan'], ['Burger', 'Fast Food'], ['Pommes', 'Frittiert'],
      ['Spaghetti', 'Nudeln'], ['Currywurst', 'Ruhrpott'], ['Schnitzel', 'Paniert'], ['Croissant', 'Frühstück'], ['Pfannkuchen', 'Pfanne'],
      ['Popcorn', 'Kino'], ['Nutella', 'Glas'], ['Eis', 'Sommer'], ['Bier', 'Kasten'], ['Kaffee', 'Morgen'],
      ['Energy Drink', 'Dose'], ['Tacos', 'Mexiko'], ['Avocado', 'Grün'], ['Erdbeere', 'Rot'], ['Banane', 'Gelb'],
      ['Ketchup', 'Flasche'], ['Brezel', 'Bayern'], ['Raclette', 'Silvester'], ['Grillen', 'Kohle'],
    ],
  },
  {
    key: 'orte', name: 'Orte', icon: '📍', words: [
      ['Strand', 'Urlaub'], ['Flughafen', 'Koffer'], ['Fitnessstudio', 'Schweiß'], ['Krankenhaus', 'Weiß'], ['Schule', 'Pause'],
      ['Kino', 'Dunkel'], ['Club', 'Nacht'], ['Bahnhof', 'Warten'], ['Supermarkt', 'Kasse'], ['Tankstelle', 'Auto'],
      ['Zoo', 'Käfig'], ['Friseur', 'Spiegel'], ['Stadion', 'Fans'], ['Bibliothek', 'Leise'], ['Kirche', 'Glocke'],
      ['Gefängnis', 'Gitter'], ['Freizeitpark', 'Schlange'], ['Sauna', 'Holz'], ['Campingplatz', 'Zelt'], ['Weihnachtsmarkt', 'Winter'],
      ['Baumarkt', 'Werkzeug'], ['Spielplatz', 'Sand'], ['IKEA', 'Schweden'], ['Mallorca', 'Insel'],
    ],
  },
  {
    key: 'tiere', name: 'Tiere', icon: '🦁', words: [
      ['Hund', 'Haustier'], ['Katze', 'Pfote'], ['Löwe', 'Afrika'], ['Pinguin', 'Kalt'], ['Hai', 'Meer'],
      ['Giraffe', 'Hoch'], ['Elefant', 'Groß'], ['Affe', 'Baum'], ['Schlange', 'Gift'], ['Spinne', 'Netz'],
      ['Kuh', 'Bauernhof'], ['Pferd', 'Reiten'], ['Biene', 'Summen'], ['Krokodil', 'Fluss'], ['Eule', 'Nacht'],
      ['Känguru', 'Australien'], ['Delfin', 'Schlau'], ['Hamster', 'Käfig'], ['Papagei', 'Bunt'], ['Faultier', 'Langsam'],
      ['Ameise', 'Klein'], ['Wolf', 'Rudel'], ['Flamingo', 'Rosa'], ['Schnecke', 'Haus'],
    ],
  },
  {
    key: 'sport', name: 'Sport & Freizeit', icon: '⚽', words: [
      ['Fußball', 'Rasen'], ['Basketball', 'Korb'], ['Tennis', 'Schläger'], ['Boxen', 'Handschuhe'], ['Schwimmen', 'Wasser'],
      ['Skifahren', 'Berg'], ['Golf', 'Loch'], ['Formel 1', 'Schnell'], ['Bowling', 'Kugel'], ['Darts', 'Pfeil'],
      ['Surfen', 'Welle'], ['Yoga', 'Matte'], ['Bankdrücken', 'Gym'], ['Joggen', 'Schuhe'], ['Tischtennis', 'Platte'],
      ['Klettern', 'Seil'], ['Handball', 'Halle'], ['Elfmeter', 'Tor'], ['Schach', 'Brett'], ['Angeln', 'Geduld'],
      ['Poker', 'Karten'], ['Skateboard', 'Rollen'], ['Marathon', 'Lang'], ['Billard', 'Queue'],
    ],
  },
  {
    key: 'dinge', name: 'Gegenstände', icon: '📦', words: [
      ['Handy', 'Akku'], ['Zahnbürste', 'Bad'], ['Regenschirm', 'Wetter'], ['Brille', 'Augen'], ['Kopfhörer', 'Musik'],
      ['Schlüssel', 'Tür'], ['Kerze', 'Licht'], ['Spiegel', 'Glas'], ['Fernbedienung', 'Sofa'], ['Wecker', 'Morgen'],
      ['Rucksack', 'Tragen'], ['Sonnenbrille', 'Sommer'], ['Feuerzeug', 'Tasche'], ['Laptop', 'Arbeit'], ['Kühlschrank', 'Küche'],
      ['Toaster', 'Brot'], ['Staubsauger', 'Laut'], ['Kissen', 'Bett'], ['Geldbeutel', 'Karten'], ['Uhr', 'Zeit'],
      ['Würfel', 'Spiel'], ['Luftballon', 'Party'], ['Hammer', 'Nagel'], ['Fahrrad', 'Kette'],
    ],
  },
  {
    key: 'berufe', name: 'Berufe', icon: '👷', words: [
      ['Polizist', 'Uniform'], ['Arzt', 'Kittel'], ['Lehrer', 'Tafel'], ['Pilot', 'Himmel'], ['Koch', 'Küche'],
      ['Feuerwehrmann', 'Rot'], ['Friseur', 'Schere'], ['Bäcker', 'Früh'], ['DJ', 'Musik'], ['Influencer', 'Handy'],
      ['Zahnarzt', 'Bohren'], ['Maurer', 'Baustelle'], ['Anwalt', 'Gericht'], ['Taxifahrer', 'Stadt'], ['Kellner', 'Trinkgeld'],
      ['Astronaut', 'Rakete'], ['Fußballtrainer', 'Seitenlinie'], ['Tierarzt', 'Hund'], ['Gärtner', 'Pflanzen'], ['Postbote', 'Briefe'],
      ['Mechaniker', 'Öl'], ['Türsteher', 'Club'], ['Sänger', 'Bühne'], ['Fotograf', 'Kamera'],
    ],
  },
  {
    key: 'pop', name: 'Filme, Serien & Promis', icon: '🎬', words: [
      ['Harry Potter', 'Zauberei'], ['Titanic', 'Schiff'], ['Spider-Man', 'Held'], ['Star Wars', 'Weltall'], ['Shrek', 'Grün'],
      ['Game of Thrones', 'Drachen'], ['Haus des Geldes', 'Masken'], ['Breaking Bad', 'Wohnmobil'], ['Die Simpsons', 'Gelb'], ['SpongeBob', 'Meer'],
      ['James Bond', 'Agent'], ['König der Löwen', 'Afrika'], ['Squid Game', 'Spiel'], ['Stranger Things', 'Achtziger'], ['Batman', 'Nacht'],
      ['Fluch der Karibik', 'Piraten'], ['Herr der Ringe', 'Reise'], ['Minecraft', 'Blöcke'], ['GTA', 'Stadt'], ['FIFA', 'Konsole'],
      ['Netflix', 'Streaming'], ['Pokémon', 'Sammeln'], ['Mario', 'Pilz'], ['Barbie', 'Rosa'],
    ],
  },
  {
    key: 'party', name: 'Party & Alltag', icon: '🎉', words: [
      ['Geburtstag', 'Kuchen'], ['Hochzeit', 'Ring'], ['Silvester', 'Feuerwerk'], ['Weihnachten', 'Geschenke'], ['Halloween', 'Kostüm'],
      ['Kater', 'Morgen'], ['Bierpong', 'Becher'], ['Karaoke', 'Mikrofon'], ['Festival', 'Zelt'], ['Junggesellenabschied', 'Gruppe'],
      ['Umzug', 'Kartons'], ['Führerschein', 'Prüfung'], ['Erstes Date', 'Nervös'], ['Urlaub', 'Koffer'], ['Montag', 'Woche'],
      ['Stau', 'Autobahn'], ['Sonnenbrand', 'Haut'], ['Schluckauf', 'Plötzlich'], ['Gewitter', 'Laut'], ['Zahnschmerzen', 'Mund'],
      ['Oktoberfest', 'Bayern'], ['Lotto', 'Zahlen'], ['Fahrstuhl', 'Knopf'], ['Tattoo', 'Haut'],
    ],
  },
];

// Erweiterung (Okt. 2026): mehr Wörter pro Thema
const MORE = {
  essen: [['Lasagne', 'Schichten'], ['Ramen', 'Suppe'], ['Kebab', 'Spieß'], ['Waffel', 'Muster'], ['Donut', 'Loch'], ['Käse', 'Holland'], ['Gummibärchen', 'Tüte'], ['Chips', 'Knistern'], ['Cola', 'Kohlensäure'], ['Wein', 'Glas'], ['Smoothie', 'Mixer'], ['Müsli', 'Schüssel'], ['Zwiebel', 'Weinen'], ['Knoblauch', 'Geruch'], ['Spiegelei', 'Pfanne'], ['Fondue', 'Topf'], ['Bubble Tea', 'Strohhalm'], ['Kartoffelsalat', 'Party']],
  orte: [['Wellenbad', 'Rutsche'], ['Bowlingbahn', 'Schuhe'], ['Kneipe', 'Tresen'], ['Museum', 'Alt'], ['Bauernhof', 'Tiere'], ['Autobahn', 'Raststätte'], ['Hotel', 'Rezeption'], ['Parkhaus', 'Ticket'], ['Rathaus', 'Termin'], ['Waschanlage', 'Bürsten'], ['Berlin', 'Hauptstadt'], ['Paris', 'Turm'], ['New York', 'Hochhaus'], ['Dubai', 'Wüste'], ['Ski-Hütte', 'Schnee'], ['Kreuzfahrtschiff', 'Buffet'], ['Escape Room', 'Rätsel'], ['Shisha-Bar', 'Rauch']],
  tiere: [['Gorilla', 'Stark'], ['Panda', 'Bambus'], ['Tiger', 'Streifen'], ['Zebra', 'Muster'], ['Koala', 'Schlafen'], ['Fledermaus', 'Höhle'], ['Krake', 'Arme'], ['Schildkröte', 'Panzer'], ['Igel', 'Stacheln'], ['Waschbär', 'Maske'], ['Hahn', 'Morgen'], ['Esel', 'Stur'], ['Kamel', 'Wüste'], ['Eisbär', 'Weiß'], ['Mücke', 'Stich'], ['Qualle', 'Strand'], ['Wal', 'Riesig'], ['Fuchs', 'Schlau']],
  sport: [['Volleyball', 'Netz'], ['Eishockey', 'Puck'], ['American Football', 'Helm'], ['Ringen', 'Matte'], ['Reiten', 'Sattel'], ['Fallschirmspringen', 'Flugzeug'], ['Tauchen', 'Flasche'], ['Rudern', 'Boot'], ['Paintball', 'Farbe'], ['Kart fahren', 'Helm'], ['Snowboarden', 'Piste'], ['Wandern', 'Rucksack'], ['Bouldern', 'Halle'], ['Kickboxen', 'Tritt'], ['Fifa zocken', 'Controller'], ['Minigolf', 'Hindernis'], ['Bungee-Jumping', 'Seil'], ['Radrennen', 'Tour']],
  dinge: [['Zahnpasta', 'Tube'], ['Ladekabel', 'Steckdose'], ['Powerbank', 'Unterwegs'], ['Kaffeemaschine', 'Morgen'], ['Bügeleisen', 'Hemd'], ['Föhn', 'Haare'], ['Schere', 'Schneiden'], ['Klebeband', 'Rolle'], ['Taschenlampe', 'Dunkel'], ['Gitarre', 'Saiten'], ['Fernseher', 'Wohnzimmer'], ['Controller', 'Zocken'], ['Bierdeckel', 'Kneipe'], ['Mülleimer', 'Küche'], ['Kalender', 'Termine'], ['Parfüm', 'Duft'], ['Kondom', 'Verpackung'], ['Feuerlöscher', 'Notfall']],
  berufe: [['Pilotin', 'Cockpit'], ['Programmierer', 'Code'], ['Metzger', 'Fleisch'], ['Bauer', 'Traktor'], ['Richter', 'Hammer'], ['Krankenpfleger', 'Schicht'], ['Busfahrer', 'Haltestelle'], ['Zauberer', 'Hut'], ['Clown', 'Nase'], ['Schauspieler', 'Rolle'], ['Detektiv', 'Lupe'], ['Bodyguard', 'Anzug'], ['Barkeeper', 'Shaker'], ['Youtuber', 'Kamera'], ['Makler', 'Wohnung'], ['Schiedsrichter', 'Pfeife'], ['Rettungsschwimmer', 'Strand'], ['Tätowierer', 'Nadel']],
  pop: [['Avengers', 'Team'], ['Frozen', 'Schnee'], ['Fast & Furious', 'Autos'], ['Joker', 'Lachen'], ['Peaky Blinders', 'Mützen'], ['Friends', 'Café'], ['The Walking Dead', 'Zombies'], ['Wednesday', 'Schule'], ['Toy Story', 'Spielzeug'], ['Findet Nemo', 'Fisch'], ['Jurassic Park', 'Insel'], ['Matrix', 'Pille'], ['Fortnite', 'Insel'], ['Call of Duty', 'Krieg'], ['Tetris', 'Steine'], ['Among Us', 'Raumschiff'], ['Gollum', 'Schatz'], ['Darth Vader', 'Atmen']],
  party: [['Flaschendrehen', 'Kreis'], ['Wahrheit oder Pflicht', 'Mutig'], ['Grillabend', 'Garten'], ['Roadtrip', 'Auto'], ['Abiball', 'Kleid'], ['Hausparty', 'Nachbarn'], ['Kneipentour', 'Stadt'], ['Kinoabend', 'Sofa'], ['Zahnarzttermin', 'Angst'], ['Prüfung', 'Lernen'], ['Bewerbungsgespräch', 'Anzug'], ['Liebeskummer', 'Traurig'], ['Kochabend', 'Topf'], ['Fußballabend', 'Bier'], ['Muskelkater', 'Morgen'], ['Verschlafen', 'Wecker'], ['Handy verloren', 'Suchen'], ['Fremdschämen', 'Peinlich']],
};
for (const c of WORD_CATEGORIES) for (const w of MORE[c.key] || []) if (!c.words.some((x) => x[0] === w[0])) c.words.push(w);

export const ALL_KEY = 'alle';

// Zufälliges Wort ziehen, das in dieser Runde noch nicht dran war
export function pickWord(categoryKey, used = []) {
  const cats = categoryKey && categoryKey !== ALL_KEY ? WORD_CATEGORIES.filter((c) => c.key === categoryKey) : WORD_CATEGORIES;
  const list = (cats.length ? cats : WORD_CATEGORIES).flatMap((c) => c.words.map(([word, tip]) => ({ word, tip, category: c.name, icon: c.icon })));
  const fresh = list.filter((w) => !used.includes(w.word));
  const pool = fresh.length ? fresh : list;
  return pool[Math.floor(Math.random() * pool.length)];
}
