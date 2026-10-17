// Stadt, Land, Fluss, Insider – Spielregeln (reine Funktionen, laufen beim Host).
import { onlineIds, activeIds, joinLate } from './engine';
import { AUTO } from './slfWords';

export const MIN_PLAYERS = 2;
export const ROUND_OPTIONS = [3, 5, 8];
export const SECOND_OPTIONS = [30, 45, 60];
export const STOP_GRACE = 5; // Sekunden nach STOPP
export const SPIN_MS = 4200;
export const SPIN_TIMEOUT = 12000; // dreht keiner, dreht das Rad von selbst
export const VOTE_SECONDS = 45;
export const RESULT_SECONDS = 40;
export const PTS = { unique: 15, shared: 10 };
export const ALPHABET = 'ABCDEFGHIJKLMNOPRSTUVWZQXY'.split('').sort();
export const DEFAULT_OFF = ['C', 'Q', 'X', 'Y'];

export const BASE_CATS = [
  { key: 'stadt', name: 'Stadt', icon: '🏙️' },
  { key: 'land', name: 'Land', icon: '🌍' },
  { key: 'fluss', name: 'Fluss', icon: '🌊' },
  { key: 'insider', name: 'Insider', icon: '😂' },
];
export const catsOf = (s) => (s.custom ? [...BASE_CATS, { key: 'custom', name: s.custom, icon: '⭐' }] : BASE_CATS);

// Vergleichbar machen: klein, Umlaute, ohne Artikel/Satzzeichen
export function normWord(t) {
  return String(t || '')
    .toLowerCase()
    .trim()
    .replace(/^(der|die|das|the|le|la|el)\s+/, '')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}
// Anfangsbuchstabe (Ä zählt als A, „Bad …“/„St. …“ zählen normal)
export function firstLetter(t) {
  const x = String(t || '').trim().replace(/^(der|die|das|the)\s+/i, '');
  const c = x.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();
  return c;
}
const AUTO_SETS = Object.fromEntries(Object.entries(AUTO).map(([k, list]) => [k, new Set(list.map(normWord))]));
export const knownWord = (cat, text) => !!AUTO_SETS[cat]?.has(normWord(text));

export function slfInitial(hostId) {
  return {
    v: 1,
    game: 'slf',
    hostId,
    phase: 'lobby', // lobby | spin | write | vote | results | final
    players: {},
    order: [],
    settings: { rounds: 5, seconds: 45, off: DEFAULT_OFF },
    custom: '', // eigene Zusatz-Kategorie, gilt nur für ein Spiel
    rounds: 5,
    round: 0,
    usedLetters: [],
    wheel: [],
    letter: '',
    spinner: null,
    spinStart: 0,
    spinAt: 0,
    inGame: [],
    answers: {},
    stopBy: null,
    deadline: 0,
    items: [],
    votes: {},
    voteDone: {},
    result: null,
  };
}

const active = (s) => s.inGame.filter((id) => s.players[id]?.online);

function startSpin(s) {
  const ids = onlineIds(s);
  s.spinner = ids.length ? ids[s.round % ids.length] : s.hostId;
  const pool = ALPHABET.filter((l) => !s.settings.off.includes(l));
  let avail = pool.filter((l) => !s.usedLetters.includes(l));
  if (!avail.length) { s.usedLetters = []; avail = pool; }
  s.wheel = avail.length ? avail : ALPHABET;
  s.letter = '';
  s.spinStart = 0;
  s.spinAt = Date.now();
  s.answers = {};
  s.stopBy = null;
  s.items = [];
  s.votes = {};
  s.voteDone = {};
  s.result = null;
  s.phase = 'spin';
}

function doSpin(s) {
  s.letter = s.wheel[Math.floor(Math.random() * s.wheel.length)];
  s.usedLetters = [...s.usedLetters, s.letter];
  s.spinStart = Date.now();
}

