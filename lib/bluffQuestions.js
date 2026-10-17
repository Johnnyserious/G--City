// Lügen-Quiz: Themen + feste Startfragen. Claude füllt später neue Fragen in der Datenbank nach
// (Tabelle questions, category = 'Lügen: <Thema>', level = 1).
// Format: [Frage, Antwort, [weitere akzeptierte Schreibweisen], Erklärung]

export const BLUFF_TOPICS = [
  { key: 'tiere', name: 'Tiere', icon: '🦁' },
  { key: 'essen', name: 'Essen & Trinken', icon: '🍔' },
  { key: 'geschichte', name: 'Geschichte', icon: '🏛️' },
  { key: 'promis', name: 'Promis & Popkultur', icon: '⭐' },
  { key: 'sport', name: 'Sport', icon: '⚽' },
  { key: 'kurios', name: 'Kurioses', icon: '🤯' },
  { key: 'marken', name: 'Marken & Erfindungen', icon: '💡' },
  { key: 'welt', name: 'Länder & Orte', icon: '🌍' },
  { key: 'wissen', name: 'Körper & Wissenschaft', icon: '🔬' },
];
export const ALL = 'alle';
export const topicCategory = (key) => 'Lügen: ' + (BLUFF_TOPICS.find((t) => t.key === key)?.name || key);

