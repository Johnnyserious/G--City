'use client';
// Merkt sich, welche Emojis man am meisten benutzt (nur auf diesem Handy).
// Neuere Nutzung zählt etwas mehr als alte, damit sich die Leiste mit der Zeit anpasst.
const KEY = 'gcity_emoji_use';
export const DEFAULT_EMOJIS = ['😂', '🔥', '💀', '😭', '👏', '😱', '🤯', '🙈'];

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
export function recordEmoji(e) {
  const m = read();
  const now = Date.now();
  const x = m[e] || { n: 0, t: now };
  // alte Nutzung verliert pro Woche ca. 30 % Gewicht
  const decay = Math.pow(0.7, (now - x.t) / 604800000);
  m[e] = { n: x.n * decay + 1, t: now };
  const top = Object.entries(m).sort((a, b) => b[1].n - a[1].n).slice(0, 40);
  try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(top))); } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('gcity-emoji'));
}
export function topEmojis(n = 5) {
  const now = Date.now();
  const used = Object.entries(read())
    .map(([e, x]) => [e, x.n * Math.pow(0.7, (now - x.t) / 604800000)])
    .sort((a, b) => b[1] - a[1])
    .map(([e]) => e);
  return [...new Set([...used, ...DEFAULT_EMOJIS])].slice(0, n);
}
