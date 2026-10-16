import { askClaude, extractJson } from '@/lib/claude';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const LEVELS = {
  1: 'SUPER LEICHT – das weiß praktisch jeder zwischen 18 und 30, auch ohne Interesse am Thema. Eher ein Lacher als eine Hürde. Beispiele für dieses Niveau: "Welche Farbe hat das Logo von Coca-Cola?", "Wie viele Spieler hat eine Fußballmannschaft auf dem Feld?", "Wie heißt der Klempner aus den Nintendo-Spielen?"',
  2: 'LEICHT – die meisten aus der Gruppe wissen es sofort, wenn sie kurz nachdenken. Bekannte Marken, Stars, Basics.',
  3: 'MITTEL – ungefähr die Hälfte der Gruppe weiß es. Man braucht etwas Interesse am Thema.',
  4: 'SCHWER – nur wer sich wirklich für das Thema interessiert, kennt die Antwort.',
  5: 'SEHR SCHWER – echtes Fan- oder Nerdwissen, an dem auch Kenner knabbern. Trotzdem fair, eindeutig und keine reine Zahlen-Raterei.',
};

const SYSTEM = `Du bist Quizmaster einer lockeren Quiz-Show für eine Gruppe Jungs zwischen 18 und 30 in Deutschland.
Du erstellst genau EINE Quizfrage auf Deutsch.
Stil: unterhaltsam, nah an ihrem Leben (Popkultur, Sport, Autos, Musik, Internet, Marken, Essen, Party, Reisen), kein trockenes Schulwissen. Lieber "Ach klar!"-Momente als Prüfungsgefühl.
Halte dich STRENG an die verlangte Schwierigkeit. Beispiele in der Schwierigkeitsbeschreibung zeigen nur das Niveau – stell sie nie selbst. Im Zweifel lieber eine Spur leichter als zu schwer – außer bei Stufe 5.
Regeln:
- Die Fakten müssen absolut korrekt und eindeutig sein. Im Zweifel nimm eine andere Frage.
- Die Antwort ist kurz (1–4 Wörter oder eine Zahl).
- Keine Fragen zu Ereignissen nach 2024, keine Fragen deren Antwort sich schnell ändert.
- Die Frage verrät die Antwort nicht.
- "hint" ist ein hilfreicher Tipp, der die Antwort NICHT direkt nennt.
- "options" sind genau 4 Antwortmöglichkeiten, eine davon exakt "answer", die anderen plausibel aber falsch, gemischte Reihenfolge.
- "aliases" sind weitere akzeptierte Schreibweisen der richtigen Antwort (z. B. Nachname allein, englischer Name, Zahl als Wort).
Antworte NUR mit JSON in diesem Format:
{"question":"...","answer":"...","aliases":["..."],"hint":"...","options":["...","...","...","..."],"explanation":"ein kurzer Satz mit Hintergrund"}`;

export async function POST(req) {
  try {
    const { category, level, avoid = [] } = await req.json();
    const seed = Math.floor(Math.random() * 10000);
    const user = `Kategorie: ${category}
Schwierigkeit: ${level}/5 (${LEVELS[level] || LEVELS[3]})
Zufallszahl ${seed}: nutze sie, um ein überraschendes Unterthema der Kategorie zu wählen, nicht immer das Naheliegendste.
${avoid.length ? 'Diese Fragen wurden schon gestellt, nimm etwas ganz anderes:\n- ' + avoid.slice(-40).join('\n- ') : ''}`;
    let lastErr;
    for (let i = 0; i < 2; i++) {
      try {
        const q = extractJson(await askClaude(SYSTEM, user));
        if (!q.question || !q.answer) throw new Error('Unvollständig');
        let options = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
        if (!options.includes(q.answer)) options = [q.answer, ...options.filter((o) => o !== q.answer)].slice(0, 4);
        options.sort(() => Math.random() - 0.5);
        return Response.json({
          question: q.question,
          answer: q.answer,
          aliases: Array.isArray(q.aliases) ? q.aliases : [],
          hint: q.hint || 'Kein Tipp verfügbar',
          options,
          explanation: q.explanation || '',
        });
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
