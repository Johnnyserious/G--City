// Spiellogik für Imposter. Reine Funktionen: Online läuft das beim Host, offline (ein Handy) direkt im Browser.
import { pickWord, ALL_KEY } from './imposterWords';
import { localJudge, onlineIds } from './engine';

export const WORD_ROUNDS = 2; // jeder sagt pro Runde ein Wort
export const TURN_SECONDS = 20; // Zeit pro Wort
export const DISCUSS_SECONDS = 60; // kurzer Chat vor der Abstimmung
export const GUESS_SECONDS = 30; // erwischter Imposter darf das Wort raten
export const MIN_PLAYERS = 3;
export const POINTS = { crew: 1, imposter: 3 };

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// imposters: 1 | 2 | 'random' (0 bis 2, keiner weiß wie viele)
export function chooseImposters(ids, setting) {
  let n = setting === 'random' ? [0, 1, 1, 1, 2][Math.floor(Math.random() * 5)] : Number(setting) || 1;
  n = Math.max(0, Math.min(n, ids.length - 2)); // mindestens zwei kennen das Wort
  return shuffle(ids).slice(0, n);
}

// Reihenfolge fürs Wörtersagen: Ein Imposter fängt möglichst nicht an (wäre unfair schwer)
export function speakingOrder(ids, imposters) {
  const order = shuffle(ids);
  const firstCrew = order.findIndex((id) => !imposters.includes(id));
  if (firstCrew > 0) order.unshift(order.splice(firstCrew, 1)[0]);
  return order;
}

// Abstimmung auswerten. votes: { wähler: zielId | 'none' }
export function tallyVotes(votes) {
  const t = {};
  for (const target of Object.values(votes)) if (target) t[target] = (t[target] || 0) + 1;
  const max = Math.max(0, ...Object.values(t));
  const top = Object.keys(t).filter((k) => t[k] === max);
  return { tally: t, accused: max > 0 && top.length === 1 ? top[0] : null };
}

// Ergebnis nach der Abstimmung (ohne Raten): 'guess' = Imposter darf noch raten
export function voteOutcome(accused, imposters) {
  if (accused === 'none') return imposters.length === 0 ? 'crew' : 'imposter';
  if (!accused) return imposters.length === 0 ? 'nobody' : 'imposter'; // Gleichstand → keiner raus
  if (imposters.includes(accused)) return 'guess';
  return imposters.length === 0 ? 'nobody' : 'imposter';
}

export function guessCorrect(guess, word) {
  return localJudge(guess, { answer: word, aliases: [] }, false) === true;
}

// Punkte verteilen. outcome: 'crew' | 'imposter' | 'nobody'
export function awardPoints(players, ids, imposters, outcome) {
  for (const id of ids) {
    const p = players[id];
    if (!p) continue;
    const isImp = imposters.includes(id);
    if (outcome === 'crew' && !isImp) p.score += POINTS.crew;
    if (outcome === 'imposter' && isImp) p.score += POINTS.imposter;
  }
}

// ======================= Online (Raum) =======================

export function imposterInitial(hostId) {
  return {
    v: 1,
    game: 'imposter',
    hostId,
    phase: 'lobby', // lobby | reveal | words | discuss | vote | guess | result
    players: {},
    order: [],
    settings: { imposters: 1, category: ALL_KEY },
    roundNo: 0,
    secret: null, // { word, tip, category, icon }
    imposters: [],
    inGame: [],
    ready: {},
    speakOrder: [],
    turnIdx: 0,
    wordRound: 1,
    words: [],
    deadline: 0,
    votes: {},
    accused: null,
    guess: null,
    outcome: null,
    usedWords: [],
  };
}

const currentSpeaker = (s) => s.speakOrder[s.turnIdx] || null;
export { currentSpeaker };

function startRound(s) {
  const ids = onlineIds(s);
  s.roundNo += 1;
  s.secret = pickWord(s.settings.category, s.usedWords);
  s.usedWords = [...s.usedWords, s.secret.word].slice(-150);
  s.inGame = ids;
  s.imposters = chooseImposters(ids, s.settings.imposters);
  s.ready = {};
  s.words = [];
  s.votes = {};
  s.accused = null;
  s.guess = null;
  s.outcome = null;
  s.guessAccepted = false;
  s.phase = 'reveal';
}

function beginWords(s) {
  s.phase = 'words';
  s.speakOrder = speakingOrder(s.inGame, s.imposters);
  s.turnIdx = 0;
  s.wordRound = 1;
  skipOffline(s);
  s.deadline = Date.now() + TURN_SECONDS * 1000;
}

// Nicht verbundene Spieler überspringen
function skipOffline(s) {
  let guard = 0;
  while (s.phase === 'words' && guard++ < 50) {
    const id = currentSpeaker(s);
    if (id && s.players[id]?.online) return;
    nextSpeaker(s, true);
  }
}

