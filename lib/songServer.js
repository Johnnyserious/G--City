// Nur auf dem Server: Songs auswählen und kostenlose 30-Sekunden-Hörproben finden.
// Zuerst Deezer (offizielle Vorschau-Clips, keine Kosten), dann iTunes als Ersatz.
// Songs ohne eindeutigen Treffer werden übersprungen.
import { SONGS, ALL_SONG_CATS } from './songList';
import { normTitle } from './songs';

const mockAudio = () => process.env.MOCK_AI === '1';
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
const artistOk = (want, got) => { const a = norm(want); const b = norm(got); return !!a && !!b && (b.includes(a) || a.includes(b)); };
const titleOk = (want, got) => { const a = normTitle(want); const b = normTitle(got); return !!a && !!b && (a === b || b.startsWith(a) || a.startsWith(b)); };
const proxied = (u) => '/api/songs/audio?u=' + encodeURIComponent(u);

async function deezer(song) {
  const q = `artist:"${song.artist}" track:"${song.title.replace(/\s*\(.*\)\s*/g, ' ').trim()}"`;
  const r = await fetch('https://api.deezer.com/search?limit=10&q=' + encodeURIComponent(q), { next: { revalidate: 3000 }, signal: AbortSignal.timeout(3500) });
  const d = await r.json();
  const list = (d?.data || []).filter((x) => x.preview);
  const hit = list.find((x) => artistOk(song.artist, x.artist?.name) && titleOk(song.title, x.title)) || list.find((x) => titleOk(song.title, x.title) && artistOk(song.artist, x.artist?.name || ''));
  return hit ? { preview: hit.preview, cover: hit.album?.cover_big || hit.album?.cover_medium || '' } : null;
}

async function itunes(song) {
  const r = await fetch('https://itunes.apple.com/search?country=DE&media=music&entity=song&limit=10&term=' + encodeURIComponent(song.artist + ' ' + song.title), { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) });
  const d = await r.json();
  const hit = (d?.results || []).find((x) => x.previewUrl && artistOk(song.artist, x.artistName) && titleOk(song.title, x.trackName));
  return hit ? { preview: hit.previewUrl, cover: (hit.artworkUrl100 || '').replace('100x100', '600x600') } : null;
}

async function resolve(song) {
  if (mockAudio()) return { preview: '/api/songs/audio?mock=' + encodeURIComponent(song.id), cover: '' };
  try { const a = await deezer(song); if (a) return { ...a, preview: proxied(a.preview) }; } catch {}
  try { const b = await itunes(song); if (b) return { ...b, preview: proxied(b.preview) }; } catch {}
  return null;
}

const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

// count Songs aus den gewählten Kategorien, ohne Doppelte und möglichst ohne zuletzt gespielte
export async function pickSongs({ cats = [], count = 10, exclude = [] }) {
  const all = !cats.length || cats.includes(ALL_SONG_CATS);
  const pool = SONGS.filter((s) => all || cats.includes(s.cat));
  const fresh = pool.filter((s) => !exclude.includes(s.id));
  const cand = shuffle(fresh.length >= count ? fresh : pool);
  const out = [];
  for (let i = 0; i < cand.length && out.length < count; i += 6) {
    const batch = cand.slice(i, i + 6);
    const res = await Promise.all(batch.map((s) => resolve(s).catch(() => null)));
    batch.forEach((s, k) => { if (res[k] && out.length < count) out.push({ id: s.id, cat: s.cat, artist: s.artist, title: s.title, alts: s.alts, preview: res[k].preview, cover: res[k].cover }); });
  }
  return out;
}

// Erlaubte Quellen für den Audio-Durchreicher
export const audioAllowed = (u) => { try { const h = new URL(u).hostname; return /(^|\.)dzcdn\.net$/.test(h) || /(^|\.)itunes\.apple\.com$/.test(h) || /(^|\.)mzstatic\.com$/.test(h) || /(^|\.)apple\.com$/.test(h); } catch { return false; } };

// Testmodus: 30 s Ton als WAV (Melodie je nach Song verschieden)
export function mockWav(seed = 'x') {
  const rate = 8000, secs = 30, n = rate * secs;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const notes = Array.from({ length: 8 }, (_, i) => 220 * Math.pow(2, ((h >> (i * 3)) & 7) / 6));
  for (let i = 0; i < n; i++) {
    const t = i / rate; const f = notes[Math.floor(t * 2) % 8]; const vol = t < 3 ? 0.05 : 0.4;
    buf.writeInt16LE(Math.round(Math.sin(2 * Math.PI * f * t) * vol * 32767), 44 + i * 2);
  }
  return buf;
}
