'use client';
// Konto im Browser: Login (E-Mail + Passwort über Supabase Auth), Münzstand und Joker-Tasche.
// Ein gemeinsamer Speicher, damit Spielezentrale, Shop und Spiele denselben Stand sehen.
import { useEffect, useState } from 'react';
import { getSupabase, MOCK } from './supabase';

const state = { user: null, token: null, ready: false, wallet: null, recovery: false, error: '' };
const subs = new Set();
const emit = () => subs.forEach((f) => f({ ...state }));
const set = (x) => { Object.assign(state, x); emit(); };

let started = false;
function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (MOCK) {
    try {
      const u = JSON.parse(sessionStorage.getItem('mock_auth') || 'null');
      if (u) set({ user: u, token: 'mock:' + u.id });
    } catch {}
    set({ ready: true });
    if (state.user) refreshWallet();
    return;
  }
  const sb = getSupabase();
  if (!sb) return set({ ready: true });
  sb.auth.getSession().then(({ data }) => {
    const s = data?.session;
    set({ user: s?.user ? { id: s.user.id, email: s.user.email } : null, token: s?.access_token || null, ready: true });
    if (s) refreshWallet();
  });
  sb.auth.onAuthStateChange((event, s) => {
    set({ user: s?.user ? { id: s.user.id, email: s.user.email } : null, token: s?.access_token || null });
    if (event === 'PASSWORD_RECOVERY') set({ recovery: true });
    if (s && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) refreshWallet();
    if (!s) set({ wallet: null });
  });
}

const errText = (e) => {
  const m = String(e?.message || e || '');
  if (/Invalid login credentials/i.test(m)) return 'E-Mail oder Passwort stimmt nicht.';
  if (/Email not confirmed/i.test(m)) return 'Bitte bestätige zuerst deine E-Mail (Link im Postfach).';
  if (/already registered|already exists/i.test(m)) return 'Für diese E-Mail gibt es schon ein Konto – einfach einloggen.';
  if (/Password should be at least/i.test(m)) return 'Das Passwort muss mindestens 6 Zeichen haben.';
  if (/rate limit/i.test(m)) return 'Zu viele Versuche – bitte kurz warten.';
  return m || 'Unbekannter Fehler';
};

export async function signUp(email, password) {
  if (MOCK) return signIn(email, password);
  const { data, error } = await getSupabase().auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
  if (error) throw new Error(errText(error));
  return { needsConfirm: !data.session };
}

export async function signIn(email, password) {
  if (MOCK) {
    if (!email || !password) throw new Error('Bitte E-Mail und Passwort eingeben.');
    const u = { id: email.toLowerCase().replace(/[^a-z0-9]/g, ''), email };
    sessionStorage.setItem('mock_auth', JSON.stringify(u));
    set({ user: u, token: 'mock:' + u.id });
    await refreshWallet();
    return {};
  }
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw new Error(errText(error));
  return {};
}

export async function signOut() {
  if (MOCK) sessionStorage.removeItem('mock_auth');
  else await getSupabase().auth.signOut();
  set({ user: null, token: null, wallet: null });
}

export async function resetPassword(email) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw new Error(errText(error));
}

export async function setNewPassword(password) {
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw new Error(errText(error));
  set({ recovery: false });
}

// Aufruf der Shop-API mit Login-Token
export async function shopApi(action, payload = {}) {
  if (!state.token) throw new Error('Bitte einloggen');
  const r = await fetch('/api/shop', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + state.token },
    body: JSON.stringify({ action, ...payload }),
  });
  const d = await r.json();
  if (!r.ok || d.error) throw new Error(d.error || 'Fehler');
  if (d.coins != null) set({ wallet: { coins: d.coins, inventory: d.inventory || {}, canDaily: d.canDaily, mode: state.wallet?.mode } });
  return d;
}

export async function refreshWallet() {
  if (!state.token) return null;
  try {
    const r = await fetch('/api/shop', { headers: { authorization: 'Bearer ' + state.token }, cache: 'no-store' });
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    set({ wallet: d, error: '' });
    return d;
  } catch (e) {
    set({ error: String(e.message || e) });
    return null;
  }
}

// Einen gekauften Joker verbrauchen (vor dem Einsetzen im Spiel)
export async function consumeItem(item) {
  return shopApi('use', { item });
}

export function useAccount() {
  const [s, setS] = useState({ ...state });
  useEffect(() => {
    start();
    subs.add(setS);
    setS({ ...state });
    return () => subs.delete(setS);
  }, []);
  return s;
}
