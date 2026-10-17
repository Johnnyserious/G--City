# G City – Projektwissen

Spieleabend-Web-App für Jonas' Gruppe (18–30 Jahre). Läuft auf **g-city.vercel.app**.
Code liegt im GitHub-Repo `Johnnyserious/g--city` (Branch `main`). Jeder Push auf `main` wird von Vercel automatisch gebaut und veröffentlicht (~1 Minute).

Jonas ist kein Entwickler: Anleitungen für ihn immer Klick für Klick, auf Deutsch, mit genauen Button-Namen. Änderungen am Code macht Claude selbst und pusht sie.

## Technik

- **Next.js 15 (App Router)**, reines JavaScript, kein TypeScript, kein Tailwind. Styles in `app/globals.css`.
- **Supabase Realtime** (Broadcast + Presence) für Räume, Spielzustand und Chat. Es gibt keinen eigenen Spielserver.
- **Supabase Postgres** für die Fragen-Datenbank (Tabelle `questions`, Setup in `supabase/setup.sql`).
- **Claude API** (Modell `claude-haiku-5-5`) nur auf dem Server: Fragen erzeugen und unklare Antworten prüfen.
- Avatare: DiceBear `avataaars` (`lib/avatar.js`). Sounds werden live im Browser erzeugt (`lib/sound.js`), keine Dateien.

## Umgebungsvariablen (Vercel → Environment Variables)

| Name | Wofür | Öffentlich? |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API | nein, nur Server |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-Projekt-URL | ja |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` oder `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Realtime im Browser | ja |
| `SUPABASE_SECRET_KEY` (oder `SUPABASE_SERVICE_ROLE_KEY`) | Fragen-Datenbank, nur Server | **nein** |
| `ANTHROPIC_MODEL` / `GEN_MODEL` (optional) | anderes Modell für Prüfen / Erzeugen | – |

Nach jeder Änderung an den Variablen ist in Vercel ein **Redeploy** nötig.

## Wie ein Spiel abläuft

1. `components/App.js`: Profil (Name + Avatar, gespeichert in localStorage) → Spielezentrale → Raum `?r=CODE`.
2. `lib/room.js` (`useRoom`): verbindet sich mit dem Supabase-Kanal `quizabend-CODE`.
   - Der **Host** (Raumersteller) hält den einzig gültigen Spielzustand, verarbeitet alle Aktionen (`handleAction`) und sendet den Zustand per Broadcast an alle (`commit`).
   - Die anderen schicken nur Aktionen (`send('pick', …)`) und zeigen den Zustand an.
   - Fällt der Host weg, übernimmt nach 4 Sekunden der nächste Spieler in `order`.
3. Die Spielregeln stecken in `lib/engine.js` und sind reine Funktionen: Board, Punkte, Veto-Mehrheit, Revanche, lokale Antwortprüfung.
4. Die Oberfläche liegt in `components/`: `Lobby`, `Board`, `QuestionOverlay` (Frage, Timer, Joker, Veto), `EndScreen`, `Chat`, `Scorebar`.

## Fragen: warum sie sofort da sind

- Beim Board-Start lädt der Host über `POST /api/board` **alle 25 Felder auf einmal** vor, 2 Fragen pro Feld (die zweite ist der Ersatz für den Tausch-Joker). Die Fragen liegen danach nur beim Host im Speicher (`poolRef`). Ein Klick auf ein Feld zeigt die Frage dadurch ohne Netzwerk in ~0,1 s.
- `/api/board` zieht die Fragen aus der Datenbank (SQL-Funktion `pick_questions`). Dabei kommen die am wenigsten benutzten zuerst, `times_used` wird hochgezählt. Fehlt etwas, wird es **einmalig live** erzeugt und gleich gespeichert.
- `POST /api/question` ist der Fallback für ein einzelnes Feld, falls der Pool leer ist (z. B. nach einem Host-Wechsel).
- **Auffüllen im Hintergrund** (`lib/questions.js` → `refill`):
  - Nach jeder Board-Anfrage füllt `after()` Kombinationen auf, bei denen es weniger als `LOW_WATER` (12) ungenutzte Fragen gibt.
  - Ein täglicher Cron (`vercel.json`) ruft `GET /api/refill` auf.
  - Die Seite **`/admin`** füllt in einer Schleife auf, solange der Tab offen ist. Ziel sind 400 Fragen pro Thema und Stufe, also 2.000 pro Thema.
  - Claude erzeugt die Fragen in Paketen zu 10 (`generateBatch`). Doppelte Fragen verhindert ein Unique-Index auf `(category, lower(question))`.
