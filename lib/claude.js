// Nur auf dem Server benutzt (API-Routen). Der Schlüssel kommt aus den Vercel-Umgebungsvariablen.
const MOCK_QS = [
  { question: 'Wie heißt die Hauptstadt von Australien?', answer: 'Canberra', aliases: [], hint: 'Nicht Sydney.', options: ['Sydney', 'Canberra', 'Melbourne', 'Perth'], explanation: 'Canberra wurde als Kompromiss gebaut.' },
  { question: 'Wie viele Beine hat eine Spinne?', answer: '8', aliases: ['acht'], hint: 'Mehr als ein Insekt.', options: ['6', '8', '10', '12'], explanation: 'Spinnen sind Spinnentiere mit 8 Beinen.' },
  { question: 'Welches chemische Symbol hat Gold?', answer: 'Au', aliases: ['aurum'], hint: 'Lateinisch aurum.', options: ['Go', 'Gd', 'Au', 'Ag'], explanation: 'Au steht für aurum.' },
];
export async function askClaude(system, user, maxTokens = 700, model) {
  if (process.env.MOCK_AI === '1') {
    await new Promise((r) => setTimeout(r, 400));
    if (system.includes('MEHRERE')) {
      const n = Number((user.match(/Anzahl: (\d+)/) || [])[1] || 5);
      const cat = (user.match(/Kategorie: (.*)/) || [])[1] || 'X';
      const lvl = (user.match(/Schwierigkeit: (\d)/) || [])[1] || '1';
      return JSON.stringify({ questions: Array.from({ length: n }, (_, i) => {
        const b = MOCK_QS[i % MOCK_QS.length];
        return { ...b, question: `[${cat} ${lvl}] ${b.question} #${Math.random().toString(36).slice(2, 7)}` };
      }) });
    }
    if (system.includes('Schiedsrichter')) return JSON.stringify({ correct: /canberra|acht|gold/i.test(user.split('Antwort des Spielers:')[1] || '') });
    return JSON.stringify(MOCK_QS[Math.floor(Math.random() * MOCK_QS.length)]);
  }
  const key = String(process.env.ANTHROPIC_API_KEY || '')
    .trim()
    .replace(/^ANTHROPIC_API_KEY\s*=\s*/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
  if (!key) throw new Error('ANTHROPIC_API_KEY fehlt in den Vercel-Einstellungen');
  if (!key.startsWith('sk-ant-')) throw new Error('Der ANTHROPIC_API_KEY in Vercel sieht falsch aus: Er muss mit sk-ant- beginnen (beginnt mit "' + key.slice(0, 6) + '…", Länge ' + key.length + ')');
  const body = {
    model: model || process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
    max_tokens: maxTokens,
    // WICHTIG: Neuere Modelle "denken" sonst standardmäßig vorher nach. Das kostet Zeit und
    // verbraucht max_tokens – dann kommt gar kein Text zurück ("Keine JSON-Antwort").
    thinking: { type: 'disabled' },
    system,
    messages: [{ role: 'user', content: user }],
  };
  const call = (b) =>
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(b),
    });
  let res = await call(body);
  if (res.status === 400) {
    const t = await res.clone().text();
    // Falls ein Modell den thinking-Parameter nicht kennt: ohne ihn nochmal versuchen
    if (/thinking/i.test(t)) {
      const { thinking, ...rest } = body;
      res = await call({ ...rest, max_tokens: maxTokens + 2000 });
    }
  }
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 401) throw new Error('Der Anthropic-Schlüssel wird abgelehnt (401). Bitte in console.anthropic.com einen neuen Key erstellen und in Vercel ersetzen. Gesendeter Key: ' + key.slice(0, 10) + '…' + key.slice(-4) + ', Länge ' + key.length);
    if (res.status === 400 && /credit|balance/i.test(t)) throw new Error('Kein Guthaben bei Anthropic. Bitte in console.anthropic.com unter Billing aufladen.');
    if (res.status === 429) throw new Error('Anthropic: zu viele Anfragen gleichzeitig (429). Kurz warten.');
    if (res.status === 529 || res.status >= 500) throw new Error('Anthropic ist gerade überlastet (' + res.status + '). Gleich nochmal versuchen.');
    throw new Error('Claude API ' + res.status + ': ' + t.slice(0, 300));
  }
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('');
  if (!text.trim()) throw new Error('Claude hat keinen Text geliefert (stop_reason: ' + data.stop_reason + ')');
  return text;
}

// Holt das JSON-Objekt aus der Antwort, auch wenn Claude Text oder ```json-Blöcke drumherum schreibt
export function extractJson(text) {
  const t = String(text || '').replace(/```(?:json)?/gi, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Keine JSON-Antwort von Claude: ' + t.slice(0, 120));
  const raw = t.slice(start, end + 1);
  try {
    return JSON.parse(raw);
  } catch {
    // häufige Kleinigkeiten reparieren: Kommas vor ] oder }, typografische Anführungszeichen als JSON-Quotes
    const fixed = raw.replace(/,\s*([\]}])/g, '$1');
    try {
      return JSON.parse(fixed);
    } catch (e) {
      throw new Error('Claude-Antwort war kein gültiges JSON (' + e.message + ')');
    }
  }
}