function startWrite(s) {
  s.inGame = activeIds(s);
  s.answers = {};
  for (const id of s.inGame) s.answers[id] = {};
  s.stopBy = null;
  s.phase = 'write';
  s.deadline = Date.now() + s.settings.seconds * 1000;
}

// Antworten gruppieren; was nicht automatisch geprüft werden kann, kommt zur Abstimmung
function buildItems(s) {
  const items = [];
  for (const c of catsOf(s)) {
    const groups = {};
    for (const pid of s.inGame) {
      const text = String(s.answers[pid]?.[c.key] || '').trim();
      if (!text) continue;
      const k = normWord(text);
      if (!k) continue;
      (groups[k] = groups[k] || { key: c.key + ':' + k, cat: c.key, text, pids: [] }).pids.push(pid);
    }
    for (const g of Object.values(groups)) {
      g.letterOk = firstLetter(g.text) === s.letter;
      g.auto = g.letterOk && knownWord(c.key, g.text);
      g.vote = g.letterOk && !g.auto;
      items.push(g);
    }
  }
  return items;
}

function startVote(s) {
  s.items = buildItems(s);
  s.votes = {};
  s.voteDone = {};
  if (!s.items.some((i) => i.vote)) return showResults(s);
  s.phase = 'vote';
  s.deadline = Date.now() + VOTE_SECONDS * 1000;
}

// Gilt ein Abstimmungs-Wort? Ungültig, wenn mehr als die Hälfte der anderen 👎 sagt.
export function itemValid(s, it) {
  if (!it.letterOk) return false;
  if (it.auto) return true;
  const voters = s.inGame.filter((id) => !it.pids.includes(id) && (s.players[id]?.online || s.votes[it.key]?.[id]));
  if (!voters.length) return true;
  const no = voters.filter((id) => s.votes[it.key]?.[id] === -1).length;
  return no * 2 <= voters.length;
}

export function scoreRound(s) {
  const per = {}; // pid -> { cat: { text, pts, why } }
  const total = {};
  for (const pid of s.inGame) { per[pid] = {}; total[pid] = 0; }
  for (const it of s.items) {
    const ok = itemValid(s, it);
    const pts = ok ? (it.pids.length > 1 ? PTS.shared : PTS.unique) : 0;
    const why = !it.letterOk ? 'falscher Buchstabe' : !ok ? 'abjelehnt' : it.pids.length > 1 ? 'doppelt' : 'nur du';
    for (const pid of it.pids) {
      if (!per[pid]) continue;
      per[pid][it.cat] = { text: it.text, pts, why };
      total[pid] += pts;
    }
  }
  return { per, total };
}

function showResults(s) {
  s.result = scoreRound(s);
  for (const [pid, n] of Object.entries(s.result.total)) if (s.players[pid]) s.players[pid].score += n;
  s.phase = 'results';
  s.deadline = Date.now() + RESULT_SECONDS * 1000;
}

function nextRound(s) {
  s.round += 1;
  if (s.round >= s.rounds) { s.phase = 'final'; s.custom = ''; }
  else startSpin(s);
}

