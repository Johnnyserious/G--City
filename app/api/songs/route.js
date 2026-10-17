import { pickSongs } from '@/lib/songServer';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST { cats: ['deutschrap', …] | ['alle'], count, exclude: [ids] } → { songs: [...] }
export async function POST(req) {
  try {
    const { cats = [], count = 10, exclude = [] } = await req.json();
    const n = Math.max(1, Math.min(60, Number(count) || 10));
    const songs = await pickSongs({ cats: cats.map(String), count: n, exclude: exclude.map(String).slice(-300) });
    if (!songs.length) return Response.json({ error: 'Gerade konnten keine Hörproben geladen werden – bitte nochmal versuchen.' }, { status: 502 });
    return Response.json({ songs });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
