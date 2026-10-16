// Nur auf dem Server: Konto prüfen, Münzen/Joker verwalten, Stripe-Zahlungen.
import crypto from 'crypto';
import { db, isMock } from './questions';
import { ITEMS, itemById, productById, DAILY_BONUS } from './shopCatalog';

const clean = (v) => String(v || '').trim().replace(/^["']|["']$/g, '').trim().replace(/^[A-Z_]+=/, '');
export const stripeKey = () => clean(process.env.STRIPE_SECRET_KEY);
export const mockPay = () => isMock() || process.env.MOCK_PAY === '1';
// sk_… = Geheimschlüssel, rk_… = eingeschränkter Schlüssel (empfohlen: nur „Checkout Sessions: Schreiben“)
export const stripeMode = () => (mockPay() ? 'mock' : /^(sk|rk)_live_/.test(stripeKey()) ? 'live' : /^(sk|rk)_test_/.test(stripeKey()) ? 'test' : 'missing');

// ---------------- Konto aus dem Login-Token ----------------
export async function userFromReq(req) {
  const h = req.headers.get('authorization') || '';
  const token = h.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  if (isMock() && token.startsWith('mock:')) return { id: token.slice(5), email: token.slice(5) + '@test' };
  const c = db();
  if (!c) throw new Error('Datenbank nicht eingerichtet (SUPABASE_SECRET_KEY fehlt)');
  const { data, error } = await c.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email };
}

// ---------------- Testspeicher (nur lokal) ----------------
const mem = () => {
  if (!globalThis.__gcityWallet) globalThis.__gcityWallet = { wallets: {}, inv: {}, refs: new Set() };
  return globalThis.__gcityWallet;
};
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });

const missingSetup = (e) => /does not exist|Could not find the (table|function)|schema cache/i.test(e?.message || '');
async function rpc(name, args) {
  const { data, error } = await db().rpc(name, args);
  if (error) throw new Error(missingSetup(error) ? 'Der Shop ist noch nicht eingerichtet: Bitte supabase/shop.sql im Supabase SQL Editor ausführen.' : 'Datenbank: ' + error.message);
  return data;
}

export async function getWallet(user) {
  if (isMock()) {
    const m = mem();
    const w = m.wallets[user.id] || { coins: 0, last_daily: null };
    return { coins: w.coins, inventory: { ...(m.inv[user.id] || {}) }, canDaily: w.last_daily !== today() };
  }
  const c = db();
  const [w, inv] = await Promise.all([
    c.from('wallets').select('coins,last_daily').eq('user_id', user.id).maybeSingle(),
    c.from('inventory').select('item,qty').eq('user_id', user.id),
  ]);
  if (w.error) throw new Error(missingSetup(w.error) ? 'Der Shop ist noch nicht eingerichtet: Bitte supabase/shop.sql im Supabase SQL Editor ausführen.' : 'Datenbank: ' + w.error.message);
  const inventory = {};
  for (const r of inv.data || []) if (r.qty > 0) inventory[r.item] = r.qty;
  return { coins: w.data?.coins || 0, inventory, canDaily: !w.data?.last_daily || w.data.last_daily < today() };
}

export async function claimDaily(user) {
  if (isMock()) {
    const m = mem();
    const w = (m.wallets[user.id] = m.wallets[user.id] || { coins: 0, last_daily: null });
    if (w.last_daily === today()) return false;
    w.coins += DAILY_BONUS;
    w.last_daily = today();
    return true;
  }
  return (await rpc('shop_daily', { p_user: user.id, p_amount: DAILY_BONUS })) >= 0;
}

export async function buyItem(user, itemId, qty = 1) {
  const item = itemById(itemId);
  qty = Math.max(1, Math.min(10, Math.floor(Number(qty) || 1)));
  if (!item) throw new Error('Unbekannter Joker');
  if (isMock()) {
    const m = mem();
    const w = (m.wallets[user.id] = m.wallets[user.id] || { coins: 0, last_daily: null });
    if (w.coins < item.price * qty) return false;
    w.coins -= item.price * qty;
    const inv = (m.inv[user.id] = m.inv[user.id] || {});
    inv[item.id] = (inv[item.id] || 0) + qty;
    return true;
  }
  return !!(await rpc('shop_buy', { p_user: user.id, p_item: item.id, p_price: item.price, p_qty: qty }));
}

export async function useItem(user, itemId) {
  if (!itemById(itemId)) throw new Error('Unbekannter Joker');
  if (isMock()) {
    const inv = mem().inv[user.id] || {};
    if (!inv[itemId]) return false;
    inv[itemId] -= 1;
    return true;
  }
  return !!(await rpc('shop_use', { p_user: user.id, p_item: itemId }));
}

