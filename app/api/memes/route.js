import { FALLBACK_TEMPLATES } from '@/lib/memeTemplates';

// Meme-Vorlagen von Imgflip (einmal am Tag frisch geladen). Fällt Imgflip aus, kommt die Ersatzliste.
export const revalidate = 86400;

export async function GET() {
  try {
    if (process.env.MOCK_AI === '1') throw new Error('mock');
    const r = await fetch('https://api.imgflip.com/get_memes', { next: { revalidate: 86400 } });
    const d = await r.json();
    const list = (d?.data?.memes || [])
      .filter((m) => m.url && m.width && m.height)
      .map((m) => ({ id: String(m.id), name: m.name, url: m.url, width: m.width, height: m.height }));
    if (list.length < 20) throw new Error('zu wenige Vorlagen');
    return Response.json({ templates: list, source: 'imgflip' });
  } catch {
    return Response.json({ templates: FALLBACK_TEMPLATES, source: 'fallback' });
  }
}
