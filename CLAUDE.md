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
  - Nach jeder Board-Anfrage füllt `after()` Kombinationen auf, bei denen es weniger als `LOW_WATER` (8) ungenutzte Fragen gibt.
  - Ein täglicher Cron (`vercel.json`) ruft `GET /api/refill` auf.
  - Die Seite **`/admin`** füllt in einer Schleife auf, solange der Tab offen ist. Ziel sind 400 Fragen pro Thema und Stufe, also 2.000 pro Thema.
  - Claude erzeugt die Fragen in Paketen zu 10 (`generateBatch`). Doppelte Fragen verhindert ein Unique-Index auf `(category, lower(question))`.
- Kosten: ca. 0,0002 $ pro Frage mit Haiku 5.5. Volle Datenbank (38 Themen × 2.000) ≈ 15 $, Startpaket ≈ 1 $.

## Wichtige Fallen (schon gelöst, nicht wieder einbauen)

- **Thinking:** Neuere Claude-Modelle denken standardmäßig erst nach. Das verbraucht `max_tokens`, und dann kommt kein Text zurück ("Keine JSON-Antwort"). `lib/claude.js` sendet deshalb immer `thinking: { type: 'disabled' }`. Lehnt ein Modell das ab, wird ohne den Parameter und mit mehr Tokens wiederholt.
- `extractJson` verträgt ```json-Blöcke, Text drumherum und Kommas vor einer schließenden Klammer.
- Umgebungsvariablen werden gesäubert: Leerzeichen, Anführungszeichen und `NAME=`-Präfixe werden entfernt.
- Vercel-Links mit Zufallsbuchstaben (`g-city-abc123-…vercel.app`) zeigen immer nur **eine alte Version**. Richtig ist `g-city.vercel.app`.
- Beim Hochladen über die GitHub-Weboberfläche gehen Ordner verloren. Deshalb immer per git pushen.

## Themen und Schwierigkeit

- Die Themen stehen in `lib/engine.js` → `CATEGORIES`, mit `group: 'pop'` oder `'edu'`. Jedes Board hat **3 Pop- und 2 Bildungsthemen**. Der Themenname ist auch der Schlüssel in der Datenbank: Wird er umbenannt, gelten die alten Fragen dafür nicht mehr.
- Die Beschreibung der Schwierigkeit steht in `lib/questions.js` → `LEVELS`, die Stil-Regeln in `RULES`. Stufe 1 = 20/100 Punkte, Stufe 5 = 100/500 Punkte. Vorgabe von Jonas: 100 machbar, aber nicht geschenkt. Die höheren Stufen sollen gut beantwortbar bleiben (im Oktober 2026 auf seinen Wunsch leichter gemacht): 500 = etwas anspruchsvoller, aber mit gutem Allgemeinwissen lösbar, keine Expertenfragen. Alles auf Schul-/Abiturniveau.
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
- `components/RevealCard.js`: Karte hochziehen und festhalten, beim Loslassen fällt sie zurück. Lösungswort blau, Tippwort rot.
- Online: Raum wird mit `game: 'imposter'` erstellt (`sessionStorage qa_game_CODE`), `lib/room.js` leitet Aktionen an `imposterAction`, Timer an `imposterTick` weiter. Oberfläche: `components/ImposterRoom.js`.
- Ein Handy: `components/ImposterLocal.js`, läuft komplett im Browser ohne Supabase. Spielerliste wird in localStorage (`imp_local`) gemerkt.

## Geplant (Reihenfolge von Jonas)

1. Charade
2. Wer bin ich?
3. Zeichenspiel: Einer bekommt ein Wort und malt es, wer zuerst das richtige Wort eintippt, bekommt Punkte. Dann reihum weiter.
4. Danach weitere Spielmöglichkeiten.
