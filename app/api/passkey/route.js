import { registrationOptions, verifyRegistration, authenticationOptions, verifyAuthentication } from '@/lib/passkeys';

export const dynamic = 'force-dynamic';

// POST { action: 'regOptions' | 'regVerify' | 'authOptions' | 'authVerify', … }
export async function POST(req) {
  try {
    const b = await req.json();
    if (b.action === 'regOptions') return Response.json(await registrationOptions(req, b.id));
    if (b.action === 'regVerify') return Response.json(await verifyRegistration(req, b));
    if (b.action === 'authOptions') return Response.json(await authenticationOptions(req));
    if (b.action === 'authVerify') return Response.json(await verifyAuthentication(req, b));
    return Response.json({ error: 'Unbekannte Aktion' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 400 });
  }
}