- **Abwechslung im Board:** `pickBoard` zieht pro Feld 4 Kandidaten und `lib/variety.js` (`diversify`) wählt pro Thema die 10 Fragen mit den wenigsten Überschneidungen (gleiche Antwort, gleiche seltene Wörter wie Filmtitel/Namen). So kommt z. B. nicht 3× derselbe Film. Der Prompt verlangt außerdem: jede Frage ein anderes Motiv.
- Kosten: ca. 0,0002 $ pro Frage mit Haiku 5.5. Volle Datenbank (38 Themen × 2.000) ≈ 15 $, Startpaket ≈ 1 $.

## Wichtige Fallen (schon gelöst, nicht wieder einbauen)

- **Thinking:** Neuere Claude-Modelle denken standardmäßig erst nach. Das verbraucht `max_tokens`, und dann kommt kein Text zurück ("Keine JSON-Antwort"). `lib/claude.js` sendet deshalb immer `thinking: { type: 'disabled' }`. Lehnt ein Modell das ab, wird ohne den Parameter und mit mehr Tokens wiederholt.
- `extractJson` verträgt ```json-Blöcke, Text drumherum und Kommas vor einer schließenden Klammer.
- Umgebungsvariablen werden gesäubert: Leerzeichen, Anführungszeichen und `NAME=`-Präfixe werden entfernt.
- Vercel-Links mit Zufallsbuchstaben (`g-city-abc123-…vercel.app`) zeigen immer nur **eine alte Version**. Richtig ist `g-city.vercel.app`.
- Beim Hochladen über die GitHub-Weboberfläche gehen Ordner verloren. Deshalb immer per git pushen.

## Themen und Schwierigkeit

- Die Themen stehen in `lib/engine.js` → `CATEGORIES`, mit `group: 'pop'` oder `'edu'`. Jedes Board hat **3 Pop- und 2 Bildungsthemen**. Der Themenname ist auch der Schlüssel in der Datenbank: Wird er umbenannt, gelten die alten Fragen dafür nicht mehr.
- Die Beschreibung der Schwierigkeit steht in `lib/questions.js` → `LEVELS`, die Stil-Regeln in `RULES`. Stufe 1 = 20/100 Punkte, Stufe 5 = 100/500 Punkte. Vorgabe von Jonas: 100 machbar, aber nicht geschenkt. Mitte Oktober 2026 erst leichter, dann auf Jonas' Wunsch wieder **etwas schwerer** gemacht: 100 = machbar mit kleinem Twist, 500 = anspruchsvoll, aber fair (bekanntes Thema, weniger bekanntes Detail), keine reinen Expertenfragen. Alles auf Schul-/Abiturniveau.
- Ändert man die Schwierigkeit, betrifft das nur **neu erzeugte** Fragen. Alte löscht man in Supabase im SQL Editor, z. B. `delete from questions where level = 5;`.

## Lokal testen (ohne Konten und ohne Kosten)

```bash
npm install
NEXT_PUBLIC_MOCK=1 npm run build
MOCK_AI=1 MOCK_DB=1 npx next start -p 3123
```

- `NEXT_PUBLIC_MOCK=1` ersetzt Supabase Realtime durch BroadcastChannel zwischen Browser-Tabs.
- `MOCK_AI=1` liefert Beispiel-Fragen ohne API.
- `MOCK_DB=1` nutzt eine Datenbank im Arbeitsspeicher.

Jeder Tab ist ein eigener Spieler. Playwright/Chromium ist für automatische Tests vorhanden.
**Vor dem Push immer einmal normal bauen** (`npm run build` ohne Mock), damit der Mock-Modus nicht live geht.

## Imposter (fertig, Phase 2)

- Start in der Spielezentrale → Auswahl **📱 Ein Handy** oder **🌐 Online**.
- Regeln (`lib/imposter.js`, reine Funktionen): 2 Wort-Runden, jeder sagt reihum ein Wort (20 s), dann 60 s Diskussion (Chat), Abstimmung. Erwischter Imposter darf das Wort raten (30 s), trifft er, gewinnt er trotzdem. Anzahl Imposter: 1, 2 (ab 5 Spielern) oder „Überraschung“ (0–2, dann gibt es beim Voten „Keiner“). Punkte: Crew-Sieg +1, Imposter-Sieg +3.
- Wörter in `lib/imposterWords.js`: Paare [Lösungswort, Tippwort], nach Themen. Neue Wörter einfach dort eintragen.
- `components/RevealCard.js`: Karte **antippen = bleibt offen**, nochmal antippen = zu (Jonas' Wunsch, Okt. 2026). Kurze Sperre nach jedem Umschalten; auf einem Handy (`ImposterLocal`) höchstens 2× aufdecken (`maxOpens`). Lösungswort blau, Tippwort rot.
- Imposter-Anzahl: 1, 2 (ab 5), **3 (ab 8 Spielern)** oder Überraschung (ab 8 Spielern 0–3).
- Online: Raum wird mit `game: 'imposter'` erstellt (`sessionStorage qa_game_CODE`), `lib/room.js` leitet Aktionen an `imposterAction`, Timer an `imposterTick` weiter. Oberfläche: `components/ImposterRoom.js`.
- Ein Handy: `components/ImposterLocal.js`, läuft komplett im Browser ohne Supabase. Spielerliste wird in localStorage (`imp_local`) gemerkt.

## Make it Meme (fertig)

- Online mit Raum-Code (`game: 'meme'`). Host stellt 3/5/7 Runden und 60/90/120 s Schreibzeit ein. Mindestens 3 Spieler.
- Ablauf pro Runde: Jeder bekommt eine eigene Vorlage (1× neu würfeln) und **tippt ins Bild, wo Text hin soll** (bis 6 Textfelder, verschiebbar, Größe A−/A+; gespeichert als `boxes: [{x, y, size, text}]`, x/y = Mitte 0–1) → alle Memes anonym nacheinander (25 s je Meme): 1–5 Sterne + raten, von wem es ist → Auflösung mit Rangliste.
- Wertung (Host-Einstellung `scoring`): **'guess' (Standard)** = Rangliste nach richtig erratenen Memes (🎯), ⭐ entscheiden bei Gleichstand; 'mix' = Sterne + richtig geraten ×3. Rangliste `MemeRanking` unten mit 🎯 und ⭐ (`s.stats`), wird erst am Rundenende aktualisiert (sonst verrät sie die Ersteller).
- Vorlagen: `GET /api/memes` lädt ~100 von api.imgflip.com + ~200 von api.memegen.link (1× pro Tag, ohne Bildgröße → wird im Browser ermittelt), Ersatzliste in `lib/memeTemplates.js`.
- Regeln `lib/meme.js` (`memeAction`, `memeTick`), Oberfläche `components/MemeRoom.js`, Meme-Darstellung `components/MemeImage.js` (Schrift Anton, wie Impact).

## Zeichenspiel (fertig)

- Online mit Raum-Code (`game: 'draw'`), ab 2 Spielern. Host stellt 1/2/3 Runden (jeder malt pro Runde einmal) und 60/80/100 s Malzeit ein.
- Zug: Zeichner wählt aus 3 Wörtern (leicht ×1 / mittel ×1,3 / schwer ×1,6 Punkte, 15 s) → malt, alle anderen tippen Tipps. **Wer zuerst richtig tippt, bekommt die Punkte** (100–200 je nach Restzeit × Faktor), der Zeichner +60 × Faktor, dann ist der Zug vorbei. Ein Tippfehler zählt als richtig, zwei = „ganz nah dran“ (Text wird dann nicht gezeigt). Nach 50 % und 75 % der Zeit wird je ein Buchstabe aufgedeckt.
- Striche laufen **nicht** über den Spielzustand, sondern direkt per Broadcast-Event `draw` vom Zeichner an alle (`room.sendDraw` / `room.subscribeDraw`, alle 70 ms gebündelt, Koordinaten 0–1). Wer neu reinkommt, schickt `need`, der Zeichner antwortet mit `sync` (ganzes Bild).
- Dateien: Regeln `lib/draw.js`, Wörter `lib/drawWords.js` (einfach erweitern), Zeichenfläche `components/DrawCanvas.js`, Oberfläche `components/DrawRoom.js`.

## Lügen-Quiz (fertig)

- Spielezentrale → **📱 Ein Handy** oder **🌐 Online** (`game: 'bluff'`), ab 3 Spielern. Host stellt 5/8/10 Fragen, 45/60/90 s Lügen-Zeit und Themen ein (mehrere oder „Alles gemischt“).
- Ablauf pro Frage: normale Frage mit kurzer, überraschender Antwort → jeder schreibt eine Lüge (wer aus Versehen die Wahrheit tippt, wird gewarnt) → Wahrheit + Lügen gemischt (gleiche Lügen zusammengelegt), jeder wählt (eigene Lüge gesperrt, 30 s) und kann Lügen mit 👍 liken → Auflösung mit Erklärung.
- Punkte: Wahrheit gefunden +3, jeder Reingefallene +2 für den Lügner, jedes 👍 +1. Mehrere Sieger bei Gleichstand.
- Fragen: Startliste (136 Fragen, 9 Themen) in `lib/bluffQuestions.js`. Sie wird beim ersten Abruf in die Tabelle `questions` gelegt (category `Lügen: <Thema>`, level 1) – **keine eigene Tabelle, kein SQL nötig**. `POST /api/bluff` zieht die am wenigsten benutzten Fragen, danach füllt `after()` Themen mit < 12 ungenutzten Fragen per Claude auf (`lib/bluffServer.js`). Das Quiz-Auffüllen und `/admin` ignorieren diese Kategorien.
- Online: `start` setzt `phase: 'loading'`, der Host lädt dann in seinem Timer (`lib/room.js`) die Fragen und ruft `bluffLoaded`. Regeln `lib/bluff.js`, Oberfläche `components/BluffRoom.js`, Ein Handy `components/BluffLocal.js` (Spielerliste aus Imposter wird übernommen), gemeinsame Teile `components/BluffParts.js`.

## Emoji-Rätsel (fertig)

- Online mit Raum-Code (`game: 'emoji'`), ab 2 Spielern. Host stellt 10/15/20 Rätsel, 30/45/60 s pro Rätsel und Themen ein (Wörter, Filme & Serien, Essen & Trinken, Marken & Apps oder gemischt).
- Immer 2–3 Emojis → ein Begriff. Alle raten gleichzeitig, mehrere Versuche erlaubt. Richtig: 1. +5, 2. +3, 3. +2, danach +1. Falsche Tipps sehen alle, „ganz nah dran“ ohne Text. Nach 40 % der Zeit Lücken (Buchstabenzahl), nach 70 % der erste Buchstabe. Sind alle fertig, kommt die Auflösung (5 s), dann das nächste Rätsel.
- Rätsel (~300 Stück) in `lib/emojiPuzzles.js` als [Emojis, Lösung, [weitere Antworten]] – einfach erweitern. Antwortprüfung ignoriert Artikel und einen Tippfehler (`checkEmoji` in `lib/emoji.js`). Oberfläche `components/EmojiRoom.js`.

## Schätz-Duell (fertig)

- Spielezentrale → **📱 Ein Handy** oder **🌐 Online** (`game: 'estimate'`), ab 2 Spielern. Host wählt Modus, 5/8/10/15 Fragen, 20/30/45 s pro Frage (nur online) und Themen.
- **Alle gegen alle:** jeder schätzt, Rangliste nach Abstand: +5 / +3 / +2, gleicher Abstand = gleicher Platz.
- **Duelle 1 gegen 1:** pro Frage zwei Spieler (wer am wenigsten dran war, möglichst nicht dasselbe Paar zweimal hintereinander). Näher dran +5, Gleichstand je +3. Alle anderen wetten vorher: richtig +2 (bei Gleichstand +1).
- Exakt getroffen +3 Bonus. **Doppelt-Joker:** einmal pro Spiel Punkte einer Frage ×2 (auch für Wetten).
- Zahleneingabe versteht deutsche Formate („13.200“, „5,5“) und zeigt eine Vorschau (`parseNum`).
- **Nur feste, geprüfte Fragen** (158 Stück, 7 Themen) in `lib/estimateQuestions.js` – Jonas wollte hier ausdrücklich keine KI-Fragen. Format [Frage, Zahl, Einheit, Erklärung]; Einheit `'Jahr'` = Jahreszahl.
- Regeln `lib/estimate.js`, Oberfläche `components/EstimateRoom.js`, Ein Handy `components/EstimateLocal.js`, gemeinsame Teile `components/EstimateParts.js`.

## Shop: Münzen, Joker, Bundles (Echtgeld über Stripe)

- Ziel: Projekt finanzieren. Jonas verkauft über sein Gewerbe **Serious Innovations** (Inhaber Jonas Ernst, Breite Straße 23, 14467 Potsdam); das Stripe-Konto heißt ebenfalls Serious Innovations. **Regelbesteuert (19 % USt, keine USt-IdNr.)** → Preise sind inkl. MwSt. Vor dem Live-Schalten: Daten in `lib/legal.js` eintragen (Impressum/AGB/Widerruf/Datenschutz unter `/impressum`, `/agb`, `/widerruf`, `/datenschutz`; Platzhalter werden gelb markiert) und rechtlich prüfen lassen.
- Modell (Jonas' Wahl): **Münzen-Pakete** (300/550/1.200/2.600 für 2,99/4,99/9,99/19,99 €, 100 Münzen ≈ 1 €) **und direkt kaufbare Bundles** (Joker + Bonus-Münzen). Shop verkauft **nur Joker & Hilfen** (20–60 Münzen). Alles in `lib/shopCatalog.js`. Täglich 10 Gratis-Münzen für Eingeloggte.
- Fairness: **max. 1 gekaufter Joker pro Spieler und Spiel**, Host kann sie in der Lobby ausschalten (`ShopToggle`). Regeln + Wirkung in `lib/shopGame.js` (`canUseBought`/`applyBought`, Zustand unter `state.shop`, Reset bei `start`). Wirkungen: Quiz-Joker zurück, Emoji 2 Buchstaben (nur für den Käufer), Zeichnen erster+letzter Buchstabe, Schätzen zweiter Doppelt-Joker, Meme nochmal würfeln, Lügen-Quiz 50:50. Anzeige im Spiel: `components/JokerBag.js`. Ablauf: Browser verbraucht den Joker über die API, dann Aktion `useBought` an den Host.
- Login: **E-Mail + Passwort** über Supabase Auth (`lib/account.js`, inkl. Passwort vergessen). Spielen geht weiter ohne Konto.
- Datenbank: `supabase/shop.sql` (Tabellen `wallets`, `inventory`, `coin_ledger` + Funktionen `shop_grant/daily/buy/use`). `coin_ledger.ref` = Stripe-Session → Käufe werden nie doppelt gutgeschrieben.
- Server: `lib/wallet.js`, API `GET/POST /api/shop` (wallet, daily, buy, use, checkout, confirm) und `POST /api/stripe/webhook`. Stripe wird direkt per REST angesprochen (kein npm-Paket), Checkout mit `price_data` – **in Stripe müssen keine Produkte angelegt werden**. Neue Stripe-Konten haben „Managed Payments“ (Stripe als Merchant of Record, verlangt Steuer-Codes) standardmäßig an → wir senden `managed_payments[enabled]=false`, weil Serious Innovations selbst verkauft. Nach dem Bezahlen bestätigt `confirm` den Kauf; der Webhook ist die Absicherung, falls jemand das Fenster schließt.
- Umgebungsvariablen: `STRIPE_SECRET_KEY` (sk_test_… / sk_live_… oder eingeschränkt rk_… mit nur „Checkout Sessions: Schreiben“), optional `STRIPE_WEBHOOK_SECRET` (whsec_…). Lokal testen: `MOCK_DB=1` simuliert Login (Token `mock:<id>`) und Bezahlung ohne Stripe.
- Hinweis: Den Verbrauch von Jokern prüft der Server, die Wirkung im Spiel der Host – ein manipulierter Browser könnte sich theoretisch Vorteile erschummeln, aber nie Münzen.

## Spieler bleiben dabei (Okt. 2026)

- Bis 16 Spieler pro Raum (`MAX_PLAYERS` in `lib/room.js`), alle Spiele getestet mit 10.
- Wer kurz weg ist (Handy gesperrt, Funkloch), wird bei einer neuen Runde **3 Minuten lang trotzdem eingeplant** (`activeIds`, `offAt` in `lib/engine.js`). Wer mitten in einer Runde (wieder) kommt, spielt sofort mit (`joinLate` in den Ticks von Meme, Lügen-Quiz, Schätz-Duell; beim Zeichenspiel hinten in die Mal-Reihenfolge). Nur Imposter wartet bis zur nächsten Runde (geheimes Wort).
- Beim Zurückkommen in den Tab meldet sich der Browser sofort neu an (`visibilitychange` in `lib/room.js`).
- Test-Hinweis: Im Sandbox-Chromium stürzt die Seite manchmal ab, wenn Meme-Bilder nicht laden (Proxy blockt imgflip/memegen). In Playwright deshalb Bilder per `ctx.route` mit einem Testbild beantworten.

## Feste Profile, G-Punkte, Startseite (Paket 1+2, Okt. 2026)

- **Profil:** Beim ersten Öffnen Popup (`components/ProfileSetup.js`): neu anlegen oder per 6-stelligem Code wiederherstellen. Bestehende lokale Profile werden einmal „gesichert“ (Upgrade). Danach automatisch erkannt (localStorage `qa_profile`, Feld `registered: true`).
- Server: Tabellen `profiles` + `profile_games` und Funktion `profile_add_result` (`supabase/profiles.sql`, **einmal im SQL Editor ausführen**), `lib/profiles.js`, API `GET/POST /api/profile` (save, restore, result). Client: `lib/player.js`.
- **G-Punkte** statt Roh-Punkten (jedes Spiel hat andere Skalen): 10 fürs Mitspielen, Platz 1 +30, Platz 2 +15 (ab 3 Spielern), Platz 3 +5 (ab 4). Level-Kurve und Titel in `lib/player.js`.
- Ergebnis-Erkennung `lib/results.js` (`finishedResult`): Quiz bei `end`, Meme/Zeichnen/Lügen/Emoji/Schätzen bei `final`, Imposter pro Runde (`result`). Jeder Browser meldet nur sich selbst, jedes Spiel zählt einmal (`key`). Ein-Handy-Spiele zählen (noch) nicht.
- Profilseite `components/ProfilePage.js` (Level, Titel, Statistik, Vibration an/aus, Code anzeigen). Belohnung nach dem Spiel: `.reward-pop` in `Room.js`, im Spiel „+N“ (`.score-pop`).
- **Dev-Mode ohne Shop-Login:** 5× schnell aufs Logo tippen → PIN. Server vergleicht mit `DEV_PIN` (Vercel), gibt einen Schlüssel (HMAC) zurück, das Handy merkt ihn sich (`gcity_dev_key`, Header `x-dev-key`). Lokal (Mock) ist die PIN `1234`. 🔒 im Dev-Mode sperrt das Handy wieder.
- **Bots für alle:** `DevBots` (in jeder Lobby) für jeden Host, max. 16 Spieler. Bots spielen nach festen Regeln, kein KI-Aufruf.
- **Startseite** (`GameCenter.js`): Kopf mit Logo/Shop/Ton/Avatar (→ Profil), Code-Feld, Spiele-Kacheln (2 Spalten am Handy), unten: Ideen (zugeklappt), „Fehler melden & Wünsche“ (`SupportSheet` → `POST /api/support` → GitHub-Issue `[Support] …` mit Label `dev-inbox`, max. 8 pro Stunde und IP), „Unsere Apps“ (Liste `APPS`, Eventradar = https://eventradar.club).
- **Support-Meldungen in der Inbox** kommen von Spielern, nicht von Jonas: kleine Bugs direkt fixen, größere Änderungen erst mit Jonas abstimmen.
- **Chat** unten links (`Chat.js`), daneben die 5 meistgenutzten Emojis (`lib/emojiUse.js`, nur auf dem Handy gespeichert), ＋ öffnet `EmojiPicker` (alle Emojis bis Version 15.1 aus `public/emoji.json`, deutsch durchsuchbar; erzeugt aus `emojibase-data`).
- **Haptik:** `haptic()` in `lib/sound.js` (Android `navigator.vibrate`, iPhone über den Schalter-Trick ab iOS 18). Jeder Knopfdruck vibriert kurz (abschaltbar im Profil).
- **Look:** dunkle Konturen (`--line`), Knöpfe mit Glanzkante und Plopp-Effekt. Hintergrund liegt auf `body::before` (kein `background-attachment: fixed`, das ließ iPhones beim Scrollen springen).

## Dev-Mode (nur Jonas) + Auftrags-Inbox

- Sichtbar, wenn per Logo-Geste + PIN freigeschaltet (siehe oben) oder wenn Jonas mit **jonas.goldenpost.media@gmail.com** im Shop eingeloggt ist (`lib/dev.js`, Server prüft zusätzlich; weitere Mails per `DEV_EMAILS` in Vercel). Knopf **🛠️** oben in der Spielezentrale → `components/DevPanel.js`.
- **Bots:** In jeder Online-Lobby „＋ Bot“ (jeder Host, seit Paket 1+2). Bots sind Spieler mit `bot: true`, nicht in der Presence (`syncPlayers` überspringt sie). `lib/bots.js` → `botPlans(s)` sagt pro Spiel, was jeder Bot tun würde; der Host-Timer in `lib/room.js` führt jeden Plan einmal nach 1,5–10 s aus. Bots können nicht malen (geben als Zeichner auf). Zufalls-Entscheidungen pro Runde über `chance(key)` stabil halten.
- **Inbox = GitHub-Issues mit Label `dev-inbox`** im Repo `Johnnyserious/G--City` (`lib/devServer.js`, API `/api/dev`, braucht `GITHUB_TOKEN` in Vercel: fine-grained, nur dieses Repo, Issues/Pull requests/Contents RW + Deployments R).
- **Wenn Jonas im Chat „Inbox“ schreibt (nur auf Zuruf, kein Automatismus):**
  1. `gh api "repos/Johnnyserious/G--City/issues?labels=dev-inbox&state=open"` lesen (inkl. Kommentare – Antworten von Jonas beginnen mit „**Jonas (Dev-Mode):**“).
  2. Pro Auftrag: Branch `dev/<nr>` von `main`, umsetzen, lokal testen, normal bauen, Branch pushen.
  3. Pull Request per REST: `gh api repos/Johnnyserious/G--City/pulls -f title=… -f head=dev/<nr> -f base=main -f body="Closes #<nr> …"` (GraphQL/`gh pr create` geht in dieser Umgebung nicht).
  4. Kommentar ins Issue: kurz auf Deutsch, was geändert wurde und was er testen soll. Bei Unklarheit stattdessen nur eine Rückfrage kommentieren (Status „Rückfrage“ im Dev-Mode).
  5. Vercel baut automatisch eine Vorschau; Jonas schaltet im Dev-Mode mit „🚀 Live schalten“ frei (merged den PR, Squash). Niemals selbst nach `main` mergen, außer Jonas sagt es.
- Status im Dev-Mode: Wartet (offen, kein PR) · Rückfrage (letzter Kommentar nicht von Jonas) · Vorschau bereit (PR offen, Link aus GitHub-Deployments) · Live (PR gemerged) · Verworfen.

## Spielideen-Abstimmung (Spielezentrale)

- Oben in der Spielezentrale (`components/IdeaBoard.js`): Ideen antippen = Stimme, beliebig viele pro Person, eigene Ideen schreiben (max. 10 pro Person, eigene wieder löschbar).
- Achtung CSS: nie die Klasse `wrap` für Elemente nutzen – das ist der Seiten-Container (110 px Abstand unten). Für umbrechende Knopfreihen gibt es `seg seg-wrap`.
- Vorgegebene Ideen in `lib/gameIdeas.js` (`key` nie ändern, daran hängen die Stimmen). Gebaute Spiele bekommen `done: true` (Anzeige „✅ jetzt spielbar“). Eigene Ideen haben den Schlüssel `u<id>`.
- Speicher: Supabase-Tabellen `game_ideas` und `idea_votes` (`supabase/ideas.sql`, auch in `setup.sql`). Server: `lib/ideas.js`, API `GET/POST /api/ideas`. Wähler = Profil-ID aus localStorage.
- Was die Gruppe will, sieht man dort an den Stimmen. Vor dem nächsten Spiel dort nachschauen.

## Arbeitsweise mit Jonas (seine Vorgaben, Okt. 2026)

- Immer nur **ein Spiel gleichzeitig**, vom leichtesten zum aufwendigsten; erst nach Abnahme das nächste.
- Vor jedem Spiel vorstellen: Name + 2–3 Sätze (Ablauf, Spieler, Dauer, Sieg), 1–2 Referenzen (Jackbox, Heads Up, Kahoot …), kleine Skizze, dann Multiple Choice „So umsetzen / andere Spielweise / Später / Überspringen“.
- Kleine Änderungen sofort umsetzen, größere als Multiple Choice vorstellen. Einwürfe nicht verlieren („Als Nächstes“-Liste).
- Jede Antwort endet mit Statusbericht: ✅ Erledigt · 📍 Stand · 👉 Deine Action-Steps · 📝 Als Nächstes · ⏳ Einschätzung (Dauer/Kosten) · 🧭 Vorschlag.
- Möglichst keine laufenden Kosten: feste Inhalte statt KI im Spiel. Ehrlich sagen, wenn etwas teuer oder rechtlich heikel ist.
- Spielekatalog (Stufe 1–5) steht in seiner Anleitung: zuerst „Wer würde eher …?“ (freigegeben, kommt nach Paket 1+2), dann Ich hab noch nie, Entweder-oder, Wahrheit oder Pflicht, Tabu, Wer bin ich, Pantomime, Potsdam-Quiz, Promi, Songs (nur offizielle Vorschau-Clips), Buzzer, Reaktions-Duelle, Potsdam-Guesser, zum Schluss 3D-Runner Geltow → Potsdam.

## Geplant (Reihenfolge von Jonas)

1. Charade
2. Wer bin ich?
3. ~~Zeichenspiel~~ (fertig)
4. Danach weitere Spielmöglichkeiten.
