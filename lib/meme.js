// Spiellogik für "Make it Meme". Läuft beim Host. Reine Funktionen bis auf Zufall und Zeit.
import { onlineIds } from './engine';
import { FALLBACK_TEMPLATES } from './memeTemplates';

export const MIN_PLAYERS = 3;
export const ROUND_OPTIONS = [3, 5, 7];
export const SECOND_OPTIONS = [60, 90, 120];
export const PRESENT_SECONDS = 25; // Zeit pro Meme zum Bewerten + Raten
export const GUESS_POINTS = 3; // richtig geraten, von wem das Meme ist
export const MAX_TEXT = 90;

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function memeInitial(hostId) {
  return {
    v: 1,
    game: 'meme',
    hostId,
    phase: 'lobby', // lobby | write | present | roundEnd | final
    players: {},
    order: [],
    settings: { rounds: 3, seconds: 90 },
    round: 0,
    inGame: [],
    assign: {}, // pid → { tpl, rerolled }
    subs: {}, // pid → { top, bottom }
    deadline: 0,
    show: [], // Reihenfolge der Memes (pids) beim Zeigen
    showIdx: 0,
    cur: {}, // Stimmen zum aktuell gezeigten Meme: voter → { stars, guess }
    results: [], // Ergebnisse der Runde
    roundPoints: {},
    usedTpls: [],
  };
}

function pickTemplate(s, templates) {
  const list = templates && templates.length ? templates : FALLBACK_TEMPLATES;
  const taken = new Set([...s.usedTpls, ...Object.values(s.assign).map((a) => a.tpl.id)]);
  let pool = list.filter((t) => !taken.has(t.id));
  if (!pool.length) pool = list;
  const t = pool[Math.floor(Math.random() * pool.length)];
  return { id: t.id, name: t.name, url: t.url, width: t.width, height: t.height };
}

function startRound(s, templates) {
  s.round += 1;
  s.inGame = onlineIds(s);
  s.assign = {};
  for (const id of s.inGame) s.assign[id] = { tpl: pickTemplate(s, templates), rerolled: false };
  s.usedTpls = [...s.usedTpls, ...Object.values(s.assign).map((a) => a.tpl.id)].slice(-80);
  s.subs = {};
  s.results = [];
  s.roundPoints = {};
  s.phase = 'write';
  s.deadline = Date.now() + s.settings.seconds * 1000;
}

const writers = (s) => s.inGame.filter((id) => s.players[id]?.online);

function startPresent(s) {
  s.show = shuffle(Object.keys(s.subs).filter((id) => s.assign[id]));
  s.showIdx = 0;
  s.cur = {};
  if (!s.show.length) {
    s.phase = 'roundEnd';
    return;
  }
  s.phase = 'present';
  s.deadline = Date.now() + PRESENT_SECONDS * 1000;
}

// Wer darf das aktuelle Meme bewerten? Alle Mitspieler außer dem Ersteller
export const raters = (s) => {
  const author = s.show[s.showIdx];
  return s.inGame.filter((id) => id !== author && s.players[id]?.online);
};

function scoreCurrent(s) {
  const author = s.show[s.showIdx];
  let stars = 0;
  const guessedBy = [];
  for (const [voter, v] of Object.entries(s.cur)) {
    if (voter === author) continue;
    if (v.stars) stars += v.stars;
    if (v.guess === author) {
      guessedBy.push(voter);
      s.roundPoints[voter] = (s.roundPoints[voter] || 0) + GUESS_POINTS;
    }
  }
  s.roundPoints[author] = (s.roundPoints[author] || 0) + stars;
  const ratings = Object.entries(s.cur).filter(([v, x]) => v !== author && x.stars).length;
  s.results.push({ pid: author, tpl: s.assign[author].tpl, ...s.subs[author], stars, ratings, guessedBy });
}

