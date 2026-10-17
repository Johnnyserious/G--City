// Nur auf dem Server: feste Spielerprofile in Supabase (Tabelle profiles, Setup in supabase/profiles.sql).
// Das Profil lebt im Browser (localStorage) UND hier – so bleiben Punkte erhalten und man kann es
// mit dem 6-stelligen Code auf ein neues Handy holen.
import { db, isMock } from './questions';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne 0/O/1/I, damit man nichts verwechselt
const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
export const GAMES = ['quiz', 'imposter', 'meme', 'draw', 'bluff', 'emoji', 'estimate', 'songs', 'slf'];

const cleanName = (n) => String(n || '').trim().slice(0, 16);
const cleanAvatar = (a) => (a && typeof a === 'object' && !Array.isArray(a) ? Object.fromEntries(Object.entries(a).slice(0, 20).map(([k, v]) => [String(k).slice(0, 30), v == null ? null : String(v).slice(0, 40)])) : {});
const cleanId = (id) => String(id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);

// Interne Felder (z. B. gespeicherte Face-ID-Schlüssel unter stats._pk) nie nach außen geben
const cleanStats = (st) => Object.fromEntries(Object.entries(st || {}).filter(([k]) => !k.startsWith('_')));
const pub = (p) => p && { id: p.id, name: p.name, avatar: p.avatar, code: p.code, points: Number(p.points) || 0, games: p.games || 0, wins: p.wins || 0, stats: cleanStats(p.stats), achievements: p.achievements || [], createdAt: p.created_at, passkeys: (p.stats?._pk || []).length };

// ---------- Testspeicher ----------
const mem = () => (globalThis.__gcityProfiles = globalThis.__gcityProfiles || { rows: {}, games: new Set() });

function tableMissing(error) {
  return /relation .*profiles.* does not exist|Could not find the table|schema cache|function .*profile_add_result/i.test(error?.message || '');
}
const MISSING = 'Die Profil-Tabelle fehlt noch: Bitte supabase/profiles.sql im Supabase SQL Editor ausführen.';

export async function getProfile(id) {
  id = cleanId(id);
  if (!id) return null;
  if (isMock()) return pub(mem().rows[id]);
  const { data, error } = await db().from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(tableMissing(error) ? MISSING : 'Datenbank: ' + error.message);
  return pub(data);
}

// Anlegen oder Name/Avatar aktualisieren
export async function saveProfile({ id, name, avatar }) {
  id = cleanId(id);
  name = cleanName(name);
  if (!id || !name) throw new Error('Name fehlt');
  avatar = cleanAvatar(avatar);
  if (isMock()) {
    const m = mem();
    const ex = m.rows[id];
    m.rows[id] = ex ? { ...ex, name, avatar } : { id, name, avatar, code: newCode(), points: 0, games: 0, wins: 0, stats: {}, achievements: [], created_at: new Date().toISOString() };
    return pub(m.rows[id]);
  }
  const ex = await getProfile(id);
  if (ex) {
    const { data, error } = await db().from('profiles').update({ name, avatar, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (error) throw new Error('Datenbank: ' + error.message);
    return pub(data);
  }
  for (let i = 0; i < 5; i++) {
    const { data, error } = await db().from('profiles').insert({ id, name, avatar, code: newCode() }).select('*').single();
    if (!error) return pub(data);
    if (tableMissing(error)) throw new Error(MISSING);
    if (!/duplicate key/i.test(error.message)) throw new Error('Datenbank: ' + error.message);
    // Code war schon vergeben → neuer Versuch
  }
  throw new Error('Konnte keinen freien Code finden');
}

// Profil über den Wiederherstellungs-Code holen (neues Handy)
export async function restoreProfile(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 6) return null;
  if (isMock()) return pub(Object.values(mem().rows).find((r) => r.code === code));
  const { data, error } = await db().from('profiles').select('*').eq('code', code).maybeSingle();
  if (error) throw new Error(tableMissing(error) ? MISSING : 'Datenbank: ' + error.message);
  return pub(data);
}

// Ergebnis eines Spiels eintragen (jedes Spiel zählt pro Profil nur einmal: key)
export async function addResult({ id, key, game, points, win }) {
  id = cleanId(id);
  key = String(key || '').slice(0, 120);
  game = GAMES.includes(game) ? game : 'quiz';
  points = Math.max(0, Math.min(100000, Math.round(Number(points) || 0)));
  win = !!win;
  if (!id || !key) throw new Error('Angaben fehlen');
  if (isMock()) {
    const m = mem();
    const r = m.rows[id];
    if (!r) return null;
    const k = id + '|' + key;
    if (m.games.has(k)) return pub(r);
    m.games.add(k);
    r.points += points;
    r.games += 1;
    r.wins += win ? 1 : 0;
    const s = r.stats[game] || { games: 0, wins: 0, points: 0 };
    r.stats[game] = { games: s.games + 1, wins: s.wins + (win ? 1 : 0), points: s.points + points };
    return pub(r);
  }
  const { data, error } = await db().rpc('profile_add_result', { p_id: id, p_key: key, p_game: game, p_points: points, p_win: win });
  if (error) throw new Error(tableMissing(error) ? MISSING : 'Datenbank: ' + error.message);
  return data && data[0] ? pub(data[0]) : getProfile(id);
}

// ---------- Face ID / Passkeys (Schlüssel liegen in stats._pk, kein eigenes SQL nötig) ----------
export async function getPasskeys(id) {
  id = cleanId(id);
  if (isMock()) return { profile: pub(mem().rows[id]), keys: mem().rows[id]?.stats?._pk || [] };
  const { data, error } = await db().from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(tableMissing(error) ? MISSING : 'Datenbank: ' + error.message);
  return { profile: pub(data), keys: data?.stats?._pk || [] };
}
export async function savePasskeys(id, keys) {
  id = cleanId(id);
  keys = keys.slice(-5); // höchstens 5 Geräte pro Profil
  if (isMock()) { const r = mem().rows[id]; if (r) r.stats = { ...r.stats, _pk: keys }; return; }
  const { data, error } = await db().from('profiles').select('stats').eq('id', id).maybeSingle();
  if (error || !data) throw new Error('Profil nicht gefunden');
  const { error: e2 } = await db().from('profiles').update({ stats: { ...(data.stats || {}), _pk: keys }, updated_at: new Date().toISOString() }).eq('id', id);
  if (e2) throw new Error('Datenbank: ' + e2.message);
}
