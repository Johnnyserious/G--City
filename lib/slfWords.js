// Stadt Land Fluss: bekannte Wörter für die automatische Prüfung.
// Steht ein Wort hier drin, gilt es sofort. Fehlt es, stimmt die Gruppe ab – es ist also nicht schlimm,
// wenn etwas fehlt. Einfach Wörter ergänzen (Komma-getrennt).
const split = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

export const LAENDER = split(`
Afghanistan,Ägypten,Albanien,Algerien,Andorra,Angola,Antigua und Barbuda,Äquatorialguinea,Argentinien,Armenien,Aserbaidschan,Äthiopien,Australien,
Bahamas,Bahrain,Bangladesch,Barbados,Belarus,Weißrussland,Belgien,Belize,Benin,Bhutan,Bolivien,Bosnien und Herzegowina,Bosnien,Botswana,Brasilien,Brunei,Bulgarien,Burkina Faso,Burundi,
Chile,China,Costa Rica,Dänemark,Deutschland,Dominica,Dominikanische Republik,Dschibuti,Ecuador,Elfenbeinküste,El Salvador,Eritrea,Estland,Eswatini,Swasiland,
Fidschi,Finnland,Frankreich,Gabun,Gambia,Georgien,Ghana,Grenada,Griechenland,Großbritannien,England,Schottland,Wales,Nordirland,Grönland,Guatemala,Guinea,Guinea-Bissau,Guyana,
Haiti,Honduras,Hongkong,Indien,Indonesien,Irak,Iran,Irland,Island,Israel,Italien,Jamaika,Japan,Jemen,Jordanien,
Kambodscha,Kamerun,Kanada,Kap Verde,Kasachstan,Katar,Kenia,Kirgisistan,Kiribati,Kolumbien,Komoren,Kongo,Kosovo,Kroatien,Kuba,Kuwait,
Laos,Lesotho,Lettland,Libanon,Liberia,Libyen,Liechtenstein,Litauen,Luxemburg,Madagaskar,Malawi,Malaysia,Malediven,Mali,Malta,Marokko,Marshallinseln,Mauretanien,Mauritius,Mexiko,Mikronesien,Moldau,Moldawien,Monaco,Mongolei,Montenegro,Mosambik,Myanmar,Birma,
Namibia,Nauru,Nepal,Neuseeland,Nicaragua,Niederlande,Holland,Niger,Nigeria,Nordkorea,Nordmazedonien,Mazedonien,Norwegen,Oman,Österreich,Osttimor,
Pakistan,Palästina,Palau,Panama,Papua-Neuguinea,Paraguay,Peru,Philippinen,Polen,Portugal,Puerto Rico,Ruanda,Rumänien,Russland,
Salomonen,Sambia,Samoa,San Marino,Saudi-Arabien,Schweden,Schweiz,Senegal,Serbien,Seychellen,Sierra Leone,Simbabwe,Singapur,Slowakei,Slowenien,Somalia,Spanien,Sri Lanka,St. Lucia,Südafrika,Sudan,Südsudan,Südkorea,Korea,Suriname,Syrien,
Tadschikistan,Taiwan,Tansania,Thailand,Togo,Tonga,Trinidad und Tobago,Tschad,Tschechien,Tunesien,Türkei,Turkmenistan,Tuvalu,
Uganda,Ukraine,Ungarn,Uruguay,USA,Vereinigte Staaten,Amerika,Usbekistan,Vanuatu,Vatikan,Vatikanstadt,Venezuela,Vereinigte Arabische Emirate,Emirate,VAE,Vietnam,Zentralafrikanische Republik,Zypern
`);

