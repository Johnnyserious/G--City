import { devUser, listRequests, createRequest, goLive, discard, reply } from '@/lib/devServer';

export const dynamic = 'force-dynamic';
const fail = (m, status = 400) => Response.json({ error: m }, { status });

export async function GET(req) {
  try {
    if (!(await devUser(req))) return fail('Kein Zugriff', 403);
    return Response.json({ requests: await listRequests() });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}

// { action: 'create' | 'live' | 'discard' | 'reply', … }
export async function POST(req) {
  try {
    const user = await devUser(req);
    if (!user) return fail('Kein Zugriff', 403);
    const b = await req.json();
    if (b.action === 'create') await createRequest(user, b);
    else if (b.action === 'live') await goLive(Number(b.number));
    else if (b.action === 'discard') await discard(Number(b.number));
    else if (b.action === 'reply') await reply(Number(b.number), b.text);
    else return fail('Unbekannte Aktion');
    return Response.json({ requests: await listRequests() });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
