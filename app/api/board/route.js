import { after } from 'next/server';
import { pickBoard, generateAndStore, dbConfigured, refill, LOW_WATER } from '@/lib/questions';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Lädt alle Fragen für ein Board auf einmal (2 pro Feld: Frage + Ersatz für den Tausch-Joker).
// Antwort: { questions: { "0-0": [q, q], "0-1": [...], ... } }  Schlüssel = Spalte-Zeile
export async function POST(req) {
  try {
    const { categories = [] } = await req.json();
    const cats = categories.slice(0, 8).map(String);
    const out = {};
    let rows = [];
    if (dbConfigured()) {
      try { rows = await pickBoard(cats, 2); } catch (e) { console.error(e); }
    }
    for (const r of rows) {
      const ci = cats.indexOf(r.category);
      if (ci < 0) continue;
      const k = ci + '-' + (r.level - 1);
      (out[k] = out[k] || []).push(r);
    }
    // Fallback: leere Felder einmalig live erzeugen (werden gleich mit gespeichert)
    const missing = [];
    cats.forEach((c, ci) => { for (let row = 0; row < 5; row++) if (!out[ci + '-' + row]) missing.push([c, ci, row]); });
    if (missing.length) {
      const results = await Promise.allSettled(missing.map(([c, , row]) => generateAndStore(c, row + 1, 4)));
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.qs.length) out[missing[i][1] + '-' + missing[i][2]] = r.value.qs.slice(0, 2);
      });
    }
    // Im Hintergrund nachfüllen, wo es knapp wird
    if (dbConfigured()) after(() => refill({ batches: 3, only: cats, lowWater: LOW_WATER }).catch(() => {}));
    return Response.json({ questions: out, live: missing.length });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
