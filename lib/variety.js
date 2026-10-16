// Abwechslung im Quiz-Board (reine Funktion, wird von lib/questions.js benutzt).
// Pro Thema kommen 10 Fragen ins Board (5 Stufen × Frage + Ersatz). Damit da nicht 3× derselbe Film
// drankommt, ziehen wir mehr Kandidaten als nötig und wählen die aus, die sich am wenigsten überschneiden
// (gleiche Antwort oder gleiche seltene Wörter wie Filmtitel, Namen, Vereine).
const STOP = new Set(('welche welcher welches welchen welchem wer wie was wo wann warum wieviel wieviele viele '
  + 'heißt hieß heisst nennt nennen genannt gibt gab ist sind war waren wird wurde wurden werden hat haben hatte hatten '
  + 'der die das den dem des ein eine einer eines einem einen und oder aber auch noch nur schon sehr mehr ' 
  + 'mit von vom zum zur bei aus nach über unter für gegen ohne durch dieser diese dieses diesem diesen jener '
  + 'sich seine seiner seinen seinem ihre ihrer ihren ihrem welchem jahr jahre jahren land stadt name namen '
  + 'erste ersten erster zweite bekannt bekannte bekannten berühmt berühmte berühmten heute damals immer '
  + 'film filme filmen serie serien staffel folge song songs album band sänger sängerin rapper spieler verein '
  + 'team mannschaft marke firma spiel spiele welt deutschland deutsche deutschen deutscher stimmt richtig').split(' '));

const tokens = (q) => {
  const t = (q.question + ' ' + q.answer).toLowerCase().replace(/[^a-z0-9äöüß ]+/g, ' ').split(/\s+/);
  return new Set(t.filter((w) => w.length >= 4 && !STOP.has(w)));
};

export function diversify(rows, perLevel = 2) {
  const byCat = {};
  for (const r of rows) (byCat[r.category] = byCat[r.category] || []).push(r);
  const out = [];
  for (const list of Object.values(byCat)) {
    const tk = new Map(list.map((r) => [r, tokens(r)]));
    // wie oft kommt ein Wort in den Kandidaten vor? Sehr häufige Wörter sind eher allgemein → zählen nicht
    const df = {};
    for (const set of tk.values()) for (const w of set) df[w] = (df[w] || 0) + 1;
    const rare = (w) => df[w] <= Math.max(3, list.length / 2);
    const chosen = [];
    const clash = (r) => {
      let n = 0;
      const a = r.answer.toLowerCase().trim();
      for (const c of chosen) {
        if (c.answer.toLowerCase().trim() === a) n += 5;
        for (const w of tk.get(r)) if (rare(w) && tk.get(c).has(w)) n += 1;
      }
      return n;
    };
    // erst die Hauptfrage jeder Stufe, dann die Ersatzfragen
    for (let round = 0; round < perLevel; round++) {
      for (let lv = 1; lv <= 5; lv++) {
        const cand = list.filter((r) => r.level === lv && !chosen.includes(r));
        if (!cand.length) continue;
        let best = cand[0];
        let bestN = clash(best);
        for (const r of cand.slice(1)) {
          const n = clash(r);
          if (n < bestN) { best = r; bestN = n; }
        }
        chosen.push(best);
      }
    }
    out.push(...chosen);
  }
  return out;
}
