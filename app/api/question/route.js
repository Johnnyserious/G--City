import { after } from 'next/server';
import { pickOne, generateAndStore, dbConfigured, refill, LOW_WATER } from '@/lib/questions';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Eine einzelne Frage: zuerst aus der Datenbank, nur wenn leer live erzeugen (und speichern).
export async function POST(req) {
  try {
    const { category, level, avoid = [] } = await req.json();
    let q = null;
    let source = 'db';
    if (dbConfigured()) {
      try { q = await pickOne(category, level, avoid); } catch (e) { console.error(e); }
    }
    if (!q) {
      source = 'live';
      const { qs } = await generateAndStore(category, level, dbConfigured() ? 3 : 1);
      q = qs.find((x) => !avoid.includes(x.question)) || qs[0];
      if (!q) throw new Error('Keine Frage erzeugt');
    }
    if (dbConfigured()) after(() => refill({ batches: 1, only: [category], lowWater: LOW_WATER }).catch(() => {}));
    return Response.json({ ...q, source });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
