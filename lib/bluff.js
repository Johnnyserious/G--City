// Spiellogik fürs Lügen-Quiz. Reine Funktionen: online beim Host, offline (ein Handy) im Browser.
import { onlineIds, activeIds, joinLate, localJudge } from './engine';
import { ALL } from './bluffQuestions';

export const MIN_PLAYERS = 3;
export const COUNT_OPTIONS = [5, 8, 10];
export const SECOND_OPTIONS = [45, 60, 90];
export const CHOOSE_SECONDS = 30;
export const REVEAL_SECONDS = 30;
export const POINTS = { truth: 3, fooled: 2, like: 1 };

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const norm = (x) => String(x || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');

// Ist die "Lüge" in Wahrheit (fast) die richtige Antwort?
export function isTruth(lie, q) {
  return localJudge(lie, { answer: q.answer, aliases: q.aliases || [] }, false) === true;
}

// Antwortmöglichkeiten: Wahrheit + alle Lügen (gleiche Lügen werden zusammengelegt)
export function buildOptions(q, lies) {
  const opts = [{ id: 'T', text: q.answer, truth: true, authors: [] }];
  for (const [pid, text] of Object.entries(lies)) {
    const ex = opts.find((o) => !o.truth && norm(o.text) === norm(text));
    if (ex) ex.authors.push(pid);
    else opts.push({ id: 'L' + opts.length, text, truth: false, authors: [pid] });
  }
  return shuffle(opts);
}

// Punkte einer Frage. picks: { pid: optId }, likes: { pid: [optId] }
export function scoreRound(options, picks, likes) {
  const pts = {};
  const add = (id, n) => { pts[id] = (pts[id] || 0) + n; };
  const byId = Object.fromEntries(options.map((o) => [o.id, o]));
  for (const [pid, oid] of Object.entries(picks)) {
    const o = byId[oid];
    if (!o) continue;
    if (o.truth) add(pid, POINTS.truth);
    else for (const a of o.authors) if (a !== pid) add(a, POINTS.fooled);
  }
  for (const [pid, list] of Object.entries(likes || {})) {
    for (const oid of list || []) {
      const o = byId[oid];
      if (o && !o.truth) for (const a of o.authors) if (a !== pid) add(a, POINTS.like);
    }
  }
  return pts;
}

// Wer hat welche Option gewählt / geliket (für die Auflösung)
export function pickersOf(oid, picks) {
  return Object.keys(picks).filter((pid) => picks[pid] === oid);
}
export function likesOf(oid, likes) {
  return Object.keys(likes || {}).filter((pid) => (likes[pid] || []).includes(oid));
}

// ======================= Online (Raum) =======================

export function bluffInitial(hostId) {
  return {
    v: 1,
    game: 'bluff',
    hostId,
    phase: 'lobby', // lobby | loading | write | choose | reveal | final
    players: {},
    order: [],
    settings: { count: 8, seconds: 60, topics: [ALL] },
    qs: [],
    qIdx: 0,
    inGame: [],
    lies: {},
    options: [],
    picks: {},
    likes: {},
    deadline: 0,
    roundPoints: {},
    usedQs: [],
    error: '',
  };
}

const active = (s) => s.inGame.filter((id) => s.players[id]?.online);

function startWrite(s) {
  s.inGame = activeIds(s); // auch wer nur kurz weg ist bleibt dabei
  s.lies = {};
  s.options = [];
  s.picks = {};
  s.likes = {};
  s.roundPoints = {};
  s.phase = 'write';
  s.deadline = Date.now() + s.settings.seconds * 1000;
}

function startChoose(s) {
  s.options = buildOptions(s.qs[s.qIdx], s.lies);
  s.phase = 'choose';
  s.deadline = Date.now() + CHOOSE_SECONDS * 1000;
}

function reveal(s) {
  s.roundPoints = scoreRound(s.options, s.picks, s.likes);
  for (const [pid, n] of Object.entries(s.roundPoints)) if (s.players[pid]) s.players[pid].score += n;
  s.phase = 'reveal';
  s.deadline = Date.now() + REVEAL_SECONDS * 1000;
}

function next(s) {
  s.qIdx += 1;
  if (s.qIdx >= s.qs.length) s.phase = 'final';
  else startWrite(s);
}

// Host bekommt die Fragen vom Server
export function bluffLoaded(s, questions) {
  s.qs = questions;
  s.qIdx = 0;
  s.usedQs = [...s.usedQs, ...questions.map((q) => q.question)].slice(-200);
  s.error = '';
  for (const id of s.order) if (s.players[id]) s.players[id].score = 0;
  startWrite(s);
}

export function bluffAction(s, a) {
  const pid = a.playerId;
  const isHost = pid === s.hostId;
  switch (a.type) {
    case 'settings':
      if (!isHost || !['lobby', 'final'].includes(s.phase)) return false;
      if (COUNT_OPTIONS.includes(a.count)) s.settings.count = a.count;
      if (SECOND_OPTIONS.includes(a.seconds)) s.settings.seconds = a.seconds;
      if (Array.isArray(a.topics)) s.settings.topics = a.topics.length ? a.topics.slice(0, 12).map(String) : [ALL];
      return true;
    case 'start':
      if (!isHost || !['lobby', 'final'].includes(s.phase)) return false;
      if (onlineIds(s).length < MIN_PLAYERS) return false;
      s.phase = 'loading';
      s.error = '';
      return true;
    case 'lie': {
      if (s.phase !== 'write' || !s.inGame.includes(pid)) return false;
      const text = String(a.text || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      if (!text || isTruth(text, s.qs[s.qIdx])) return false;
      s.lies[pid] = text;
      if (active(s).every((id) => s.lies[id])) startChoose(s);
      return true;
    }
    case 'unlie':
      if (s.phase !== 'write' || !s.lies[pid]) return false;
      delete s.lies[pid];
      return true;
    case 'endWrite':
      if (!isHost || s.phase !== 'write') return false;
      startChoose(s);
      return true;
    case 'pick': {
      if (s.phase !== 'choose' || !s.inGame.includes(pid)) return false;
      const o = s.options.find((x) => x.id === a.option);
      if (!o || o.authors.includes(pid)) return false;
      s.picks[pid] = o.id;
      if (active(s).every((id) => s.picks[id])) reveal(s);
      return true;
    }
    case 'like': {
      if (!['choose', 'reveal'].includes(s.phase) || !s.inGame.includes(pid)) return false;
      const o = s.options.find((x) => x.id === a.option);
      if (!o || o.truth || o.authors.includes(pid)) return false;
      const list = s.likes[pid] || [];
      s.likes[pid] = list.includes(o.id) ? list.filter((x) => x !== o.id) : [...list, o.id];
      // Likes in der Auflösung zählen sofort mit
      if (s.phase === 'reveal') {
        const before = s.roundPoints;
        const after = scoreRound(s.options, s.picks, s.likes);
        for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
          if (s.players[id]) s.players[id].score += (after[id] || 0) - (before[id] || 0);
        }
        s.roundPoints = after;
      }
      return true;
    }
    case 'endChoose':
      if (!isHost || s.phase !== 'choose') return false;
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
        } // Punkte bleiben stehen – sie werden erst beim nächsten Spielstart auf 0 gesetzt
      }
      return true;
    default:
      return false;
  }
}

export function bluffTick(s) {
  const now = Date.now();
  // Wer (wieder) da ist, spielt bei der laufenden Frage direkt mit
  if ((s.phase === 'write' || s.phase === 'choose') && joinLate(s).length) return true;
  if (s.phase === 'write' && (now > s.deadline || (active(s).length && active(s).every((id) => s.lies[id])))) {
    startChoose(s);
    return true;
  }
  if (s.phase === 'choose' && (now > s.deadline || (active(s).length && active(s).every((id) => s.picks[id])))) {
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
