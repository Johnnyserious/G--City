'use client';
import { createClient } from '@supabase/supabase-js';
import { mockClient } from './mockRealtime';

export const MOCK = process.env.NEXT_PUBLIC_MOCK === '1';

let client = null;
export function getSupabase() {
  if (MOCK) return mockClient;
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { realtime: { params: { eventsPerSecond: 20 } } });
  return client;
}
export const supabaseConfigured = () =>
  MOCK ||
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
