// Spiellogik fürs Schätz-Duell. Reine Funktionen: online beim Host, offline (ein Handy) im Browser.
// Zwei Modi: 'all' = alle schätzen, Rangliste nach Abstand. 'duel' = zwei schätzen, die anderen wetten.
import { onlineIds, activeIds, joinLate } from './engine';
import { EST_QUESTIONS, ALL } from './estimateQuestions';

export const MIN_PLAYERS = 2;
export const COUNT_OPTIONS = [5, 8, 10, 15];
export const SECOND_OPTIONS = [20, 30, 45];
export const REVEAL_SECONDS = 25;
export const PLACE_POINTS = [5, 3, 2]; // alle gegen alle: 1., 2., 3.
export const EXACT_BONUS = 3; // exakt getroffen
export const DUEL = { win: 5, tie: 3, bet: 2, betTie: 1 };

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// "1.234,5" / "1234.5" / "84 Mio" → Zahl (oder null)
export function parseNum(input) {
  let t = String(input || '').trim().replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  if (!t || t === '-') return null;
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.');
  else if (t.includes(',')) t = t.replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function fmt(n, unit) {
  if (n == null || !Number.isFinite(n)) return '–';
  if (unit === 'Jahr') return String(Math.round(n));
  return n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}
export const withUnit = (n, unit) => (unit === 'Jahr' ? fmt(n, unit) : `${fmt(n, unit)} ${unit}`);

export function pickQuestions(topics, count, used = []) {
  const keys = !topics?.length || topics.includes(ALL) ? null : topics;
  const pool = EST_QUESTIONS.filter((q) => !keys || keys.includes(q.topic));
  const fresh = pool.filter((q) => !used.includes(q.id));
  return shuffle(fresh.length >= count ? fresh : pool).slice(0, count);
}

const close = (a, b) => Math.abs(a - b) < 1e-9;

// Alle gegen alle. entries: { pid: { v, joker } } → { pid: { pts, rank, diff, exact } }
export function scoreAll(answer, entries) {
  const list = Object.entries(entries)
    .filter(([, e]) => e && Number.isFinite(e.v))
    .map(([pid, e]) => ({ pid, diff: Math.abs(e.v - answer), joker: !!e.joker }))
    .sort((a, b) => a.diff - b.diff);
  const out = {};
  let rank = 0;
  list.forEach((x, i) => {
    if (i === 0 || !close(x.diff, list[i - 1].diff)) rank = i; // gleicher Abstand = gleicher Platz
    const exact = close(x.diff, 0);
    let pts = (PLACE_POINTS[rank] || 0) + (exact ? EXACT_BONUS : 0);
    if (x.joker) pts *= 2;
    out[x.pid] = { pts, rank: rank + 1, diff: x.diff, exact };
  });
  return out;
}

// Duell. duel = [a, b], bets: { pid: 'A' | 'B' }
export function scoreDuel(answer, duel, entries, bets) {
  const [a, b] = duel;
  const da = Number.isFinite(entries[a]?.v) ? Math.abs(entries[a].v - answer) : Infinity;
  const db = Number.isFinite(entries[b]?.v) ? Math.abs(entries[b].v - answer) : Infinity;
  const winner = da === db ? (da === Infinity ? null : 'tie') : da < db ? 'A' : 'B';
  const out = {};
  const give = (pid, n, extra = {}) => {
    const j = entries[pid]?.joker ? 2 : 1;
    out[pid] = { pts: n * j, ...extra };
  };
  give(a, (winner === 'A' ? DUEL.win : winner === 'tie' ? DUEL.tie : 0) + (close(da, 0) ? EXACT_BONUS : 0), { diff: da, exact: close(da, 0) });
  give(b, (winner === 'B' ? DUEL.win : winner === 'tie' ? DUEL.tie : 0) + (close(db, 0) ? EXACT_BONUS : 0), { diff: db, exact: close(db, 0) });
  for (const [pid, side] of Object.entries(bets || {})) {
    if (pid === a || pid === b) continue;
    give(pid, winner === 'tie' ? DUEL.betTie : side === winner ? DUEL.bet : 0, { bet: side });
  }
  return { winner, points: out };
}

// Duell-Paar: wer am wenigsten dran war, möglichst nicht dasselbe Paar wie eben
export function pickDuel(ids, counts = {}, last = []) {
  const order = shuffle(ids).sort((x, y) => (counts[x] || 0) - (counts[y] || 0));
  let pair = order.slice(0, 2);
  if (ids.length > 2 && last.length === 2 && pair.every((p) => last.includes(p))) pair = [order[0], order[2]];
  return shuffle(pair);
}

// Wer muss in dieser Frage etwas eingeben?
export const needsEstimate = (mode, duel, pid) => mode !== 'duel' || duel.includes(pid);

// ======================= Online (Raum) =======================

export function estInitial(hostId) {
  return {
    v: 1,
    game: 'estimate',
    hostId,
    phase: 'lobby', // lobby | answer | reveal | final
    players: {},
    order: [],
    settings: { count: 8, seconds: 30, topics: [ALL], mode: 'all' },
    qs: [],
    idx: 0,
    inGame: [],
    entries: {},
    bets: {},
    duel: [],
    duelCounts: {},
    jokerUsed: {},
    result: null,
    deadline: 0,
    used: [],
  };
}

const active = (s) => s.inGame.filter((id) => s.players[id]?.online);

function startQuestion(s) {
  s.inGame = activeIds(s); // auch wer nur kurz weg ist bleibt dabei
  s.entries = {};
  s.bets = {};
  s.result = null;
  if (s.settings.mode === 'duel') {
    const onl = s.inGame.filter((id) => s.players[id]?.online);
    s.duel = pickDuel(onl.length >= 2 ? onl : s.inGame, s.duelCounts, s.duel);
    for (const id of s.duel) s.duelCounts[id] = (s.duelCounts[id] || 0) + 1;
  } else s.duel = [];
  s.phase = 'answer';
  s.deadline = Date.now() + s.settings.seconds * 1000;
}

function allIn(s) {
  return active(s).every((id) => (needsEstimate(s.settings.mode, s.duel, id) ? s.entries[id] : s.bets[id]));
}

function reveal(s) {
  const q = s.qs[s.idx];
  if (s.settings.mode === 'duel') {
    const r = scoreDuel(q.a, s.duel, s.entries, s.bets);
    s.result = r;
    for (const [pid, x] of Object.entries(r.points)) if (s.players[pid]) s.players[pid].score += x.pts;
  } else {
    const pts = scoreAll(q.a, s.entries);
    s.result = { points: pts };
    for (const [pid, x] of Object.entries(pts)) if (s.players[pid]) s.players[pid].score += x.pts;
  }
  s.phase = 'reveal';
  s.deadline = Date.now() + REVEAL_SECONDS * 1000;
}

function next(s) {
  s.idx += 1;
  if (s.idx >= s.qs.length) s.phase = 'final';
  else startQuestion(s);
}

export function estAction(s, a) {
  const pid = a.playerId;
  const isHost = pid === s.hostId;
  switch (a.type) {
    case 'settings':
      if (!isHost || !['lobby', 'final'].includes(s.phase)) return false;
      if (COUNT_OPTIONS.includes(a.count)) s.settings.count = a.count;
      if (SECOND_OPTIONS.includes(a.seconds)) s.settings.seconds = a.seconds;
      if (['all', 'duel'].includes(a.mode)) s.settings.mode = a.mode;
      if (Array.isArray(a.topics)) s.settings.topics = a.topics.length ? a.topics.slice(0, 10).map(String) : [ALL];
      return true;
    case 'start':
      if (!isHost || !['lobby', 'final'].includes(s.phase)) return false;
      if (onlineIds(s).length < MIN_PLAYERS) return false;
      for (const id of s.order) if (s.players[id]) s.players[id].score = 0;
      s.qs = pickQuestions(s.settings.topics, s.settings.count, s.used);
      s.used = [...s.used, ...s.qs.map((q) => q.id)].slice(-200);
      s.idx = 0;
      s.jokerUsed = {};
      s.duelCounts = {};
      s.duel = [];
      startQuestion(s);
      return true;
    case 'estimate': {
      if (s.phase !== 'answer' || !s.inGame.includes(pid) || !needsEstimate(s.settings.mode, s.duel, pid)) return false;
      const v = typeof a.value === 'number' ? a.value : parseNum(a.value);
      if (v == null || !Number.isFinite(v) || Math.abs(v) > 1e13) return false;
      const joker = !!a.joker && !s.jokerUsed[pid];
      if (s.entries[pid]?.joker) delete s.jokerUsed[pid]; // Joker beim Ändern zurückgeben
      s.entries[pid] = { v, joker };
      if (joker) s.jokerUsed[pid] = true;
      if (allIn(s)) reveal(s);
      return true;
    }
    case 'bet': {
      if (s.phase !== 'answer' || s.settings.mode !== 'duel' || !s.inGame.includes(pid) || s.duel.includes(pid)) return false;
      if (!['A', 'B'].includes(a.side)) return false;
      const joker = !!a.joker && !s.jokerUsed[pid];
      s.bets[pid] = a.side;
      if (joker) { s.entries[pid] = { joker: true }; s.jokerUsed[pid] = true; }
      if (allIn(s)) reveal(s);
      return true;
    }
    case 'endAnswer':
      if (!isHost || s.phase !== 'answer') return false;
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
        } else s.players[id].score = 0;
      }
      return true;
    default:
      return false;
  }
}

export function estTick(s) {
  const now = Date.now();
  // Wer (wieder) da ist, spielt bei der laufenden Frage direkt mit
  if ((s.phase === 'answer' || s.phase === 'reveal') && joinLate(s).length) return true;
  if (s.phase === 'answer' && (now > s.deadline || (active(s).length && allIn(s)))) {
    reveal(s);
    return true;
  }
  if (s.phase === 'reveal' && now > s.deadline) {
    next(s);
    return true;
  }
  return false;
}

export function winners(players) {
  const max = Math.max(0, ...players.map((p) => p.score));
  return players.filter((p) => p.score === max && max > 0);
}
