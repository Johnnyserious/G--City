import { getProfile, saveProfile, restoreProfile, addResult } from '@/lib/profiles';

export const dynamic = 'force-dynamic';
const fail = (m, status = 400) => Response.json({ error: m }, { status });

// GET /api/profile?id=…  → { profile }
export async function GET(req) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    return Response.json({ profile: await getProfile(id) });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}

// POST { action: 'save' | 'restore' | 'result', … }
export async function POST(req) {
  try {
    const b = await req.json();
    if (b.action === 'save') return Response.json({ profile: await saveProfile(b) });
    if (b.action === 'restore') {
      const p = await restoreProfile(b.code);
      return p ? Response.json({ profile: p }) : fail('Diesen Code gibt es nicht. Prüf ihn nochmal.', 404);
    }
    if (b.action === 'result') return Response.json({ profile: await addResult(b) });
    return fail('Unbekannte Aktion');
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
