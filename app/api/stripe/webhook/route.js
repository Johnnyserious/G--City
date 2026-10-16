import { verifyWebhook, grantProduct } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

// Stripe meldet bezahlte Käufe hierher – so kommen die Münzen auch an, wenn jemand nach dem Bezahlen das Fenster schließt.
export async function POST(req) {
  const secret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim().replace(/^["']|["']$/g, '');
  if (!secret) return new Response('Webhook nicht eingerichtet', { status: 500 });
  const payload = await req.text();
  if (!verifyWebhook(payload, req.headers.get('stripe-signature'), secret)) return new Response('Falsche Signatur', { status: 400 });
  const ev = JSON.parse(payload);
  if (ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') {
    const s = ev.data.object;
    if (s.payment_status === 'paid' && s.metadata?.user_id && s.metadata?.product) {
      try {
        await grantProduct(s.metadata.user_id, s.metadata.product, s.id, s.amount_total);
      } catch (e) {
        console.error(e);
        return new Response('Fehler beim Gutschreiben', { status: 500 });
      }
    }
  }
  return Response.json({ received: true });
}