const Q = {
  tiere: [
    ['Welches australische Tier kann nicht rückwärts laufen?', 'Känguru', ['Kaenguru', 'Kängurus'], 'Schwanz und große Hinterbeine machen Rückwärtslaufen praktisch unmöglich.'],
    ['Welche Farbe hat die Zunge einer Giraffe?', 'Dunkelblau', ['blau', 'blauschwarz', 'schwarz', 'lila'], 'Die dunkle Farbe schützt die lange Zunge vermutlich vor Sonnenbrand.'],
    ['Wie viele Herzen hat ein Oktopus?', '3', ['drei'], 'Zwei pumpen Blut durch die Kiemen, eins durch den restlichen Körper.'],
    ['Welche Form hat der Kot von Wombats?', 'Würfel', ['wuerfel', 'würfelförmig', 'eckig'], 'Wombats markieren damit ihr Revier – Würfel rollen nicht weg.'],
    ['Was machen Seeotter beim Schlafen, damit sie nicht voneinander wegtreiben?', 'Händchen halten', ['Hände halten', 'sich an den Händen halten', 'Pfoten halten'], 'Manche wickeln sich zusätzlich in Seetang ein.'],
    ['Welches Tier hat Fingerabdrücke, die menschlichen zum Verwechseln ähnlich sind?', 'Koala', ['Koalas', 'Koalabär'], 'Selbst unter dem Mikroskop sind sie kaum von unseren zu unterscheiden.'],
    ['Wie nennt man im Englischen eine Gruppe Flamingos?', 'Flamboyance', [], 'Flamboyant heißt so viel wie extravagant oder auffällig.'],
    ['Welches Tier hat die größten Augen im ganzen Tierreich?', 'Riesenkalmar', ['Koloss-Kalmar', 'Kolosskalmar', 'Kalmar', 'Tintenfisch'], 'Seine Augen sind so groß wie Fußbälle.'],
    ['Welcher Vogel ist im Sturzflug das schnellste Tier der Welt?', 'Wanderfalke', ['Falke'], 'Im Sturzflug erreicht er über 300 km/h.'],
    ['Welche Farbe hat das Blut von Hummern?', 'Blau', ['bläulich', 'hellblau'], 'Statt Eisen transportiert bei ihnen kupferhaltiges Hämocyanin den Sauerstoff.'],
    ['Wie viele Kammern hat der Magen einer Kuh?', '4', ['vier'], 'Pansen, Netzmagen, Blättermagen und Labmagen.'],
  ],
  essen: [
    ['Aus welchem Land stammt die Kiwi-Frucht ursprünglich?', 'China', [], 'Früher hieß sie „Chinesische Stachelbeere“, erst Neuseeland gab ihr den Namen Kiwi.'],
    ['Wofür wurde Tomatenketchup in den 1830er-Jahren in den USA verkauft?', 'Als Medizin', ['Medizin', 'Arznei', 'Heilmittel', 'Medikament'], 'Es gab sogar Ketchup-Pillen gegen Verdauungsprobleme.'],
    ['Welches gelbe Obst ist botanisch gesehen eine Beere?', 'Banane', ['Bananen'], 'Erdbeeren dagegen sind botanisch keine Beeren.'],
    ['Nach wem ist der Cappuccino benannt?', 'Kapuzinermönche', ['Kapuziner', 'Mönche', 'Kapuzinermönchen'], 'Die Farbe erinnert an ihre braunen Kutten.'],
    ['Was sollen Weißwürste traditionell nicht mehr hören?', 'Das Zwölf-Uhr-Läuten', ['Mittagsläuten', 'Zwölfuhrläuten', 'Mittagsglocken', '12-Uhr-Läuten'], 'Früher gab es keine Kühlung, also mussten sie bis Mittag gegessen sein.'],
    ['Welches Gewürz ist nach Gewicht das teuerste der Welt?', 'Safran', [], 'Für ein Kilo braucht man rund 150.000 Krokusblüten.'],
    ['Aus welcher Pflanze wird Tequila hergestellt?', 'Agave', ['blaue Agave', 'Agaven'], 'Echter Tequila muss aus der Blauen Weber-Agave stammen.'],
    ['Welche „Nuss“ ist botanisch eine Hülsenfrucht?', 'Erdnuss', ['Erdnüsse'], 'Sie ist näher mit Erbsen und Bohnen verwandt als mit Walnüssen.'],
    ['Welche Farbe hatten Karotten ursprünglich meistens?', 'Lila', ['violett', 'purpur', 'gelb'], 'Orange Karotten wurden erst später in den Niederlanden gezüchtet.'],
    ['In welchem Land wurde Fanta erfunden?', 'Deutschland', [], 'Sie entstand 1940, als Coca-Cola-Sirup nicht mehr geliefert werden konnte.'],
    ['Welche Droge war in den Anfangsjahren in Coca-Cola enthalten?', 'Kokain', ['Koks', 'Coca', 'Kokablätter'], 'Bis Anfang des 20. Jahrhunderts steckte ein Extrakt aus Kokablättern drin.'],
  ],
  geschichte: [
    ['Wie lange dauerte der kürzeste Krieg der Geschichte (Großbritannien gegen Sansibar, 1896)?', '38 Minuten', ['38', '40 Minuten', '45 Minuten', 'unter einer Stunde'], 'Je nach Quelle 38 bis 45 Minuten.'],
    ['Was steckte in den Schnäbeln der Pestdoktor-Masken?', 'Kräuter', ['Kräuter und Gewürze', 'Duftstoffe', 'Gewürze', 'Blumen'], 'Man glaubte, die Pest werde durch schlechte Luft übertragen.'],
    ['Welche Tiere wurden im Mittelalter tatsächlich vor Gericht angeklagt und verurteilt?', 'Schweine', ['Schwein'], 'Es gab sogar Verteidiger und Hinrichtungen.'],
    ['In welcher Stadt erschien 1605 die erste Zeitung der Welt?', 'Straßburg', ['Strassburg', 'Strasbourg'], 'Sie hieß „Relation“ und erschien wöchentlich.'],
    ['Kleopatra lebte zeitlich näher an … als am Bau der Cheops-Pyramide?', 'der Mondlandung', ['Mondlandung', 'heute', 'der Erfindung des iPhones'], 'Zwischen Pyramide und Kleopatra liegen rund 2.500 Jahre, zwischen ihr und der Mondlandung etwa 2.000.'],
    ['Die Universität Oxford ist älter als welches berühmte Reich?', 'Aztekenreich', ['Azteken', 'das Aztekenreich'], 'In Oxford wurde schon um 1096 gelehrt, Tenochtitlan wurde 1325 gegründet.'],
    ['Womit spülten manche alten Römer ihren Mund aus?', 'Urin', ['Pipi', 'Pisse', 'Harn'], 'Das Ammoniak darin sollte die Zähne weiß machen.'],
    ['Was trugen Wikinger in Wirklichkeit NICHT, obwohl man es ständig sieht?', 'Hörnerhelme', ['Helme mit Hörnern', 'Hörner'], 'Das Bild stammt aus Opern-Kostümen des 19. Jahrhunderts.'],
    ['Welcher US-Präsident hatte eine Lizenz als Schankwirt?', 'Abraham Lincoln', ['Lincoln'], 'Er betrieb in jungen Jahren eine Kneipe in Illinois.'],
    ['Wie viele Jahre dauerte der Hundertjährige Krieg?', '116', ['116 Jahre', 'hundertsechzehn'], 'Von 1337 bis 1453 – mit vielen Pausen.'],
  ],
  promis: [
    ['Wie lautet der echte Vorname von Lady Gaga?', 'Stefani', ['Stefani Germanotta', 'Stefanie'], 'Ihr voller Name: Stefani Joanne Angelina Germanotta.'],
    ['Welcher Schauspieler lehnte die Rolle des Neo in „Matrix“ ab?', 'Will Smith', ['Smith'], 'Er drehte stattdessen „Wild Wild West“.'],
    ['Welches Instrument spielte Albert Einstein leidenschaftlich?', 'Geige', ['Violine'], 'Er nannte seine Geige „Lina“.'],
    ['Welche natürliche Haarfarbe hatte Elvis Presley?', 'Blond', ['dunkelblond', 'aschblond'], 'Die schwarzen Haare waren gefärbt.'],
    ['Welcher Rockstar hat einen Doktortitel in Astrophysik?', 'Brian May', ['May'], 'Der Queen-Gitarrist schloss seine Doktorarbeit 2007 ab.'],
    ['Wie heißt der Hund von Doc Brown in „Zurück in die Zukunft“?', 'Einstein', [], 'Er war der erste Zeitreisende im Film.'],
    ['Welchen Namen sollte Micky Maus ursprünglich bekommen?', 'Mortimer', ['Mortimer Mouse', 'Mortimer Maus'], 'Walt Disneys Frau fand Mickey besser.'],
    ['Welcher Film spielte als erster weltweit über eine Milliarde Dollar ein?', 'Titanic', [], 'James Camerons Film schaffte das 1998.'],
    ['In welchem Dorf wurde Arnold Schwarzenegger geboren?', 'Thal', ['Thal bei Graz'], 'Thal liegt in der Steiermark nahe Graz.'],
    ['Als was arbeitete Harrison Ford, bevor er berühmt wurde?', 'Zimmermann', ['Tischler', 'Schreiner', 'Handwerker'], 'Er baute sogar Möbel für Hollywood-Leute.'],
  ],
  sport: [
    ['Welche Sportart erfand ein Sportlehrer, indem er Pfirsichkörbe aufhängte?', 'Basketball', [], 'James Naismith erfand das Spiel 1891.'],
    ['Wie schwer darf ein offizieller Golfball höchstens sein?', '45,93 Gramm', ['45,93', '46 Gramm', '45,9 Gramm', '46'], 'Das ist in den offiziellen Golfregeln festgelegt.'],
    ['Welche Disziplin war von 1900 bis 1920 olympisch?', 'Tauziehen', [], 'Großbritannien holte dabei die meisten Medaillen.'],
    ['Was trugen die Athleten bei den antiken Olympischen Spielen?', 'Nichts', ['nackt', 'gar nichts', 'keine Kleidung'], 'Sie traten nackt an, eingeölt mit Olivenöl.'],
    ['Welche Farbe hatten die Tennisbälle in Wimbledon bis 1986?', 'Weiß', ['weiss'], 'Gelbe Bälle sind im Fernsehen besser zu sehen.'],
    ['Wie lange dauerte das längste Tennismatch der Geschichte (Wimbledon 2010)?', '11 Stunden', ['11 Stunden 5 Minuten', 'elf Stunden', '665 Minuten', 'drei Tage'], 'John Isner gewann gegen Nicolas Mahut nach drei Tagen, im fünften Satz 70:68.'],
    ['Welche Sportart wurde schon auf dem Mond ausgeübt?', 'Golf', [], 'Alan Shepard schlug 1971 zwei Golfbälle.'],
    ['Wofür gab es von 1912 bis 1948 olympische Medaillen, obwohl es kein Sport ist?', 'Kunst', ['Kunstwettbewerbe', 'Malerei', 'Kunst und Literatur'], 'Medaillen gab es für Malerei, Musik, Literatur, Architektur und Bildhauerei.'],
    ['Wie viele Spieler einer Rugby-Union-Mannschaft stehen gleichzeitig auf dem Feld?', '15', ['fünfzehn'], 'Bei Rugby League sind es dagegen 13.'],
  ],
  kurios: [
    ['In welchem Land ist der Verkauf von Kaugummi weitgehend verboten?', 'Singapur', ['Singapore'], 'Das Verbot gilt seit 1992, Ausnahme sind medizinische Kaugummis.'],
    ['Welches Haustier darf man in der Schweiz nicht allein halten?', 'Meerschweinchen', ['Meerschwein'], 'Als soziale Tiere brauchen sie per Gesetz Gesellschaft.'],
    ['Wie heißt die Angst vor langen Wörtern?', 'Hippopotomonstrosesquippedaliophobie', ['Hippopotomonstrosesquipedaliophobie'], 'Ein grausamer Name für genau diese Angst.'],
    ['Welches Lebensmittel wird weltweit am häufigsten gestohlen?', 'Käse', ['Kaese'], 'Laut Handelsstudien verschwindet kein Lebensmittel so oft aus Supermärkten.'],
    ['In welcher Stadt steht das „Museum der zerbrochenen Beziehungen“?', 'Zagreb', [], 'Es zeigt Erinnerungsstücke aus beendeten Beziehungen.'],
    ['Welches Land hat mehr Pyramiden als Ägypten?', 'Sudan', ['der Sudan'], 'Dort stehen über 200 nubische Pyramiden.'],
    ['Wie heißt das österreichische Dorf „Fucking“ seit 2021?', 'Fugging', [], 'Die Ortsschilder wurden einfach zu oft gestohlen.'],
    ['Welche Farbe hat die „Black Box“ im Flugzeug?', 'Orange', ['leuchtorange'], 'So findet man sie nach einem Absturz leichter.'],
  ],
  marken: [
    ['Wofür wurde Luftpolsterfolie ursprünglich erfunden?', 'Als Tapete', ['Tapete', 'Tapeten', '3D-Tapete'], 'Als Tapete floppte sie, als Verpackung wurde sie ein Hit.'],
    ['Was bedeutet der Markenname „Lego“?', 'Spiel gut', ['spiel gut', 'leg godt', 'gut spielen'], 'Er kommt vom dänischen „leg godt“.'],
    ['Wie hieß Google ganz am Anfang?', 'BackRub', ['Backrub', 'Back Rub'], 'Der Name bezog sich auf die Rückverweise (Backlinks) im Netz.'],
    ['Wofür stehen das I und das K in IKEA?', 'Ingvar Kamprad', ['Ingvar Kamprad, der Gründer', 'den Gründer'], 'E und A stehen für seinen Hof Elmtaryd und sein Dorf Agunnaryd.'],
    ['Als was wurde Play-Doh-Knete ursprünglich verkauft?', 'Tapetenreiniger', ['Tapetenreinigungsmittel', 'Putzmittel', 'Reiniger'], 'Erst als Tapeten abwaschbar wurden, wurde daraus Spielzeug.'],
    ['Womit hat Nintendo 1889 angefangen?', 'Spielkarten', ['Karten', 'Kartenspiele', 'Hanafuda'], 'Nintendo stellte japanische Hanafuda-Karten her.'],
    ['Welcher Reifenhersteller vergibt die berühmtesten Restaurant-Sterne?', 'Michelin', [], 'Der Guide sollte Autofahrer zu mehr Fahrten und damit mehr Reifenverschleiß bringen.'],
    ['Was verkaufte Samsung, als die Firma 1938 gegründet wurde?', 'Trockenfisch', ['Fisch', 'Lebensmittel', 'Gemüse', 'Nudeln'], 'Samsung begann als kleiner Händler für Trockenfisch, Gemüse und Nudeln.'],
    ['Welches Produkt entstand aus einem misslungenen Superkleber-Versuch?', 'Post-it', ['Post-its', 'Haftnotizen', 'Klebezettel'], 'Der Kleber hielt zu schwach – perfekt für Notizzettel.'],
    ['Wie wollte Jeff Bezos Amazon ursprünglich nennen?', 'Cadabra', ['Abrakadabra'], 'Klang am Telefon aber zu sehr nach „cadaver“ (Leiche).'],
    ['Woher hat Adidas seinen Namen?', 'Adi Dassler', ['vom Gründer Adi Dassler', 'Adolf Dassler', 'Dassler'], 'Adi war der Spitzname von Gründer Adolf Dassler.'],
    ['Aus welchem Land stammt das Vorbild für Red Bull?', 'Thailand', [], 'Dort hieß der Energy-Drink Krating Daeng, „roter Bulle“.'],
  ],
  welt: [
    ['Welches Land hat die meisten Zeitzonen?', 'Frankreich', [], 'Dank seiner Überseegebiete kommt es auf 12 Zeitzonen.'],
    ['Welches Land hat als einziges keine rechteckige Flagge?', 'Nepal', [], 'Die Flagge besteht aus zwei übereinanderliegenden Dreiecken.'],
    ['Welches große Land hat keinen einzigen dauerhaften Fluss?', 'Saudi-Arabien', ['Saudi Arabien', 'Saudiarabien'], 'Es gibt nur Wadis, die nach Regen kurz Wasser führen.'],
    ['Was ist das Nationaltier von Schottland?', 'Einhorn', ['das Einhorn'], 'Es steht für Reinheit und Stärke.'],
    ['Welche Millionenstadt liegt auf zwei Kontinenten?', 'Istanbul', [], 'Der Bosporus trennt den europäischen vom asiatischen Teil.'],
    ['Welches Land hat die meisten Seen der Welt?', 'Kanada', [], 'Kanada hat mehr Seen als alle anderen Länder zusammen.'],
    ['An wie viele Länder grenzt Deutschland?', '9', ['neun'], 'Mehr Nachbarländer hat in Europa nur Russland.'],
    ['In welchem Land liegt Timbuktu?', 'Mali', [], 'Die Stadt war einst ein reiches Zentrum für Handel und Gelehrte.'],
    ['In welchem Land hat der Weihnachtsmann seine offizielle Postadresse?', 'Finnland', ['Rovaniemi'], 'Sein „Dorf“ steht in Rovaniemi am Polarkreis.'],
  ],
  wissen: [
    ['Welche Körperteile wachsen das ganze Leben lang weiter?', 'Ohren', ['Ohren und Nase', 'Nase', 'die Ohren'], 'Genauer: Knorpel und Haut geben im Alter nach, Ohren und Nase werden größer.'],
    ['Wie viele Knochen hat ein Neugeborenes ungefähr?', '300', ['dreihundert', 'etwa 300', '270'], 'Viele wachsen später zusammen, Erwachsene haben 206.'],
    ['Welche Farbe hat ein Sonnenuntergang auf dem Mars?', 'Blau', ['bläulich'], 'Der feine Staub streut das blaue Licht nach vorne.'],
    ['Welches Organ kann nachwachsen, wenn ein Teil entfernt wurde?', 'Leber', ['die Leber'], 'Schon ein Viertel kann zur alten Größe nachwachsen.'],
    ['Was ist das härteste Material im menschlichen Körper?', 'Zahnschmelz', ['Schmelz'], 'Härter als jeder Knochen.'],
    ['Bei welcher Temperatur zeigen Celsius und Fahrenheit denselben Wert?', 'Minus 40 Grad', ['-40', 'minus 40', '-40 Grad'], 'Bei −40 sind beide Skalen gleich.'],
    ['Wie lange braucht das Sonnenlicht bis zur Erde?', 'Etwa 8 Minuten', ['8 Minuten', 'acht Minuten', '8', 'gut 8 Minuten'], 'Genauer: rund 8 Minuten und 20 Sekunden.'],
    ['Was kann man beim Niesen praktisch nicht?', 'Augen offen halten', ['die Augen offen halten', 'Augen offen lassen'], 'Das Augenschließen ist ein Reflex.'],
    ['Welcher Planet dreht sich andersherum als fast alle anderen?', 'Venus', [], 'Dort geht die Sonne im Westen auf.'],
    ['Aus welchem Element bestehen Diamanten?', 'Kohlenstoff', ['Carbon', 'C'], 'Genau wie der Graphit im Bleistift.'],
  ],
};


