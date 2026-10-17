// Wörter fürs Zeichenspiel. Gut malbar, auf Deutsch. Neue Wörter einfach unten anhängen.
// Stufe grob: Erst die leichten, dann etwas kniffligere.
const EASY = `Haus Baum Sonne Auto Katze Hund Fisch Blume Herz Stern Mond Ball Brille Schuh Hut Apfel Banane Pizza Eis Kuchen
Fahrrad Boot Flugzeug Zug Uhr Schlüssel Buch Stuhl Tisch Bett Lampe Tür Fenster Regenschirm Wolke Regenbogen Berg Schneemann Baby Geist
Schlange Spinne Maus Elefant Giraffe Hai Vogel Schmetterling Biene Schnecke Krone Schwert Rakete Pilz Kaktus Burger Pommes Ei Kerze Geschenk
Handy Fernseher Gitarre Trommel Brief Zahn Auge Nase Ohr Hand Fuß Bart Ampel Leiter Zelt Insel Vulkan Pyramide Anker Kreuz`;

const MEDIUM = `Feuerwehr Polizei Krankenwagen Bagger Traktor Hubschrauber U-Boot Leuchtturm Riesenrad Achterbahn Karussell Schaukel Rutsche Sandburg Lagerfeuer Hängematte
Zahnbürste Staubsauger Waschmaschine Kühlschrank Mikrowelle Toaster Bügeleisen Fernbedienung Kopfhörer Laptop Kamera Lautsprecher Mikrofon Joystick
Fußball Tor Basketball Tennis Bowling Hantel Skateboard Surfbrett Ski Medaille Pokal Boxhandschuh Darts Golf
Pinguin Krokodil Känguru Eule Oktopus Qualle Seestern Flamingo Igel Faultier Einhorn Drache Dinosaurier Roboter Alien Pirat Zauberer Hexe Vampir Mumie Ritter Clown
Bier Cocktail Döner Sushi Popcorn Brezel Hotdog Donut Croissant Wassermelone Ananas Erdbeere Zitrone Avocado Karotte Mais
Schneeflocke Blitz Tornado Wasserfall Wüste Iglu Schloss Kirche Windmühle Brücke Tankstelle Gefängnis Zirkus Kino Disco
Tattoo Sonnenbrille Krawatte Rucksack Koffer Geldbeutel Diamant Schatztruhe Lupe Kompass Landkarte Taschenlampe Fallschirm Heißluftballon`;

const HARD = `Selfie Stau Kater Muskelkater Schluckauf Sonnenbrand Albtraum Weihnachtsmann Osterhase Zahnfee Meerjungfrau Werwolf Superheld
Eiffelturm Freiheitsstatue Mount-Everest Titanic Bermuda-Dreieck Nordpol Mallorca Oktoberfest Silvester Hochzeit Geburtstag Führerschein Zeugnis
Fitnessstudio Friseur Zahnarzt Bäcker Astronaut Feuerwehrmann Taucher Detektiv Influencer DJ Koch Maler Gärtner
Schneeballschlacht Kissenschlacht Bierpong Karaoke Tauziehen Seilspringen Handstand Purzelbaum Spagat Liegestütz
Wäscheleine Gartenzwerg Vogelscheuche Briefkasten Mülltonne Parkuhr Rolltreppe Fahrstuhl Drehtür Klopapier`;

// Erweiterung (Okt. 2026)
const EASY2 = `Wurm Frosch Hase Schwein Kuh Pferd Ente Huhn Löwe Bär Wal Krake Blatt Gras Feuer Wasser Tropfen Schnee Kreis Würfel
Mütze Socke Hose Kleid Gabel Löffel Messer Teller Tasse Flasche Glas Topf Brot Käse Wurst Kirsche Birne Tomate Gurke Zwiebel
Drachen Luftballon Bonbon Lolli Pflaster Schere Stift Kamm Spiegel Seife Bus Schiff Traktor Rad Kette Glocke Pfeil Bogen`;
const MEDIUM2 = `Gorilla Panda Zebra Nashorn Nilpferd Koala Fledermaus Papagei Schildkröte Pfau Skorpion Marienkäfer Ameise Delfin Froschkönig
Kran Müllauto Feuerlöscher Rasenmäher Kettensäge Hammer Säge Bohrmaschine Schraube Magnet Batterie Glühbirne Steckdose Ventilator
Gameboy Controller Tablet Drucker Tastatur Wecker Sanduhr Thermometer Waage Teleskop Mikroskop Globus
Spaghetti Lasagne Taco Burrito Pfannkuchen Waffel Muffin Torte Milchshake Kaffee Smoothie Gummibärchen Schokolade Zuckerwatte
Zauberstab Besen Kristallkugel Schatzkarte Piratenschiff Flaschenpost Sandalen Badehose Liegestuhl Sonnenschirm Muschel Leuchtturmwärter`;
const HARD2 = `Grillparty Sonnenfinsternis Polarlicht Erdbeben Klimawandel Zeitreise Gedankenlesen Lampenfieber Heimweh Liebeskummer
Wasserrutsche Autowaschanlage Fahrkartenautomat Pfandautomat Selbstbedienungskasse Drive-in Lieferdienst Homeoffice Videocall
Elfmeterschießen Rote-Karte Abseits Torjubel Ehrenrunde Siegerehrung Fotofinish Marathonläufer Bodybuilder Sumo-Ringer
Geisterbahn Spiegelkabinett Autoscooter Zuckerwattestand Losbude Wahrsagerin Feuerspucker Jongleur Seiltänzer Bauchredner
Schneeengel Sandmann Gespenst Mondlandung Sternschnuppe Wunschbrunnen Glückskeks Hufeisen Kleeblatt Schornsteinfeger`;

const toList = (s, level) => s.split(/\s+/).filter(Boolean).map((w) => ({ word: w.replace(/-/g, ' '), level }));

const uniq = (list) => list.filter((w, i) => list.findIndex((x) => x.word === w.word) === i);
export const DRAW_WORDS = uniq([...toList(EASY, 1), ...toList(EASY2, 1), ...toList(MEDIUM, 2), ...toList(MEDIUM2, 2), ...toList(HARD, 3), ...toList(HARD2, 3)]);

// 3 Wörter zur Auswahl: je eins leicht, mittel, schwer (sofern noch frei)
export function wordOptions(used = []) {
  const free = (lvl) => {
    const all = DRAW_WORDS.filter((w) => w.level === lvl);
    const f = all.filter((w) => !used.includes(w.word));
    return f.length ? f : all;
  };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return [pick(free(1)), pick(free(2)), pick(free(3))];
}
