import { audioAllowed, mockWav } from '@/lib/songServer';

export const dynamic = 'force-dynamic';

// Reicht die Hörprobe durch (gleiche Domain → der Browser darf sie für Web Audio auslesen)
export async function GET(req) {
  const q = new URL(req.url).searchParams;
  if (process.env.MOCK_AI === '1' && q.get('mock')) {
    return new Response(mockWav(q.get('mock')), { headers: { 'content-type': 'audio/wav', 'cache-control': 'public, max-age=3600' } });
  }
  const u = q.get('u') || '';
  if (!audioAllowed(u)) return new Response('Nicht erlaubt', { status: 400 });
  try {
    const r = await fetch(u);
    if (!r.ok) return new Response('Hörprobe nicht verfügbar', { status: 502 });
    return new Response(r.body, { headers: { 'content-type': r.headers.get('content-type') || 'audio/mpeg', 'cache-control': 'public, max-age=3600, s-maxage=3600' } });
  } catch {
    return new Response('Hörprobe nicht verfügbar', { status: 502 });
  }
}
