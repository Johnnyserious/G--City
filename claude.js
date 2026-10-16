// Nur auf dem Server benutzt (API-Routen). Der Schlüssel kommt aus den Vercel-Umgebungsvariablen.
const MOCK_QS = [
  { question: 'Wie heißt die Hauptstadt von Australien?', answer: 'Canberra', aliases: [], hint: 'Nicht Sydney.', options: ['Sydney', 'Canberra', 'Melbourne', 'Perth'], explanation: 'Canberra wurde als Kompromiss gebaut.' },
  { question: 'Wie viele Beine hat eine Spinne?', answer: '8', aliases: ['acht'], hint: 'Mehr als ein Insekt.', options: ['6', '8', '10', '12'], explanation: 'Spinnen sind Spinnentiere mit 8 Beinen.' },
  { question: 'Welches chemische Symbol hat Gold?', answer: 'Au', aliases: ['aurum'], hint: 'Lateinisch aurum.', options: ['Go', 'Gd', 'Au', 'Ag'], explanation: 'Au steht für aurum.' },
];
export async function askClaude(system, user, maxTokens = 700) {
  if (process.env.MOCK_AI === '1') {
    await new Promise((r) => setTimeout(r, 400));
    if (system.includes('Schiedsrichter')) return JSON.stringify({ correct: /canberra|acht|gold/i.test(user.split('Antwort des Spielers:')[1] || '') });
    return JSON.stringify(MOCK_QS[Math.floor(Math.random() * MOCK_QS.length)]);
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY fehlt in den Vercel-Einstellungen');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('Claude API ' + res.status + ': ' + t.slice(0, 300));
  }
  const data = await res.json();
  return (data.content || []).map((b) => b.text || '').join('');
}

export function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('Keine JSON-Antwort');
  return JSON.parse(text.slice(start, end + 1));
}
