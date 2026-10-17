'use client';
// Festes Spielerprofil im Browser: wird einmal angelegt und danach automatisch erkannt.
// Der Server (lib/profiles.js) speichert Punkte und den Wiederherstellungs-Code.
import { MOCK } from './supabase';

// Im Testmodus pro Tab ein eigenes Profil
export const store = () => (MOCK ? sessionStorage : localStorage);
const KEY = 'qa_profile';

export function loadProfile() {
  try {
    const p = JSON.parse(store().getItem(KEY) || 'null');
    if (p && p.id && p.name && p.avatar) return p;
  } catch {}
  return null;
}
export function storeProfile(p) {
  try { store().setItem(KEY, JSON.stringify(p)); } catch {}
  return p;
}

async function api(body) {
  const r = await fetch('/api/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error || 'Fehler');
  return d.profile;
}
export const fetchProfile = async (id) => {
  const r = await fetch('/api/profile?id=' + encodeURIComponent(id), { cache: 'no-store' });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error || 'Fehler');
  return d.profile;
};
export const saveRemote = (p) => api({ action: 'save', id: p.id, name: p.name, avatar: p.avatar });
export const restoreRemote = (code) => api({ action: 'restore', code });

// Lokales Profil mit den Server-Daten zusammenführen
export const merge = (local, remote) => ({ ...local, ...remote, registered: true });

// ---------- G-Punkte ----------
// Jedes Spiel hat eigene Punkteskalen (Quiz 2.000, Meme 15 …). Damit die Gesamtpunkte fair sind,
// gibt es pro Spiel G-Punkte: Teilnahme + Platzierung.
export const G_POINTS = { play: 10, place: [30, 15, 5] };
export function gPoints(rank, players) {
  let p = G_POINTS.play;
  if (rank === 1) p += G_POINTS.place[0];
  else if (rank === 2 && players >= 3) p += G_POINTS.place[1];
  else if (rank === 3 && players >= 4) p += G_POINTS.place[2];
  return p;
}

// Level aus G-Punkten: jedes Level braucht etwas mehr als das vorherige
export function levelInfo(points = 0) {
  let level = 1;
  let need = 100;
  let rest = points;
  while (rest >= need) { rest -= need; level += 1; need = Math.round(need * 1.15); }
  return { level, into: rest, need, pct: Math.round((rest / need) * 100) };
}

export const TITLES = [
  [1, 'Frischling'], [3, 'Stammgast'], [6, 'Zocker'], [10, 'Routinier'], [15, 'G-City-Legende'], [25, 'Unantastbar'],
];
export const titleFor = (level) => TITLES.filter(([l]) => level >= l).pop()[1];

// Ergebnis melden (jedes Spiel zählt nur einmal – key)
const reported = new Set();
export async function reportResult(profile, { key, game, rank, players, win }) {
  if (!profile?.registered || reported.has(key)) return null;
  reported.add(key);
  try {
    const p = await api({ action: 'result', id: profile.id, key, game, points: gPoints(rank, players), win });
    return p;
  } catch {
    reported.delete(key);
    return null;
  }
}
