import { userFromReq, getWallet, claimDaily, buyItem, useItem, createCheckout, confirmCheckout, stripeMode } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

const fail = (msg, status = 400) => Response.json({ error: msg }, { status });

// Münzstand + Joker-Tasche
export async function GET(req) {
  try {
    const user = await userFromReq(req);
    if (!user) return fail('Bitte einloggen', 401);
    return Response.json({ ...(await getWallet(user)), mode: stripeMode() });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}

// { action: 'daily' | 'buy' | 'use' | 'checkout' | 'confirm', … }
export async function POST(req) {
  try {
    const user = await userFromReq(req);
    if (!user) return fail('Bitte einloggen', 401);
    const b = await req.json();
    let ok = true;
    let extra = {};
    if (b.action === 'daily') ok = await claimDaily(user);
    else if (b.action === 'buy') {
      ok = await buyItem(user, b.item, b.qty);
      if (!ok) return fail('Nicht genug Münzen');
    } else if (b.action === 'use') {
      ok = await useItem(user, b.item);
      if (!ok) return fail('Diesen Joker hast du nicht mehr');
    } else if (b.action === 'checkout') {
      if (!b.consent) return fail('Bitte bestätige die Hinweise zum Widerrufsrecht.');
      const origin = req.headers.get('origin') || new URL(req.url).origin;
      return Response.json(await createCheckout(user, b.product, origin));
    } else if (b.action === 'confirm') {
      extra = await confirmCheckout(user, String(b.sessionId || ''));
    } else return fail('Unbekannte Aktion');
    return Response.json({ ok, ...extra, ...(await getWallet(user)) });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