// Erweiterung (Okt. 2026): mehr Startfragen. Claude füllt zusätzlich automatisch nach.
const MORE = {
  tiere: [
    ['Wie lange können Faultiere die Luft anhalten?', 'Etwa 40 Minuten', ['40 Minuten', '40', 'vierzig Minuten'], 'Dafür senken sie ihren Herzschlag stark ab – länger als viele Delfine.'],
    ['Welches Tier schläft im Durchschnitt bis zu 22 Stunden am Tag?', 'Koala', ['Koalas'], 'Eukalyptusblätter liefern kaum Energie, also wird gespart.'],
    ['Welche Farbe hat die Haut eines Eisbären unter dem Fell?', 'Schwarz', ['schwarze'], 'Das Fell ist eigentlich durchsichtig und wirkt nur weiß.'],
    ['Womit schmecken Schmetterlinge?', 'Mit den Füßen', ['Füße', 'Füßen', 'Beine', 'Beinen'], 'An den Füßen sitzen Geschmackssinneszellen – so testen sie Blätter.'],
    ['Wie viele Augen hat eine Honigbiene?', '5', ['fünf'], 'Zwei große Facettenaugen und drei kleine Punktaugen auf der Stirn.'],
    ['Welches Tier kann seinen Magen nach außen stülpen, um zu fressen?', 'Seestern', ['Seesterne'], 'Er verdaut seine Beute außerhalb des Körpers.'],
  ],
  essen: [
    ['Welches Obst macht Fleisch zart und lässt die Zunge kribbeln?', 'Ananas', [], 'Das Enzym Bromelain zersetzt Eiweiß – auch auf der Zunge.'],
    ['Was ist eine Gurke botanisch gesehen?', 'Eine Beere', ['Beere', 'Panzerbeere', 'Frucht', 'Obst'], 'Wie Kürbis und Melone gehört sie zu den Panzerbeeren.'],
    ['Welche Frucht schwimmt im Wasser, weil sie zu einem Viertel aus Luft besteht?', 'Apfel', ['Äpfel'], 'Deshalb funktioniert das Apfeltauchen auf Partys.'],
    ['Welches Lebensmittel verdirbt praktisch nie?', 'Honig', [], 'In ägyptischen Gräbern fand man jahrtausendealten, noch essbaren Honig.'],
    ['Wie hieß das Getränk Sprite in Deutschland, als es 1959 auf den Markt kam?', 'Fanta Klare Zitrone', ['Fanta Zitrone', 'Fanta klar'], 'Erst später bekam es den Namen Sprite.'],
  ],
  geschichte: [
    ['Wie hieß der erste Mensch im Weltall?', 'Juri Gagarin', ['Gagarin', 'Yuri Gagarin'], '1961 umrundete er einmal die Erde.'],
    ['Welche Farbe hatte die Freiheitsstatue ursprünglich?', 'Kupferbraun', ['Kupfer', 'braun', 'kupferfarben', 'rotbraun'], 'Die grüne Farbe ist Patina, die erst über Jahrzehnte entstand.'],
    ['Welches Tier wählte Kaiser Caligula angeblich zum Konsul?', 'Sein Pferd', ['Pferd', 'Incitatus'], 'Das Pferd hieß Incitatus – ob die Geschichte stimmt, ist umstritten.'],
    ['Wofür benutzten die alten Ägypter Brotschimmel?', 'Wundbehandlung', ['Wunden', 'Medizin', 'Heilung', 'Entzündungen'], 'Schimmel enthält antibiotische Stoffe – lange vor Penicillin.'],
    ['In welchem Jahr fiel die Berliner Mauer?', '1989', [], 'Am Abend des 9. November öffneten sich die Grenzübergänge.'],
  ],
  promis: [
    ['Wie heißt Rapper Snoop Dogg mit bürgerlichem Namen (Vorname)?', 'Calvin', ['Calvin Broadus'], 'Den Spitznamen „Snoopy“ gab ihm seine Mutter.'],
    ['Welcher Schauspieler war vor seiner Karriere Wrestler und hieß „The Rock“?', 'Dwayne Johnson', ['Dwayne'], 'Er stammt aus einer Wrestling-Familie.'],
    ['Was war Pablo Picassos erstes Wort?', 'Bleistift', ['Lápiz', 'Piz', 'Stift'], 'Auf Spanisch: „piz“, kurz für lápiz.'],
    ['Wie heißt die Hauptfigur in „Breaking Bad“ mit Vornamen?', 'Walter', ['Walt', 'Walter White'], 'Sein Alter Ego heißt Heisenberg.'],
    ['Welche Sängerin heißt mit bürgerlichem Namen Robyn Fenty?', 'Rihanna', [], 'Fenty ist auch der Name ihrer Kosmetikmarke.'],
  ],
  sport: [
    ['Welches Land hat bisher die meisten Fußball-Weltmeistertitel der Männer?', 'Brasilien', [], 'Fünf Titel: 1958, 1962, 1970, 1994 und 2002.'],
    ['Wie viele Löcher hat ein normaler Golfplatz?', '18', ['achtzehn'], 'Früher hatte St Andrews sogar 22 Löcher.'],
    ['Wie lange dauert eine Runde im Profiboxen?', '3 Minuten', ['3', 'drei Minuten', 'drei'], 'Danach gibt es eine Minute Pause.'],
    ['Welche Sportart heißt auf Japanisch „der sanfte Weg“?', 'Judo', [], 'Jū heißt sanft, dō heißt Weg.'],
    ['Wie lang ist ein Marathon ungefähr?', '42 Kilometer', ['42 km', '42', '42,195 km', '42,195'], 'Genau 42,195 Kilometer seit den Spielen 1908 in London.'],
  ],
  kurios: [
    ['Welches Land hat die meisten Inseln der Welt?', 'Schweden', [], 'Rund 267.000 Inseln – die meisten davon unbewohnt.'],
    ['Wie viele Prozent des menschlichen Gehirns nutzen wir ungefähr?', 'Fast 100 Prozent', ['100 Prozent', '100', 'alles', 'fast alles'], 'Die „10-Prozent“-Geschichte ist ein Mythos.'],
    ['Welche Stadt hat ein eigenes Gesetz gegen das Füttern von Tauben auf dem Markusplatz?', 'Venedig', [], 'Seit 2008 drohen dort Bußgelder.'],
    ['Wie heißt die Angst vor der Zahl 13?', 'Triskaidekaphobie', [], 'Manche Hotels lassen deswegen den 13. Stock aus.'],
    ['In welchem Land gibt es mehr Schafe als Menschen – ungefähr fünfmal so viele?', 'Neuseeland', [], 'Früher waren es sogar über zehnmal so viele.'],
  ],
  marken: [
    ['Wofür steht die Abkürzung „Haribo“?', 'Hans Riegel Bonn', ['Hans Riegel aus Bonn'], 'Gegründet 1920 in Bonn.'],
    ['Wie hieß Pepsi ursprünglich?', "Brad's Drink", ['Brads Drink'], 'Benannt nach dem Apotheker Caleb Bradham.'],
    ['Was war das erste Produkt, das mit einem Barcode gescannt wurde?', 'Kaugummi', ['Wrigleys Kaugummi', 'Kaugummipackung'], '1974 in einem Supermarkt in Ohio.'],
    ['Woher hat die Firma Audi ihren Namen?', 'Latein für „Horch!“', ['Horch', 'Latein', 'Horch auf Latein'], 'Gründer August Horch übersetzte seinen Namen ins Lateinische.'],
    ['Wofür wurde der Kühlschrank-Hersteller Bosch zuerst bekannt?', 'Magnetzündung', ['Zündkerzen', 'Zündung', 'Magnetzünder', 'Zündanlagen'], 'Robert Bosch baute Zündanlagen für Motoren.'],
  ],
  welt: [
    ['Welches ist das kleinste Land der Welt?', 'Vatikanstadt', ['Vatikan'], 'Nicht einmal ein halber Quadratkilometer.'],
    ['In welchem Land liegt der Ort mit dem längsten Namen Europas (58 Buchstaben)?', 'Wales', ['Großbritannien', 'UK'], 'Llanfairpwllgwyngyll… – meist kurz „Llanfair PG“ genannt.'],
    ['Welche Hauptstadt liegt am höchsten?', 'La Paz', ['Bolivien'], 'Regierungssitz Boliviens, auf rund 3.600 Metern.'],
    ['Durch wie viele Länder fließt die Donau?', '10', ['zehn'], 'So viele wie kein anderer Fluss der Welt.'],
    ['Welches Land hat die Form eines Stiefels?', 'Italien', [], 'Sizilien ist der „Ball“ vor der Stiefelspitze.'],
  ],
  wissen: [
    ['Wie viele Liter Blut hat ein erwachsener Mensch ungefähr?', '5 Liter', ['5', 'fünf Liter', 'fünf'], 'Etwa 7–8 % des Körpergewichts.'],
    ['Welcher Planet hat die meisten bekannten Monde?', 'Saturn', [], 'Er hat über 140 bekannte Monde.'],
    ['Welcher Muskel ist im Verhältnis zu seiner Größe der stärkste des Körpers?', 'Kaumuskel', ['Kiefermuskel', 'Masseter'], 'Er kann enorme Beißkraft erzeugen.'],
    ['Wie viel Prozent der Erdoberfläche sind ungefähr von Wasser bedeckt?', '71 Prozent', ['71', 'rund 70 Prozent', '70 Prozent', '70'], 'Deshalb nennt man die Erde auch den „blauen Planeten“.'],
    ['Welches Metall ist bei Zimmertemperatur flüssig?', 'Quecksilber', ['Hg'], 'Es wird erst bei −39 °C fest.'],
  ],
};

for (const [k, list] of Object.entries(MORE)) Q[k] = [...(Q[k] || []), ...list];

// Alle festen Fragen in Datenbank-Form
export const STARTER = Object.entries(Q).flatMap(([key, list]) =>
  list.map(([question, answer, aliases, explanation]) => ({ topic: key, category: topicCategory(key), level: 1, question, answer, aliases, explanation, hint: '', options: [] })),
);