export const STAEDTE = split(`
Aachen,Aalen,Ahlen,Altenburg,Amberg,Ansbach,Arnsberg,Aschaffenburg,Augsburg,Aurich,Bad Homburg,Baden-Baden,Bamberg,Bautzen,Bayreuth,Berlin,Bergisch Gladbach,Bielefeld,Bingen,Bitterfeld,Bocholt,Bochum,Bonn,Bottrop,Brandenburg,Brandenburg an der Havel,Braunschweig,Bremen,Bremerhaven,Bruchsal,
Celle,Chemnitz,Coburg,Cottbus,Cuxhaven,Darmstadt,Dessau,Detmold,Dortmund,Dresden,Duisburg,Düren,Düsseldorf,Eberswalde,Eisenach,Emden,Erfurt,Erlangen,Essen,Esslingen,Flensburg,Frankfurt,Frankfurt am Main,Frankfurt (Oder),Freiburg,Fulda,Fürth,
Garmisch-Partenkirchen,Gelsenkirchen,Gera,Gießen,Gladbeck,Görlitz,Goslar,Gotha,Göttingen,Greifswald,Gütersloh,Hagen,Halle,Hamburg,Hameln,Hamm,Hanau,Hannover,Heidelberg,Heilbronn,Herne,Hildesheim,Hof,Ingolstadt,Iserlohn,Jena,
Kaiserslautern,Karlsruhe,Kassel,Kempten,Kiel,Koblenz,Köln,Konstanz,Krefeld,Landshut,Leipzig,Leverkusen,Lübeck,Lüdenscheid,Ludwigsburg,Ludwigshafen,Lüneburg,Magdeburg,Mainz,Mannheim,Marburg,Meißen,Memmingen,Minden,Moers,Mönchengladbach,Mülheim,München,Münster,
Neubrandenburg,Neuss,Nürnberg,Oberhausen,Offenbach,Offenburg,Oldenburg,Osnabrück,Paderborn,Passau,Pforzheim,Plauen,Potsdam,Recklinghausen,Regensburg,Remscheid,Reutlingen,Rosenheim,Rostock,Saarbrücken,Salzgitter,Schwerin,Siegen,Solingen,Stralsund,Stuttgart,Suhl,
Trier,Tübingen,Ulm,Weimar,Werder,Wetzlar,Wiesbaden,Wilhelmshaven,Wismar,Witten,Wolfsburg,Worms,Wuppertal,Würzburg,Zwickau,Geltow,Falkensee,Oranienburg,Bernau,Königs Wusterhausen,Teltow,Kleinmachnow,Fürstenwalde,Neuruppin,Spandau,
Wien,Graz,Linz,Salzburg,Innsbruck,Klagenfurt,Zürich,Bern,Basel,Genf,Lausanne,Luzern,
Amsterdam,Antwerpen,Athen,Barcelona,Belgrad,Bergen,Bilbao,Birmingham,Bordeaux,Bratislava,Brügge,Brüssel,Budapest,Bukarest,Cannes,Danzig,Den Haag,Dublin,Edinburgh,Florenz,Glasgow,Göteborg,Helsinki,Istanbul,Kiew,Kopenhagen,Krakau,
Lissabon,Liverpool,Ljubljana,London,Lyon,Madrid,Mailand,Málaga,Malaga,Manchester,Marseille,Minsk,Monaco,Moskau,Neapel,Nizza,Odessa,Oslo,Palermo,Palma,Paris,Porto,Prag,Riga,Rom,Rotterdam,Sankt Petersburg,St. Petersburg,Sarajevo,Sevilla,Sofia,Split,Stockholm,
Tallinn,Thessaloniki,Toulouse,Turin,Utrecht,Valencia,Venedig,Verona,Vilnius,Warschau,Zagreb,
Abu Dhabi,Accra,Addis Abeba,Agra,Algier,Amman,Ankara,Antalya,Astana,Atlanta,Auckland,Austin,Bagdad,Baku,Bangkok,Bali,Beirut,Peking,Beijing,Bogotá,Bogota,Bombay,Mumbai,Boston,Brasília,Brasilia,Buenos Aires,
Kairo,Calgary,Cancún,Cancun,Kapstadt,Caracas,Casablanca,Chicago,Colombo,Dakar,Dallas,Damaskus,Delhi,Neu-Delhi,Denver,Detroit,Doha,Dubai,Durban,
Guangzhou,Hanoi,Havanna,Ho-Chi-Minh-Stadt,Saigon,Hongkong,Honolulu,Houston,Hyderabad,Isfahan,Islamabad,Jakarta,Jerusalem,Johannesburg,Kabul,Kalkutta,Kolkata,Karachi,Kathmandu,Kingston,Kyoto,
Lagos,Lahore,Las Vegas,Lima,Los Angeles,Luanda,Manila,Marrakesch,Medellín,Medellin,Mekka,Melbourne,Mexiko-Stadt,Miami,Montreal,Montevideo,Nairobi,Nashville,New Orleans,New York,Osaka,Ottawa,Perth,Philadelphia,Phoenix,Phuket,
Quebec,Quito,Rabat,Riad,Rio de Janeiro,San Diego,San Francisco,Santiago,São Paulo,Sao Paulo,Seattle,Seoul,Shanghai,Singapur,Sydney,Taipeh,Teheran,Tel Aviv,Tiflis,Tokio,Tokyo,Toronto,Tunis,Ulan Bator,Vancouver,Washington,Wellington,Wuhan,Xi'an,Yokohama
`);

export const FLUESSE = split(`
Aare,Ahr,Aller,Altmühl,Amazonas,Amur,Ammer,Bode,Brahmaputra,Colorado,Columbia,Dahme,Delaware,Diemel,Dnepr,Dnjepr,Dnister,Don,Donau,Dordogne,Douro,Drau,Ebro,Eder,Eger,Elbe,Elster,Ems,Enz,Euphrat,
Fulda,Ganges,Garonne,Gelber Fluss,Hudson,Havel,Huang He,Iller,Ilm,Ill,Indus,Inn,Irrawaddy,Isar,Jangtse,Jangtsekiang,Jordan,Kocher,Kongo,Lahn,Lech,Leine,Lena,Lippe,Loire,Main,Maas,Mekong,Mississippi,Missouri,Mosel,Mulde,Murray,
Naab,Nahe,Neckar,Neiße,Nil,Niger,Ob,Oder,Ohio,Oker,Orinoco,Orinoko,Paraná,Parana,Peene,Po,Regen,Regnitz,Rhein,Rhône,Rhone,Rio Grande,Ruhr,Saale,Saar,Salzach,Sambesi,Save,Schelde,Seine,Sieg,Spree,Shannon,Severn,
Tajo,Tejo,Tauber,Themse,Theiß,Tiber,Tigris,Trave,Ural,Unstrut,Vltava,Moldau,Warnow,Warthe,Weichsel,Werra,Weser,Wolga,Wupper,Yukon,Jenissei,Isel,Ijssel,Zambezi,Zschopau,Nuthe,Panke,Wuhle,Ucker,Uecker,Rur,Erft,Emscher,Wümme,Hunte,Ilmenau,Jagst,Kinzig,Murg,Wiese,Wertach,Würm,Vils,Rott,Traun,Enns,Mur,Ybbs,Thaya,March,Limmat,Reuss,Thur,Emme
`);

export const AUTO = { stadt: STAEDTE, land: LAENDER, fluss: FLUESSE };