// Echtgeld-Kauf gutschreiben. ref = Stripe-Session → nie doppelt.
export async function grantProduct(userId, productId, ref, cents) {
  const p = productById(productId);
  if (!p) throw new Error('Unbekanntes Produkt');
  const coins = p.coins || 0;
  const items = p.items || {};
  if (isMock()) {
    const m = mem();
    if (m.refs.has(ref)) return false;
    m.refs.add(ref);
    const w = (m.wallets[userId] = m.wallets[userId] || { coins: 0, last_daily: null });
    w.coins += coins;
    const inv = (m.inv[userId] = m.inv[userId] || {});
    for (const [k, n] of Object.entries(items)) inv[k] = (inv[k] || 0) + n;
    return true;
  }
  return !!(await rpc('shop_grant', { p_user: userId, p_coins: coins, p_items: items, p_reason: 'stripe:' + p.id, p_ref: ref, p_cents: cents }));
}

// ---------------- Stripe ----------------
async function stripe(path, method = 'GET', params) {
  const key = stripeKey();
  if (!key) throw new Error('Zahlungen sind noch nicht eingerichtet (STRIPE_SECRET_KEY fehlt in Vercel).');
  const body = params ? new URLSearchParams(params).toString() : undefined;
  const r = await fetch('https://api.stripe.com/v1' + path, {
    method,
    headers: { authorization: 'Bearer ' + key, ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) },
    body,
  });
  const d = await r.json();
  if (!r.ok) throw new Error('Stripe: ' + (d.error?.message || r.status));
  return d;
}

export async function createCheckout(user, productId, origin) {
  const p = productById(productId);
  if (!p) throw new Error('Unbekanntes Produkt');
  const name = p.name || p.label;
  if (mockPay()) {
    const id = `mock_${Math.random().toString(36).slice(2, 10)}__${p.id}__${user.id}`;
    return { url: `${origin}/?shop=success&session_id=${encodeURIComponent(id)}` };
  }
  const params = {
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(p.cents),
    'line_items[0][price_data][product_data][name]': 'G City – ' + name,
    client_reference_id: user.id,
    customer_email: user.email || '',
    'metadata[user_id]': user.id,
    'metadata[product]': p.id,
    'payment_intent_data[metadata][user_id]': user.id,
    'payment_intent_data[metadata][product]': p.id,
    success_url: `${origin}/?shop=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?shop=cancel`,
    locale: 'de',
    // Neue Stripe-Konten haben „Managed Payments“ (Stripe als Verkäufer) standardmäßig an.
    // Verkäufer ist aber Serious Innovations selbst → für unsere Käufe ausschalten.
    'managed_payments[enabled]': 'false',
  };
  let s;
  try {
    s = await stripe('/checkout/sessions', 'POST', params);
  } catch (e) {
    // Konten ohne Managed Payments kennen den Parameter evtl. nicht → ohne ihn nochmal
    if (!/managed_payments/i.test(String(e.message))) throw e;
    delete params['managed_payments[enabled]'];
    s = await stripe('/checkout/sessions', 'POST', params);
  }
  return { url: s.url };
}

// Nach der Rückkehr von Stripe: Session prüfen und gutschreiben (falls der Webhook noch nicht war)
export async function confirmCheckout(user, sessionId) {
  if (mockPay() && sessionId.startsWith('mock_')) {
    const [, product, uid] = sessionId.split('__');
    if (uid !== user.id) throw new Error('Falsches Konto');
    await grantProduct(uid, product, sessionId, productById(product)?.cents || 0);
    return { paid: true, product };
  }
  const s = await stripe('/checkout/sessions/' + encodeURIComponent(sessionId));
  if (s.metadata?.user_id !== user.id) throw new Error('Dieser Kauf gehört zu einem anderen Konto.');
  if (s.payment_status !== 'paid') return { paid: false };
  await grantProduct(s.metadata.user_id, s.metadata.product, s.id, s.amount_total);
  return { paid: true, product: s.metadata.product };
}

// Webhook-Signatur prüfen (Stripe-Signature: t=…,v1=…)
export function verifyWebhook(payload, header, secret) {
  const parts = Object.fromEntries(String(header || '').split(',').map((x) => x.split('=')));
  const v1s = String(header || '').split(',').filter((x) => x.startsWith('v1=')).map((x) => x.slice(3));
  if (!parts.t || !v1s.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 600) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${payload}`).digest('hex');
  return v1s.some((v) => v.length === expected.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(expected)));
}

export const ITEM_IDS = ITEMS.map((i) => i.id);
