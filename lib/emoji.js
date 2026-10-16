// Spiellogik fürs Emoji-Rätsel. Läuft beim Host. Alle raten gleichzeitig, die Schnellsten bekommen am meisten.
import { onlineIds } from './engine';
import { EMOJI_PUZZLES } from './emojiPuzzles';
import { maskWord } from './draw';

export const MIN_PLAYERS = 2;
export const COUNT_OPTIONS = [10, 15, 20];
export const SECOND_OPTIONS = [30, 45, 60];
export const REVEAL_SECONDS = 5;
export const PLACE_POINTS = [5, 3, 2]; // 1., 2., 3. richtig – danach je 1
export const ALL = 'alle';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const ARTICLES = /^(der|die|das|the|ein|eine)\s+/i;
const norm = (x) =>
  String(x || '').trim().replace(ARTICLES, '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');

function dist(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

// 'correct' | 'close' | 'wrong'. Ein Tippfehler zählt (ab 6 Buchstaben), zwei = "ganz nah dran".
export function checkEmoji(text, puzzle) {
  const g = norm(text);
  if (!g) return 'wrong';
  let best = 'wrong';
  for (const ans of [puzzle.a, ...(puzzle.al || [])]) {
    const w = norm(ans);
    if (!w) continue;
    if (g === w) return 'correct';
    const d = dist(g, w);
    if (w.length >= 6 && d <= 1) return 'correct';
    if (w.length >= 4 && d <= 2) best = 'close';
  }
  return best;
}

// Buchstaben-Tipp: nach 40 % Anzahl der Buchstaben, nach 70 % zusätzlich der erste Buchstabe
export function emojiHint(puzzle, level) {
  if (!level) return null;
  return maskWord(puzzle.a, level >= 2 ? [0] : []);
}

export function pickPuzzles(topics, count, used = []) {
  const keys = !topics?.length || topics.includes(ALL) ? null : topics;
  const pool = EMOJI_PUZZLES.filter((p) => !keys || keys.includes(p.topic));
  const fresh = pool.filter((p) => !used.includes(p.id));
  const list = shuffle(fresh.length >= count ? fresh : pool);
  return list.slice(0, count);
}

export function emojiInitial(hostId) {
  return {
    v: 1,
    game: 'emoji',
    hostId,
    phase: 'lobby', // lobby | play | reveal | final
    players: {},
    order: [],
    settings: { count: 10, seconds: 45, topics: [ALL] },
    puzzles: [],
    idx: 0,
    deadline: 0,
    startedAt: 0,
    hint: 0,
    solved: [], // { pid, pts } in Reihenfolge
    guesses: [], // { pid, text?, kind }
    used: [],
  };
}

function startPuzzle(s) {
  s.phase = 'play';
  s.solved = [];
  s.guesses = [];
  s.hint = 0;
  s.startedAt = Date.now();
  s.deadline = Date.now() + s.settings.seconds * 1000;
}

function endPuzzle(s) {
  s.phase = 'reveal';
  s.deadline = Date.now() + REVEAL_SECONDS * 1000;
}

function nextPuzzle(s) {
  s.idx += 1;
  if (s.idx >= s.puzzles.length) s.phase = 'final';
  else startPuzzle(s);
}

const guessers = (s) => onlineIds(s);

export function emojiAction(s, a) {
  const pid = a.playerId;
  const isHost = pid === s.hostId;
  switch (a.type) {
    case 'settings':
      if (!isHost || !['lobby', 'final'].includes(s.phase)) return false;
      if (COUNT_OPTIONS.includes(a.count)) s.settings.count = a.count;
      if (SECOND_OPTIONS.includes(a.seconds)) s.settings.seconds = a.seconds;
      if (Array.isArray(a.topics)) s.settings.topics = a.topics.length ? a.topics.slice(0, 10).map(String) : [ALL];
      return true;
    case 'start':
      if (!isHost || !['lobby', 'final'].includes(s.phase)) return false;
      if (onlineIds(s).length < MIN_PLAYERS) return false;
      for (const id of s.order) if (s.players[id]) s.players[id].score = 0;
      s.puzzles = pickPuzzles(s.settings.topics, s.settings.count, s.used);
      s.used = [...s.used, ...s.puzzles.map((p) => p.id)].slice(-300);
      s.idx = 0;
      startPuzzle(s);
      return true;
    case 'guess': {
      if (s.phase !== 'play' || !s.players[pid] || s.solved.some((x) => x.pid === pid)) return false;
      const text = String(a.text || '').trim().slice(0, 50);
      if (!text) return false;
      const kind = checkEmoji(text, s.puzzles[s.idx]);
      if (kind === 'correct') {
        const pts = PLACE_POINTS[s.solved.length] ?? 1;
        s.solved = [...s.solved, { pid, pts }];
        s.players[pid].score += pts;
        s.guesses = [...s.guesses, { pid, kind }].slice(-40);
        if (guessers(s).every((id) => s.solved.some((x) => x.pid === id))) endPuzzle(s);
      } else {
        s.guesses = [...s.guesses, kind === 'close' ? { pid, kind } : { pid, text, kind }].slice(-40);
      }
      return true;
    }
    case 'skip':
      if (!isHost || s.phase !== 'play') return false;
      endPuzzle(s);
      return true;
    case 'next':
      if (!isHost || s.phase !== 'reveal') return false;
      nextPuzzle(s);
      return true;
    case 'lobby':
      if (!isHost) return false;
      s.phase = 'lobby';
      for (const id of Object.keys(s.players)) {
        if (!s.players[id].online) {
          delete s.players[id];
          s.order = s.order.filter((x) => x !== id);
        } else s.players[id].score = 0;
      }
      return true;
    default:
      return false;
  }
}

export function emojiTick(s) {
  const now = Date.now();
  if (s.phase === 'play') {
    if (now > s.deadline) { endPuzzle(s); return true; }
    const total = s.settings.seconds * 1000;
    const passed = now - s.startedAt;
    const want = passed > total * 0.7 ? 2 : passed > total * 0.4 ? 1 : 0;
    if (want > s.hint) { s.hint = want; return true; }
  }
  if (s.phase === 'reveal' && now > s.deadline) {
    nextPuzzle(s);
    return true;
  }
  return false;
}

export function winners(players) {
  const max = Math.max(0, ...players.map((p) => p.score));
  return players.filter((p) => p.score === max && max > 0);
}
