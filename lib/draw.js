// Spiellogik fürs Zeichenspiel. Läuft beim Host. Die Striche selbst laufen NICHT über den Spielzustand,
// sondern direkt per Broadcast vom Zeichner an alle (siehe components/DrawCanvas.js).
import { onlineIds, activeIds } from './engine';
import { wordOptions } from './drawWords';

export const MIN_PLAYERS = 2;
export const ROUND_OPTIONS = [1, 2, 3];
export const SECOND_OPTIONS = [60, 80, 100];
export const CHOOSE_SECONDS = 15;
export const REVEAL_SECONDS = 6;
export const MULT = { 1: 1, 2: 1.3, 3: 1.6 }; // schwerere Wörter geben mehr Punkte

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function drawInitial(hostId) {
  return {
    v: 1,
    game: 'draw',
    hostId,
    phase: 'lobby', // lobby | choose | draw | reveal | final
    players: {},
    order: [],
    settings: { rounds: 2, seconds: 80 },
    round: 0,
    turnOrder: [],
    turnIdx: 0,
    drawer: null,
    options: [],
    word: null, // { word, level }
    turnId: 0,
    deadline: 0,
    startedAt: 0,
    hints: [], // aufgedeckte Buchstaben (Index)
    guesses: [], // { pid, text, kind: 'wrong' | 'close' | 'correct' }
    winner: null,
    turnPoints: {},
    usedWords: [],
  };
}

