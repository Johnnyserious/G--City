// Spiellogik für "Make it Meme". Läuft beim Host. Reine Funktionen bis auf Zufall und Zeit.
import { onlineIds, activeIds, joinLate } from './engine';
import { FALLBACK_TEMPLATES } from './memeTemplates';

export const MIN_PLAYERS = 3;
export const ROUND_OPTIONS = [3, 5, 7];
export const SECOND_OPTIONS = [60, 90, 120];
export const PRESENT_SECONDS = 25; // Zeit pro Meme zum Bewerten + Raten
export const GUESS_POINTS = 3; // richtig geraten, von wem das Meme ist
export const MAX_TEXT = 90;
export const MAX_BOXES = 6; // so viele Textfelder darf man ins Bild setzen
// Wertung (stellt der Host ein):
//  'guess' = Rangliste nach richtig erratenen Memes (Sterne entscheiden bei Gleichstand)
//  'mix'   = Sterne + richtig geraten (je +3) zusammen
export const SCORING = [
  { v: 'guess', label: '🎯 Richtig erraten zählt', sub: 'Wer am öftesten richtig tippt, von wem ein Meme ist, gewinnt. ⭐ entscheiden bei Gleichstand.' },
  { v: 'mix', label: '⭐ + 🎯 zusammen', sub: 'Sterne gehen als Punkte an den Ersteller, richtig geraten +3.' },
];

// Textfelder säubern: x/y = Mitte des Felds (0–1 im Bild), size = Schriftgröße (0,6–1,8)
export function cleanBoxes(raw) {
  if (!Array.isArray(raw)) return [];
  const n = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Number(v))) : d);
  return raw
    .slice(0, MAX_BOXES)
    .map((b) => ({ x: n(b?.x, 0, 1, 0.5), y: n(b?.y, 0, 1, 0.5), size: n(b?.size, 0.6, 1.8, 1), text: String(b?.text || '').trim().slice(0, MAX_TEXT) }))
    .filter((b) => b.text);
}

// Alte Form (oben/unten) → Textfelder
export const boxesFromTopBottom = (top, bottom) => cleanBoxes([{ x: 0.5, y: 0.1, text: top }, { x: 0.5, y: 0.9, text: bottom }]);

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
    settings: { rounds: 3, seconds: 90, scoring: 'guess' },
    stats: {}, // pid → { stars, correct } über das ganze Spiel
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
  s.inGame = activeIds(s); // auch wer nur kurz weg ist bleibt dabei
  s.assign = {};
  for (const id of s.inGame) s.assign[id] = { tpl: pickTemplate(s, templates), rerolled: false };
  s.usedTpls = [...s.usedTpls, ...Object.values(s.assign).map((a) => a.tpl.id)].slice(-80);
  s.subs = {};
  s.results = [];
  s.roundPoints = {};
  s.roundStars = {};
  s.roundCorrect = {};
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
      s.roundPoints[voter] = (s.roundPoints[voter] || 0) + (s.settings.scoring === 'mix' ? GUESS_POINTS : 1);
    }
  }
  s.roundStars = s.roundStars || {};
  s.roundCorrect = s.roundCorrect || {};
  s.roundStars[author] = (s.roundStars[author] || 0) + stars;
  for (const v of guessedBy) s.roundCorrect[v] = (s.roundCorrect[v] || 0) + 1;
  if (s.settings.scoring === 'mix') s.roundPoints[author] = (s.roundPoints[author] || 0) + stars;
  const ratings = Object.entries(s.cur).filter(([v, x]) => v !== author && x.stars).length;
  s.results.push({ pid: author, tpl: s.assign[author].tpl, ...s.subs[author], stars, ratings, guessedBy });
}

function nextMeme(s) {
  scoreCurrent(s);
  s.showIdx += 1;
  s.cur = {};
  if (s.showIdx >= s.show.length) {
    for (const [pid, pts] of Object.entries(s.roundPoints)) if (s.players[pid]) s.players[pid].score += pts;
    // Sterne + Treffer erst am Rundenende sichtbar machen (sonst verrät der Zwischenstand, wer welches Meme hat)
    s.stats = s.stats || {};
    for (const [pid, n] of Object.entries(s.roundStars || {})) (s.stats[pid] = s.stats[pid] || { stars: 0, correct: 0 }).stars += n;
    for (const [pid, n] of Object.entries(s.roundCorrect || {})) (s.stats[pid] = s.stats[pid] || { stars: 0, correct: 0 }).correct += n;
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
      if (SCORING.some((x) => x.v === a.scoring)) s.settings.scoring = a.scoring;
      return true;
    case 'start':
      if (!isHost || !['lobby', 'final'].includes(s.phase)) return false;
      if (onlineIds(s).length < MIN_PLAYERS) return false;
      s.round = 0;
      s.stats = {};
      if (!s.settings.scoring) s.settings.scoring = 'guess';
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
      const boxes = Array.isArray(a.boxes) ? cleanBoxes(a.boxes) : boxesFromTopBottom(a.top, a.bottom);
      if (!boxes.length) return false;
      s.subs[pid] = { boxes };
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
      s.stats = {};
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
export function memeTick(s, templates) {
  const now = Date.now();
  // Wer (wieder) da ist, spielt sofort mit – beim Schreiben bekommt er direkt eine Vorlage
  if (s.phase === 'write' || s.phase === 'present') {
    const added = joinLate(s);
    if (s.phase === 'write') for (const id of added) if (!s.assign[id]) s.assign[id] = { tpl: pickTemplate(s, templates), rerolled: false };
    if (added.length) return true;
  }
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
// Rangliste: Punkte, bei 'guess' entscheiden danach die Sterne. Alle Spieler zählen,
// auch wer eine Runde verpasst hat.
export function ranking(s) {
  const st = (id) => s.stats?.[id] || { stars: 0, correct: 0 };
  const tieStars = s.settings.scoring !== 'mix';
  return s.order
    .map((id) => s.players[id])
    .filter((p) => p && (p.online || p.score > 0 || s.inGame.includes(p.id)))
    .map((p) => ({ ...p, stars: st(p.id).stars, correct: st(p.id).correct }))
    .sort((a, b) => b.score - a.score || (tieStars ? b.stars - a.stars : 0));
}

export function winners(s) {
  const r = ranking(s);
  const top = r[0];
  if (!top || (top.score === 0 && top.stars === 0)) return [];
  const tieStars = s.settings.scoring !== 'mix';
  return r.filter((p) => p.score === top.score && (!tieStars || p.stars === top.stars));
}
