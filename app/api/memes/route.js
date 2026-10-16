import { FALLBACK_TEMPLATES } from '@/lib/memeTemplates';

// Meme-Vorlagen aus zwei kostenlosen Quellen (einmal am Tag frisch geladen):
//  - Imgflip: die ~100 beliebtesten Vorlagen (mit Bildgröße)
//  - memegen.link: ~200 weitere Klassiker (Größe wird im Browser beim Laden ermittelt)
// Fällt eine Quelle aus, reicht die andere. Fallen beide aus, kommt die Ersatzliste.
export const revalidate = 86400;

const norm = (n) => String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function imgflip() {
  const r = await fetch('https://api.imgflip.com/get_memes', { next: { revalidate: 86400 } });
  const d = await r.json();
  return (d?.data?.memes || [])
    .filter((m) => m.url && m.width && m.height)
    .map((m) => ({ id: String(m.id), name: m.name, url: m.url, width: m.width, height: m.height }));
}

async function memegen() {
  const r = await fetch('https://api.memegen.link/templates/', { next: { revalidate: 86400 } });
  const d = await r.json();
  return (Array.isArray(d) ? d : [])
    .filter((m) => m.id && m.blank && !/\.gif$/i.test(m.blank))
    .map((m) => ({ id: 'mg-' + m.id, name: m.name || m.id, url: m.blank }));
}

export async function GET() {
  if (process.env.MOCK_AI === '1') return Response.json({ templates: FALLBACK_TEMPLATES, source: 'fallback' });
  const [a, b] = await Promise.allSettled([imgflip(), memegen()]);
  const seen = new Set();
  const list = [];
  for (const t of [...(a.status === 'fulfilled' ? a.value : []), ...FALLBACK_TEMPLATES, ...(b.status === 'fulfilled' ? b.value : [])]) {
    const k = norm(t.name);
    if (seen.has(k) || seen.has(t.id)) continue;
    seen.add(k);
    seen.add(t.id);
    list.push(t);
  }
  if (list.length < 20) return Response.json({ templates: FALLBACK_TEMPLATES, source: 'fallback' });
  return Response.json({ templates: list, source: [a.status === 'fulfilled' && 'imgflip', b.status === 'fulfilled' && 'memegen'].filter(Boolean).join('+') || 'fallback' });
}