function nextSpeaker(s, silent = false) {
  s.turnIdx += 1;
  if (s.turnIdx >= s.speakOrder.length) {
    if (s.wordRound < WORD_ROUNDS) {
      s.wordRound += 1;
      s.turnIdx = 0;
    } else {
      s.phase = 'discuss';
      s.deadline = Date.now() + DISCUSS_SECONDS * 1000;
      return;
    }
  }
  if (!silent) skipOffline(s);
  s.deadline = Date.now() + TURN_SECONDS * 1000;
}

const voters = (s) => s.inGame.filter((id) => s.players[id]?.online);

function resolveVotes(s) {
  const { accused } = tallyVotes(s.votes);
  s.accused = accused;
  const o = voteOutcome(accused, s.imposters);
  if (o === 'guess') {
    s.phase = 'guess';
    s.deadline = Date.now() + GUESS_SECONDS * 1000;
    return;
  }
  finish(s, o);
}

function finish(s, outcome) {
  s.outcome = outcome;
  s.phase = 'result';
  awardPoints(s.players, s.inGame, s.imposters, outcome);
}

// Verarbeitet eine Aktion. Gibt true zurück, wenn sich der Zustand geändert hat.
export function imposterAction(s, a) {
  const pid = a.playerId;
  const isHost = pid === s.hostId;
  switch (a.type) {
    case 'settings':
      if (!isHost || (s.phase !== 'lobby' && s.phase !== 'result')) return false;
      if ([1, 2, 'random'].includes(a.imposters)) s.settings.imposters = a.imposters;
      if (typeof a.category === 'string') s.settings.category = a.category;
      return true;
    case 'start':
      if (!isHost || (s.phase !== 'lobby' && s.phase !== 'result')) return false;
      if (onlineIds(s).length < MIN_PLAYERS) return false;
      startRound(s);
      return true;
    case 'ready':
      if (s.phase !== 'reveal' || !s.inGame.includes(pid)) return false;
      s.ready[pid] = true;
      if (voters(s).every((id) => s.ready[id])) beginWords(s);
      return true;
    case 'skipReveal':
      if (!isHost || s.phase !== 'reveal') return false;
      beginWords(s);
      return true;
    case 'word': {
      if (s.phase !== 'words' || currentSpeaker(s) !== pid) return false;
      const text = String(a.text || '').trim().replace(/\s+/g, ' ').slice(0, 30);
      if (!text) return false;
      s.words.push({ pid, round: s.wordRound, text });
      nextSpeaker(s);
      return true;
    }
    case 'endDiscuss':
      if (!isHost || s.phase !== 'discuss') return false;
      s.phase = 'vote';
      s.votes = {};
      return true;
    case 'vote': {
      if (s.phase !== 'vote' || !s.inGame.includes(pid)) return false;
      const t = a.target;
      const ok = t === 'none' ? s.settings.imposters === 'random' : s.inGame.includes(t) && t !== pid;
      if (!ok) return false;
      s.votes[pid] = t;
      if (voters(s).every((id) => s.votes[id])) resolveVotes(s);
      return true;
    }
    case 'forceVote':
      if (!isHost || s.phase !== 'vote') return false;
      resolveVotes(s);
      return true;
    case 'guess': {
      if (s.phase !== 'guess' || pid !== s.accused) return false;
      s.guess = String(a.text || '').trim().slice(0, 40);
      finish(s, guessCorrect(s.guess, s.secret.word) ? 'imposter' : 'crew');
      return true;
    }
    case 'acceptGuess': // Host erkennt eine knapp falsch geschriebene Antwort doch an
      if (!isHost || s.phase !== 'result' || s.outcome !== 'crew' || !s.guess) return false;
      for (const id of s.inGame) if (!s.imposters.includes(id) && s.players[id]) s.players[id].score -= POINTS.crew;
      s.outcome = null;
      finish(s, 'imposter');
      s.guessAccepted = true;
      return true;
    case 'lobby':
      if (!isHost) return false;
      s.phase = 'lobby';
      s.secret = null;
      s.imposters = [];
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

// Läuft beim Host alle 0,5 s: Zeit abgelaufen, Spieler weg usw.
export function imposterTick(s) {
  const now = Date.now();
  if (s.phase === 'words') {
    const id = currentSpeaker(s);
    if (!id || !s.players[id]?.online || now > s.deadline) {
      if (id && s.players[id]?.online) s.words.push({ pid: id, round: s.wordRound, text: '', skipped: true });
      nextSpeaker(s);
      return true;
    }
  }
  if (s.phase === 'reveal' && voters(s).length && voters(s).every((id) => s.ready[id])) {
    beginWords(s);
    return true;
  }
  if (s.phase === 'discuss' && now > s.deadline) {
    s.phase = 'vote';
    s.votes = {};
    return true;
  }
  if (s.phase === 'vote' && voters(s).length && voters(s).every((id) => s.votes[id])) {
    resolveVotes(s);
    return true;
  }
  if (s.phase === 'guess' && (now > s.deadline || !s.players[s.accused]?.online)) {
    s.guess = s.guess || '';
    finish(s, 'crew');
    return true;
  }
  return false;
}
