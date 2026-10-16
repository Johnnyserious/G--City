import { after } from 'next/server';
import { pickBluff, refillBluff } from '@/lib/bluffServer';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// { topics: ['tiere', …] | ['alle'], count: 8, exclude: [Fragetexte] } → { questions: [...] }
export async function POST(req) {
  try {
    const { topics = [], count = 8, exclude = [] } = await req.json();
    const n = Math.max(1, Math.min(15, Number(count) || 8));
    const questions = await pickBluff(topics.map(String), n, exclude.map(String).slice(-200));
    after(() => refillBluff(topics.map(String)).catch(() => {}));
    return Response.json({ questions });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
