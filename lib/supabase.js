'use client';
import { createClient } from '@supabase/supabase-js';
import { mockClient } from './mockRealtime';

export const MOCK = process.env.NEXT_PUBLIC_MOCK === '1';

let client = null;
export function getSupabase() {
  if (MOCK) return mockClient;
  if (client) return client;
  const { url, key } = supabaseEnv();
  if (!url || !key) return null;
  client = createClient(url, key, { realtime: { params: { eventsPerSecond: 20 } } });
  return client;
}
export const supabaseConfigured = () =>
  MOCK ||
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);

// Werte säubern: Leerzeichen, Anführungszeichen, "/rest/v1" am Ende usw.
const clean = (v) => String(v || '').trim().replace(/^["']|["']$/g, '').trim();
export function supabaseEnv() {
  let url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/^NEXT_PUBLIC_SUPABASE_URL=/, '');
  url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  if (url && !/^https?:\/\//.test(url)) url = 'https://' + url;
  const key = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY).replace(/^NEXT_PUBLIC_SUPABASE_[A-Z_]+=/, '');
  return { url, key };
}
export function supabaseDiag() {
  const { url, key } = supabaseEnv();
  const kind = key.startsWith('sb_publishable_') ? 'publishable' : key.startsWith('sb_secret_') ? 'SECRET (falsch!)' : key.startsWith('eyJ') ? 'anon (JWT)' : key ? 'unbekannt' : 'fehlt';
  let host = '';
  try { host = new URL(url).host; } catch { host = 'ungültig: ' + url.slice(0, 40); }
  return { host, kind };
}
