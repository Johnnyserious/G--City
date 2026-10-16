// Nur auf dem Server: Fragen fürs Lügen-Quiz ziehen und mit Claude nachfüllen.
// Gespeichert wird in der bestehenden Tabelle questions (category 'Lügen: <Thema>', level 1).
import { askClaude, extractJson } from './claude';
import { dbConfigured, pickOne, addQuestions, counts } from './questions';
import { BLUFF_TOPICS, STARTER, topicCategory, ALL } from './bluffQuestions';

export const BLUFF_LOW = 12; // weniger ungenutzte Fragen als das → nachfüllen

const shuffle = (a) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

const SYSTEM = `Du schreibst Fragen für das Partyspiel "Lügen-Quiz" auf Deutsch (MEHRERE auf einmal).
So läuft das Spiel: Die Spieler sehen eine Frage, erfinden jeweils eine glaubwürdige FALSCHE Antwort, und dann müssen alle die echte Antwort zwischen den erfundenen finden.
Gute Fragen dafür:
- haben eine überraschende, echte Antwort, auf die man kaum von selbst kommt ("Ach krass!"), die aber nicht völlig absurd klingt
- lassen sich gut mit erfundenen Antworten "fälschen" (keine Ja/Nein-Fragen, keine Fragen mit nur 2–3 möglichen Antworten)
- sind normale Fragen (Wer/Was/Wo/Wie/Welche …?), KEINE Lückensätze
- Antwort kurz: 1–4 Wörter oder eine Zahl mit Einheit
- Zielgruppe 18–30 Jahre in Deutschland, unterhaltsam, nicht zu nerdig
Die Fakten müssen absolut stimmen und eindeutig sein. Im Zweifel nimm eine andere Frage. Keine Ereignisse nach 2024, nichts, was sich schnell ändert (Rekorde, Ranglisten, Amtsinhaber).
"aliases" = andere akzeptierte Schreibweisen der richtigen Antwort. "explanation" = ein kurzer Satz Hintergrund.
Antworte NUR mit JSON: {"questions":[{"question":"...","answer":"...","aliases":["..."],"explanation":"..."}]}`;

const clean = (q, topic) => {
  if (!q || typeof q.question !== 'string' || typeof q.answer !== 'string') return null;
  const question = q.question.trim();
  const answer = q.answer.trim();
  if (!question || !answer || answer.length > 60 || question.length > 300) return null;
  return {
    category: topicCategory(topic), level: 1, question, answer,
    aliases: Array.isArray(q.aliases) ? q.aliases.map(String).filter(Boolean).slice(0, 8) : [],
    explanation: q.explanation ? String(q.explanation).trim() : '', hint: '', options: [],
  };
};

export async function generateBluff(topic, n = 10, avoid = []) {
  const t = BLUFF_TOPICS.find((x) => x.key === topic) || BLUFF_TOPICS[0];
  const user = `Thema: ${t.name}
Anzahl: ${n}
Zufallszahl ${Math.floor(Math.random() * 100000)}: wähle überraschende, abwechslungsreiche Unterthemen.
${avoid.length ? 'Diese Fragen gibt es schon, schreib etwas ganz anderes:\n- ' + avoid.slice(0, 40).join('\n- ') : ''}`;
  const text = await askClaude(SYSTEM, user, Math.min(6000, 400 + n * 220));
  const list = (extractJson(text).questions || []).map((q) => clean(q, t.key)).filter(Boolean);
  if (dbConfigured()) await addQuestions(list).catch(() => 0);
  return list;
}

// Startliste einmal in die Datenbank legen (Doppelte überspringt die Datenbank selbst)
let seeded = null;
function seed() {
  if (!dbConfigured()) return Promise.resolve();
  if (!seeded) seeded = addQuestions(STARTER).catch(() => { seeded = null; });
  return seeded;
}

const toGame = (q, topic) => ({ topic, question: q.question, answer: q.answer, aliases: q.aliases || [], explanation: q.explanation || '' });

// count Fragen aus den gewählten Themen, abwechselnd
export async function pickBluff(topics, count, exclude = []) {
  let keys = (topics || []).filter((k) => BLUFF_TOPICS.some((t) => t.key === k));
  if (!keys.length || (topics || []).includes(ALL)) keys = BLUFF_TOPICS.map((t) => t.key);
  await seed();
  const out = [];
  const used = new Set(exclude);
  const order = [];
  while (order.length < count) order.push(...shuffle(keys));
  for (const topic of order.slice(0, count)) {
    let q = null;
    if (dbConfigured()) {
      try { q = await pickOne(topicCategory(topic), 1, [...used]); } catch (e) { console.error(e); }
    }
    if (!q) {
      const free = STARTER.filter((s) => s.topic === topic && !used.has(s.question));
      if (free.length) q = free[Math.floor(Math.random() * free.length)];
    }
    if (!q) {
      try {
        const fresh = (await generateBluff(topic, 6, [...used])).filter((x) => !used.has(x.question));
        q = fresh[0] || null;
      } catch (e) { console.error(e); }
    }
    if (!q) {
      const any = STARTER.filter((s) => !used.has(s.question));
      q = any[Math.floor(Math.random() * any.length)] || STARTER[0];
    }
    used.add(q.question);
    out.push(toGame(q, topic));
  }
  return out;
}

// Themen mit wenig ungenutzten Fragen auffüllen
export async function refillBluff(topics, max = 2) {
  if (!dbConfigured()) return 0;
  const c = await counts();
  const keys = (topics?.length && !topics.includes(ALL) ? topics : BLUFF_TOPICS.map((t) => t.key))
    .map((k) => ({ k, unused: c[topicCategory(k) + '|1']?.unused || 0 }))
    .filter((x) => x.unused < BLUFF_LOW)
    .sort((a, b) => a.unused - b.unused)
    .slice(0, max);
  const res = await Promise.allSettled(keys.map((x) => generateBluff(x.k, 10)));
  return res.filter((r) => r.status === 'fulfilled').reduce((n, r) => n + r.value.length, 0);
}
