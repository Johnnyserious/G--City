import { createSupport } from '@/lib/devServer';

export const dynamic = 'force-dynamic';

// POST { kind: 'fehler'|'wunsch'|'idee', text, name, profileId, game, device } → GitHub-Issue in der Dev-Inbox
export async function POST(req) {
  try {
    const b = await req.json();
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const number = await createSupport(b, ip);
    return Response.json({ ok: true, number });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 400 });
  }
}
