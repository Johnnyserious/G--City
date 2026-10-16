import { askClaude, extractJson } from '@/lib/claude';

export const maxDuration = 20;
export const dynamic = 'force-dynamic';

const SYSTEM = `Du bist ein fairer Quiz-Schiedsrichter. Entscheide, ob die Antwort eines Spielers als richtig zählt.
Zähle als richtig: kleine Tippfehler, andere Schreibweisen, Synonyme, Nachname statt voller Name, englische/deutsche Variante, Zahl in Ziffern oder Worten.
Zähle als falsch: inhaltlich andere Antworten, zu ungenaue Antworten (z. B. "Europa" statt eines Landes), mehrere Antworten gleichzeitig geraten.
Antworte NUR mit JSON: {"correct": true oder false}`;

export async function POST(req) {
  try {
    const { question, answer, aliases = [], given } = await req.json();
    const text = await askClaude(
      SYSTEM,
      `Frage: ${question}\nRichtige Antwort: ${answer}${aliases.length ? ' (auch ok: ' + aliases.join(', ') + ')' : ''}\nAntwort des Spielers: ${given}`,
      60
    );
    const r = extractJson(text);
    return Response.json({ correct: r.correct === true });
  } catch (e) {
    return Response.json({ correct: false, error: String(e.message || e) }, { status: 200 });
  }
}