function nextMeme(s) {
  scoreCurrent(s);
  s.showIdx += 1;
  s.cur = {};
  if (s.showIdx >= s.show.length) {
    for (const [pid, pts] of Object.entries(s.roundPoints)) if (s.players[pid]) s.players[pid].score += pts;
    s.phase = s.round >= s.settings.rounds ? 'final' : 'roundEnd';
    return;
  }
  s.deadline = Date.now() + PRESENT_SECONDS * 1000;
}

const voteComplete = (s, v) => v && v.stars >= 1 && v.guess;

export function memeAction(s, a, templates) {
  const pid = a.playerId;
  const isHost = pid === s.hostId;
  switch (a.type) {
    case 'settings':
      if (!isHost || !['lobby', 'final'].includes(s.phase)) return false;
      if (ROUND_OPTIONS.includes(a.rounds)) s.settings.rounds = a.rounds;
      if (SECOND_OPTIONS.includes(a.seconds)) s.settings.seconds = a.seconds;
      return true;
    case 'start':
      if (!isHost || !['lobby', 'final'].includes(s.phase)) return false;
      if (onlineIds(s).length < MIN_PLAYERS) return false;
      s.round = 0;
      for (const id of s.order) if (s.players[id]) s.players[id].score = 0;
      startRound(s, templates);
      return true;
    case 'nextRound':
      if (!isHost || s.phase !== 'roundEnd') return false;
      startRound(s, templates);
      return true;
    case 'reroll': {
      const as = s.assign[pid];
      if (s.phase !== 'write' || !as || as.rerolled || s.subs[pid]) return false;
      as.tpl = pickTemplate(s, templates);
      as.rerolled = true;
      s.usedTpls = [...s.usedTpls, as.tpl.id].slice(-80);
      return true;
    }
    case 'submit': {
      if (s.phase !== 'write' || !s.assign[pid]) return false;
      const top = String(a.top || '').trim().slice(0, MAX_TEXT);
      const bottom = String(a.bottom || '').trim().slice(0, MAX_TEXT);
      if (!top && !bottom) return false;
      s.subs[pid] = { top, bottom };
      if (writers(s).every((id) => s.subs[id])) startPresent(s);
      return true;
    }
    case 'unsubmit': // nochmal bearbeiten
      if (s.phase !== 'write' || !s.subs[pid]) return false;
      delete s.subs[pid];
      return true;
    case 'endWrite':
      if (!isHost || s.phase !== 'write') return false;
      startPresent(s);
      return true;
    case 'rate': {
      if (s.phase !== 'present' || !raters(s).includes(pid)) return false;
      const v = { ...(s.cur[pid] || {}) };
      if (a.stars != null) v.stars = Math.max(1, Math.min(5, Math.round(a.stars)));
      if (a.guess != null && s.inGame.includes(a.guess) && a.guess !== pid) v.guess = a.guess;
      s.cur[pid] = v;
      if (raters(s).every((id) => voteComplete(s, s.cur[id]))) nextMeme(s);
      return true;
    }
    case 'skipMeme':
      if (!isHost || s.phase !== 'present') return false;
      nextMeme(s);
      return true;
    case 'lobby':
      if (!isHost) return false;
      s.phase = 'lobby';
      s.round = 0;
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

// Läuft beim Host alle 0,5 s
export function memeTick(s) {
  const now = Date.now();
  if (s.phase === 'write') {
    const w = writers(s);
    if (now > s.deadline || (w.length && w.every((id) => s.subs[id]))) {
      startPresent(s);
      return true;
    }
  }
  if (s.phase === 'present') {
    const r = raters(s);
    if (now > s.deadline || (r.length && r.every((id) => voteComplete(s, s.cur[id]))) || !r.length) {
      nextMeme(s);
      return true;
    }
  }
  return false;
}

// Sieger (bei Gleichstand mehrere)
export function winners(s) {
  const ps = s.inGame.map((id) => s.players[id]).filter(Boolean);
  const max = Math.max(0, ...ps.map((p) => p.score));
  return ps.filter((p) => p.score === max && max > 0);
}