// Normales Wort ohne Bindestrich-Varianten für den Vergleich
const norm = (x) => String(x || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');

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

// 'correct' | 'close' | 'wrong'. Ein Tippfehler zählt noch als richtig, zwei = "ganz nah dran".
export function checkGuess(text, word) {
  const g = norm(text);
  const w = norm(word);
  if (!g) return 'wrong';
  if (g === w || (w.length >= 4 && g.includes(w))) return 'correct';
  const d = dist(g, w);
  if (w.length >= 6 && d <= 1) return 'correct';
  if (w.length >= 4 && d <= 2) return 'close';
  return 'wrong';
}

// Wort als Lücken: "_ _ _ _" mit aufgedeckten Buchstaben
export function maskWord(word, hints = []) {
  return [...word].map((ch, i) => (ch === ' ' ? ' ' : hints.includes(i) ? ch : '_'));
}

function startTurn(s) {
  // nächsten Zeichner finden, der online ist
  while (s.turnIdx < s.turnOrder.length && !s.players[s.turnOrder[s.turnIdx]]?.online) s.turnIdx++;
  if (s.turnIdx >= s.turnOrder.length) {
    s.round += 1;
    if (s.round > s.settings.rounds) {
      s.phase = 'final';
      return;
    }
    s.turnOrder = shuffle(activeIds(s));
    s.turnIdx = 0;
  }
  s.drawer = s.turnOrder[s.turnIdx];
  s.options = wordOptions(s.usedWords);
  s.word = null;
  s.phase = 'choose';
  s.deadline = Date.now() + CHOOSE_SECONDS * 1000;
  s.guesses = [];
  s.hints = [];
  s.winner = null;
  s.turnPoints = {};
  s.turnId += 1;
}

function chooseWord(s, i) {
  const w = s.options[i] || s.options[0];
  s.word = w;
  s.usedWords = [...s.usedWords, w.word].slice(-200);
  s.options = [];
  s.phase = 'draw';
  s.startedAt = Date.now();
  s.deadline = Date.now() + s.settings.seconds * 1000;
}

function endTurn(s) {
  for (const [pid, pts] of Object.entries(s.turnPoints)) if (s.players[pid]) s.players[pid].score += pts;
  s.phase = 'reveal';
  s.deadline = Date.now() + REVEAL_SECONDS * 1000;
}

function nextTurn(s) {
  s.turnIdx += 1;
  startTurn(s);
}

// Buchstaben-Tipps: nach 50 % und 75 % der Zeit je einen Buchstaben aufdecken
function hintTick(s) {
  const total = s.settings.seconds * 1000;
  const passed = Date.now() - s.startedAt;
  const want = passed > total * 0.75 ? 2 : passed > total * 0.5 ? 1 : 0;
  const letters = [...s.word.word].map((c, i) => (c === ' ' ? -1 : i)).filter((i) => i >= 0);
  const max = letters.length >= 6 ? 2 : letters.length >= 4 ? 1 : 0;
  if (s.hints.length >= Math.min(want, max)) return false;
  const free = letters.filter((i) => !s.hints.includes(i));
  if (!free.length) return false;
  s.hints = [...s.hints, free[Math.floor(Math.random() * free.length)]];
  return true;
}

export function drawAction(s, a) {
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
      for (const id of s.order) if (s.players[id]) s.players[id].score = 0;
      s.round = 1;
      s.turnOrder = shuffle(onlineIds(s));
      s.turnIdx = 0;
      startTurn(s);
      return true;
    case 'choose':
      if (s.phase !== 'choose' || pid !== s.drawer) return false;
      chooseWord(s, Number(a.index) || 0);
      return true;
    case 'guess': {
      if (s.phase !== 'draw' || pid === s.drawer || !s.players[pid]) return false;
      const text = String(a.text || '').trim().slice(0, 40);
      if (!text) return false;
      const kind = checkGuess(text, s.word.word);
      if (kind === 'correct') {
        const frac = Math.max(0, (s.deadline - Date.now()) / (s.settings.seconds * 1000));
        const m = MULT[s.word.level] || 1;
        s.turnPoints[pid] = Math.round((100 + 100 * frac) * m);
        s.turnPoints[s.drawer] = Math.round(60 * m);
        s.winner = pid;
        s.guesses = [...s.guesses, { pid, kind }].slice(-40);
        endTurn(s);
      } else {
        // knapp daneben: Text wird nicht verraten, damit niemand abschreibt
        s.guesses = [...s.guesses, kind === 'close' ? { pid, kind } : { pid, text, kind }].slice(-40);
      }
      return true;
    }
    case 'skip': // Host oder Zeichner beendet den Zug
      if (!(isHost || pid === s.drawer) || !['choose', 'draw'].includes(s.phase)) return false;
      if (s.phase === 'choose') chooseWord(s, 0);
      endTurn(s);
      return true;
    case 'next':
      if (!isHost || s.phase !== 'reveal') return false;
      nextTurn(s);
      return true;
    case 'lobby':
      if (!isHost) return false;
      s.phase = 'lobby';
      s.round = 0;
      s.drawer = null;
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

export function drawTick(s) {
  const now = Date.now();
  // Wer neu (oder wieder) da ist und in dieser Runde noch nicht dran war, kommt hinten in die Reihenfolge
  if (['choose', 'draw', 'reveal'].includes(s.phase)) {
    const missing = s.order.filter((id) => s.players[id]?.online && !s.turnOrder.includes(id));
    if (missing.length) { s.turnOrder.push(...missing); return true; }
  }
  const drawerOn = s.players[s.drawer]?.online;
  if (s.phase === 'choose' && (now > s.deadline || !drawerOn)) {
    if (!drawerOn) { nextTurn(s); return true; }
    chooseWord(s, Math.floor(Math.random() * s.options.length));
    return true;
  }
  if (s.phase === 'draw') {
    if (now > s.deadline || !drawerOn) { endTurn(s); return true; }
    return hintTick(s);
  }
  if (s.phase === 'reveal' && now > s.deadline) {
    nextTurn(s);
    return true;
  }
  return false;
}

export function winners(s) {
  const ps = Object.values(s.players).filter((p) => p.online || p.score > 0);
  const max = Math.max(0, ...ps.map((p) => p.score));
  return ps.filter((p) => p.score === max && max > 0);
}