export function slfAction(s, a) {
  const pid = a.playerId;
  const isHost = pid === s.hostId;
  switch (a.type) {
    case 'settings':
      if (!isHost || !['lobby', 'final'].includes(s.phase)) return false;
      if (ROUND_OPTIONS.includes(a.rounds)) s.settings.rounds = a.rounds;
      if (SECOND_OPTIONS.includes(a.seconds)) s.settings.seconds = a.seconds;
      if (Array.isArray(a.off)) {
        const off = [...new Set(a.off.map(String).filter((l) => ALPHABET.includes(l)))];
        if (ALPHABET.length - off.length >= 5) s.settings.off = off;
      }
      if (typeof a.custom === 'string') s.custom = a.custom.replace(/\s+/g, ' ').trimStart().slice(0, 22);
      return true;
    case 'start':
      if (!isHost || !['lobby', 'final'].includes(s.phase)) return false;
      if (onlineIds(s).length < MIN_PLAYERS) return false;
      s.custom = s.custom.trim();
      for (const id of s.order) if (s.players[id]) s.players[id].score = 0;
      s.rounds = s.settings.rounds;
      s.round = 0;
      s.usedLetters = [];
      startSpin(s);
      return true;
    case 'more': // „Noch 'ne Runde!“ – Punkte laufen weiter
      if (!isHost || s.phase !== 'final') return false;
      s.rounds += 1;
      startSpin(s);
      return true;
    case 'spin':
      if (s.phase !== 'spin' || s.spinStart) return false;
      if (pid !== s.spinner && !(isHost && Date.now() - s.spinAt > 6000)) return false;
      doSpin(s);
      return true;
    case 'type': {
      if (s.phase !== 'write' || !s.answers[pid]) return false;
      const c = catsOf(s).find((x) => x.key === a.cat);
      if (!c) return false;
      s.answers[pid][c.key] = String(a.text || '').replace(/\s+/g, ' ').slice(0, 40);
      return true;
    }
    case 'all': { // alle Antworten auf einmal (beim STOPP / am Ende)
      if (!['write'].includes(s.phase) || !s.answers[pid] || !a.answers) return false;
      for (const c of catsOf(s)) if (typeof a.answers[c.key] === 'string') s.answers[pid][c.key] = a.answers[c.key].replace(/\s+/g, ' ').slice(0, 40);
      if (a.stop && !s.stopBy && catsOf(s).every((c) => String(s.answers[pid][c.key] || '').trim())) {
        s.stopBy = pid;
        s.deadline = Math.min(s.deadline, Date.now() + STOP_GRACE * 1000);
      }
      return true;
    }
    case 'vote': {
      if (s.phase !== 'vote' || !s.inGame.includes(pid)) return false;
      const it = s.items.find((x) => x.key === a.key);
      if (!it || !it.vote || it.pids.includes(pid)) return false;
      s.votes[it.key] = { ...(s.votes[it.key] || {}), [pid]: a.no ? -1 : 1 };
      return true;
    }
    case 'voteDone':
      if (s.phase !== 'vote' || !s.inGame.includes(pid)) return false;
      s.voteDone[pid] = true;
      if (active(s).every((id) => s.voteDone[id])) showResults(s);
      return true;
    case 'endVote':
      if (!isHost || s.phase !== 'vote') return false;
      showResults(s);
      return true;
    case 'next':
      if (!isHost || s.phase !== 'results') return false;
      nextRound(s);
      return true;
    case 'lobby':
      if (!isHost) return false;
      s.phase = 'lobby';
      s.custom = '';
      for (const id of Object.keys(s.players)) {
        if (!s.players[id].online) { delete s.players[id]; s.order = s.order.filter((x) => x !== id); }
      }
      return true;
    default:
      return false;
  }
}

export function slfTick(s) {
  const now = Date.now();
  if (s.phase === 'spin') {
    if (!s.spinStart && now - s.spinAt > SPIN_TIMEOUT) { doSpin(s); return true; }
    if (s.spinStart && now - s.spinStart > SPIN_MS + 900) { startWrite(s); return true; }
    return false;
  }
  if (s.phase === 'write') {
    let ch = false;
    for (const id of joinLate(s)) { if (!s.answers[id]) s.answers[id] = {}; ch = true; }
    if (now > s.deadline + 900) { startVote(s); return true; } // kurze Zugabe, damit letzte Eingaben ankommen
    return ch;
  }
  if (s.phase === 'vote') {
    if (now > s.deadline || (active(s).length && active(s).every((id) => s.voteDone[id]))) { showResults(s); return true; }
    return false;
  }
  if (s.phase === 'results' && now > s.deadline) { nextRound(s); return true; }
  return false;
}

export function winners(players) {
  const max = Math.max(0, ...players.map((p) => p.score));
  return players.filter((p) => p.score === max && max > 0);
}
