import { askClaude, extractJson } from '@/lib/claude';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const LEVELS = {
  1: 'sehr leicht – fast jeder Erwachsene weiß das',
  2: 'leicht – gutes Allgemeinwissen',
  3: 'mittel – etwa die Hälfte der Leute weiß es',
  4: 'schwer – nur Leute mit gutem Wissen in dem Thema',
  5: 'sehr schwer – echte Kenner-Frage, aber trotzdem fair und eindeutig',
};

const SYSTEM = `Du bist Quizmaster einer Quiz-Show für eine Gruppe junger Erwachsener in Deutschland.
Du erstellst genau EINE Allgemeinwissens-Frage auf Deutsch.
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
