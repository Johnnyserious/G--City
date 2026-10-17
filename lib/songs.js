// Spiellogik „Songs erraten“. Reine Funktionen: online beim Host, auf einem Handy im Browser.
import { onlineIds, activeIds, joinLate } from './engine';
import { ALL_SONG_CATS } from './songList';

export const MIN_PLAYERS = 1;
export const STAGES = [0.2, 1, 3, 5, 15]; // Sekunden, die man pro Etappe hört
export const POINTS = [100, 80, 60, 40, 20]; // Punkte, wenn man in dieser Etappe richtig liegt
export const ROUND_OPTIONS = [5, 10, 15];
export const SECOND_OPTIONS = [45, 60, 90];
export const REVEAL_SECONDS = 12;
export const ALL = ALL_SONG_CATS;

// Titel vergleichbar machen: feat./Klammern/Satzzeichen/Umlaute raus
export function normTitle(t) {
  return String(t || '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\s(feat|ft|featuring|prod)\.?\s.*$/g, ' ')
    .replace(/\s-\s.*(remix|version|edit|mix|remaster).*$/g, ' ')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' und ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
const squash = (t) => normTitle(t).replace(/^(the|der|die|das) /, '').replace(/ /g, '');

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// 'correct' | 'close' | 'artist' (nur Interpret) | 'wrong'. Erlaubt: Titel, weitere Antworten, „Interpret – Titel“, kleine Tippfehler.
export function checkSong(guess, song) {
  const g = squash(guess);
  if (!g) return 'wrong';
  const artist = squash(song.artist);
  const answers = [song.title, ...(song.alts || [])].map(squash).filter(Boolean);
  const variants = [g];
  if (artist && g.startsWith(artist)) variants.push(g.slice(artist.length));
  if (artist && g.endsWith(artist)) variants.push(g.slice(0, -artist.length));
  let best = 9;
  for (const v of variants) for (const a of answers) {
    if (!v) continue;
    if (v === a) return 'correct';
    const tol = a.length <= 4 ? 0 : a.length <= 8 ? 1 : 2;
    const d = lev(v, a);
    if (d <= tol) return 'correct';
    best = Math.min(best, d - tol);
    if (v.length >= 5 && a.startsWith(v)) best = Math.min(best, 1);
    if (a.length >= 8 && v.length >= 5 && (a.includes(v) || v.includes(a)) && Math.min(v.length, a.length) / Math.max(v.length, a.length) >= 0.6) best = Math.min(best, 1);
  }
  if (best <= 2) return 'close';
  if (artist && (g === artist || lev(g, artist) <= (artist.length > 6 ? 1 : 0))) return 'artist';
  return 'wrong';
}

// ======================= Online (Raum) =======================

export function songsInitial(hostId) {
  return {
    v: 1,
    game: 'songs',
    hostId,
    phase: 'lobby', // lobby | loading | play | reveal | final
    players: {},
    order: [],
    settings: { rounds: 10, seconds: 60, cats: [ALL], mode: 'own' }, // own = jeder eigener Song, same = alle denselben
    songs: [],
    round: 0,
    inGame: [],
    assign: {}, // pid -> Index in songs
    prog: {}, // pid -> { stage, done, solved, pts, tries: [{t, k}] }
    nextIdx: 0,
    deadline: 0,
    usedSongs: [],
    error: '',
  };
}

const active = (s) => s.inGame.filter((id) => s.players[id]?.online);
const freshProg = () => ({ stage: 0, done: false, solved: false, pts: 0, tries: [] });

// Wie viele Songs der Host laden muss
export function songsNeeded(s) {
  const n = s.settings.mode === 'same' ? 1 : Math.max(1, onlineIds(s).length) + 2;
  return Math.min(100, s.settings.rounds * n + (s.settings.mode === 'same' ? 0 : 4));
}

function giveSong(s, pid) {
  if (s.settings.mode === 'same') { s.assign[pid] = s.round; return true; }
  if (s.nextIdx >= s.songs.length) return false;
  s.assign[pid] = s.nextIdx++;
  return true;
}

function startRound(s) {
  s.inGame = activeIds(s);
  s.assign = {};
  s.prog = {};
  for (const id of s.inGame) if (giveSong(s, id)) s.prog[id] = freshProg();
  s.inGame = s.inGame.filter((id) => s.prog[id]);
  s.phase = 'play';
  s.deadline = Date.now() + s.settings.seconds * 1000;
}

function enoughForRound(s) {
  if (s.settings.mode === 'same') return s.round < s.songs.length;
  return s.nextIdx < s.songs.length;
}

function reveal(s) {
  for (const id of s.inGame) {
    const p = s.prog[id];
    if (p && !p.done) p.done = true;
  }
  s.phase = 'reveal';
  s.deadline = Date.now() + REVEAL_SECONDS * 1000;
}

function next(s) {
  s.round += 1;
  if (s.round >= s.settings.rounds || !enoughForRound(s)) s.phase = 'final';
  else startRound(s);
}

export function songsLoaded(s, songs) {
  s.songs = songs;
  s.round = 0;
  s.nextIdx = 0;
  s.usedSongs = [...s.usedSongs, ...songs.map((x) => x.id)].slice(-400);
  s.error = '';
  for (const id of s.order) if (s.players[id]) s.players[id].score = 0;
  if (s.settings.mode === 'same' && songs.length < s.settings.rounds) s.settings.rounds = songs.length;
  startRound(s);
}

export function songFor(s, pid) {
  const i = s.assign?.[pid];
  return i == null ? null : s.songs[i];
}

function advance(s, pid, kind, text) {
  const p = s.prog[pid];
  if (text) p.tries.push({ t: String(text).slice(0, 50), k: kind, st: p.stage });
  if (kind === 'correct') {
    p.solved = true;
    p.done = true;
    p.pts = POINTS[p.stage];
    s.players[pid].score += p.pts;
  } else if (kind === 'close' || kind === 'artist') {
    // „ganz nah dran“ / „Interpret stimmt“ kostet keine Etappe
  } else if (p.stage >= STAGES.length - 1) p.done = true;
  else p.stage += 1;
  if (active(s).every((id) => s.prog[id]?.done)) reveal(s);
}

export function songsAction(s, a) {
  const pid = a.playerId;
  const isHost = pid === s.hostId;
  switch (a.type) {
    case 'settings':
      if (!isHost || !['lobby', 'final'].includes(s.phase)) return false;
      if (ROUND_OPTIONS.includes(a.rounds)) s.settings.rounds = a.rounds;
      if (SECOND_OPTIONS.includes(a.seconds)) s.settings.seconds = a.seconds;
      if (a.mode === 'own' || a.mode === 'same') s.settings.mode = a.mode;
      if (Array.isArray(a.cats)) s.settings.cats = a.cats.length ? a.cats.slice(0, 8).map(String) : [ALL];
      return true;
    case 'start':
      if (!isHost || !['lobby', 'final'].includes(s.phase)) return false;
      if (onlineIds(s).length < MIN_PLAYERS) return false;
      s.phase = 'loading';
      s.error = '';
      return true;
    case 'guess': {
      if (s.phase !== 'play' || !s.prog[pid] || s.prog[pid].done) return false;
      const song = songFor(s, pid);
      const text = String(a.text || '').trim();
      if (!song || !text) return false;
      advance(s, pid, checkSong(text, song), text);
      return true;
    }
    case 'skip':
      if (s.phase !== 'play' || !s.prog[pid] || s.prog[pid].done) return false;
      if (typeof a.stage === 'number' && a.stage !== s.prog[pid].stage) return false; // doppelt getippt
      advance(s, pid, 'skip', '');
      return true;
    case 'giveup':
      if (s.phase !== 'play' || !s.prog[pid] || s.prog[pid].done) return false;
      s.prog[pid].done = true;
      if (active(s).every((id) => s.prog[id]?.done)) reveal(s);
      return true;
    case 'endRound':
      if (!isHost || s.phase !== 'play') return false;
      reveal(s);
      return true;
    case 'next':
      if (!isHost || s.phase !== 'reveal') return false;
      next(s);
      return true;
    case 'lobby':
      if (!isHost) return false;
      s.phase = 'lobby';
      for (const id of Object.keys(s.players)) {
        if (!s.players[id].online) {
          delete s.players[id];
          s.order = s.order.filter((x) => x !== id);
        }
      }
      return true;
    default:
      return false;
  }
}

export function songsTick(s) {
  const now = Date.now();
  if (s.phase === 'play') {
    // Wer (wieder) da ist, bekommt sofort einen Song
    let changed = false;
    for (const id of joinLate(s)) {
      if (!s.prog[id] && giveSong(s, id)) { s.prog[id] = freshProg(); changed = true; }
      else if (!s.prog[id]) s.inGame = s.inGame.filter((x) => x !== id);
    }
    if (now > s.deadline || (active(s).length && active(s).every((id) => s.prog[id]?.done))) { reveal(s); return true; }
    return changed;
  }
  if (s.phase === 'reveal' && now > s.deadline) { next(s); return true; }
  return false;
}

export function winners(players) {
  const max = Math.max(0, ...players.map((p) => p.score));
  return players.filter((p) => p.score === max && max > 0);
}

// ======================= Ein Handy =======================
// Punkte je nachdem, wie schnell jemand den Song erkannt hat (Sekunden seit Start)
export const LOCAL_POINTS = (sec) => (sec <= 5 ? 3 : sec <= 15 ? 2 : 1);
