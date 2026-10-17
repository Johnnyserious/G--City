// Spiellogik des Quiz. Läuft nur beim Host (Raumersteller), der den Zustand an alle sendet.

export const ANSWER_SECONDS = 45;

// group: 'pop' = Freizeit/Popkultur, 'edu' = Allgemeinbildung (Schul-/Abiturniveau).
// Die Namen sind gleichzeitig die Schlüssel in der Fragen-Datenbank – nur ändern, wenn man neue Fragen will.
export const CATEGORIES = [
  { name: 'Fußball', icon: '⚽', group: 'pop' }, { name: 'Sport allgemein', icon: '🏅', group: 'pop' },
  { name: 'Autos', icon: '🚗', group: 'pop' }, { name: 'Formel 1 & Motorsport', icon: '🏎️', group: 'pop' },
  { name: 'Deutschrap', icon: '🎤', group: 'pop' }, { name: 'Musik & Charts', icon: '🎵', group: 'pop' },
  { name: 'Filme', icon: '🎬', group: 'pop' }, { name: 'Serien & Streaming', icon: '📺', group: 'pop' },
  { name: 'Videospiele', icon: '🎮', group: 'pop' }, { name: 'Social Media & Internet', icon: '📱', group: 'pop' },
  { name: 'Marken & Firmen', icon: '🏷️', group: 'pop' }, { name: 'Essen & Trinken', icon: '🍔', group: 'pop' },
  { name: 'Technik & Gadgets', icon: '💻', group: 'pop' }, { name: '90er & 2000er', icon: '📼', group: 'pop' },
  { name: 'Promis & Stars', icon: '⭐', group: 'pop' }, { name: 'Reisen & Urlaub', icon: '✈️', group: 'pop' },
  { name: 'Fitness & Gym', icon: '💪', group: 'pop' }, { name: 'Mode & Sneaker', icon: '👟', group: 'pop' },
  { name: 'Geld & Wirtschaft', icon: '💸', group: 'pop' }, { name: 'Superhelden & Comics', icon: '🦸', group: 'pop' },
  { name: 'Kindheit & Kult', icon: '🧸', group: 'pop' }, { name: 'Drinks & Party', icon: '🍹', group: 'pop' },
  { name: 'Allgemeinwissen', icon: '🧠', group: 'edu' }, { name: 'Geschichte', icon: '🏛️', group: 'edu' },
  { name: 'Geografie', icon: '🗺️', group: 'edu' }, { name: 'Länder & Hauptstädte', icon: '🏙️', group: 'edu' },
  { name: 'Deutschland', icon: '🇩🇪', group: 'edu' }, { name: 'Wissenschaft', icon: '🔬', group: 'edu' },
  { name: 'Biologie & Tiere', icon: '🦁', group: 'edu' }, { name: 'Menschlicher Körper', icon: '🫀', group: 'edu' },
  { name: 'Physik & Chemie', icon: '⚗️', group: 'edu' }, { name: 'Weltraum', icon: '🚀', group: 'edu' },
  { name: 'Erfindungen & Entdeckungen', icon: '💡', group: 'edu' }, { name: 'Politik & Gesellschaft', icon: '🗳️', group: 'edu' },
  { name: 'Sprache & Wörter', icon: '🔤', group: 'edu' }, { name: 'Kunst & Literatur', icon: '🎨', group: 'edu' },
  { name: 'Natur & Umwelt', icon: '🌿', group: 'edu' }, { name: 'Krasse Fakten', icon: '🤯', group: 'edu' },
];
export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

export const COLS = 5;
export const valuesFor = (mode) => (mode === 100 ? [20, 40, 60, 80, 100] : [100, 200, 300, 400, 500]);

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const clone = (o) => JSON.parse(JSON.stringify(o));

export function initialState(hostId) {
  return {
    v: 1,
    game: 'quiz',
    hostId,
    phase: 'lobby', // lobby | board | question | end
    players: {},
    order: [],
    modeVotes: {},
    mode: 500,
    board: null,
    turn: 0,
    current: null,
    asked: [],
    round: 1,
    revanche: {},
    final: false,
  };
}

export function newBoard(mode, previous = []) {
  const pool = (g) => {
    const all = CATEGORIES.filter((c) => c.group === g);
    const fresh = all.filter((c) => !previous.includes(c.name));
    return shuffle(fresh.length >= 3 ? fresh : all);
  };
  const cats = shuffle([...pool('pop').slice(0, 3), ...pool('edu').slice(0, 2)]);
  const values = valuesFor(mode);
  return {
    categories: cats.map(({ name, icon }) => ({ name, icon })),
    tiles: cats.map(() => values.map((value) => ({ value, used: false, by: null, correct: null }))),
  };
}

const freshJokers = () => ({ hint: true, swap: true, choices: true });

// Spieler aus der Presence-Liste übernehmen
export function syncPlayers(s, present) {
  const ids = new Set(present.map((p) => p.id));
  let changed = false;
  for (const p of present) {
    const ex = s.players[p.id];
    if (!ex) {
      s.players[p.id] = { id: p.id, name: p.name, avatar: p.avatar, score: 0, jokers: freshJokers(), online: true, joinedAt: p.joinedAt };
      s.order.push(p.id);
      changed = true;
    } else if (!ex.online || ex.name !== p.name || JSON.stringify(ex.avatar) !== JSON.stringify(p.avatar)) {
      ex.online = true;
      delete ex.offAt;
      ex.name = p.name;
      ex.avatar = p.avatar;
      changed = true;
    }
  }
  for (const id of Object.keys(s.players)) {
    if (s.players[id].bot) continue; // Bots (Dev-Mode) sind nie in der Presence
    if (!ids.has(id) && s.players[id].online) {
      s.players[id].online = false;
      s.players[id].offAt = Date.now(); // seit wann weg (Handy gesperrt, kurz kein Netz …)
      changed = true;
    }
  }
  // In der Lobby: Offline-Spieler entfernen
  if (s.phase === 'lobby') {
    for (const id of Object.keys(s.players)) {
      if (!s.players[id].online) {
        delete s.players[id];
        delete s.modeVotes[id];
        s.order = s.order.filter((x) => x !== id);
        changed = true;
      }
    }
  }
  return changed;
}

export const onlineIds = (s) => s.order.filter((id) => s.players[id]?.online);

// Wer bei einer neuen Runde mitspielt: alle, die online sind, plus alle, die erst kurz weg sind
// (Handy kurz gesperrt, App gewechselt, Funkloch). Sonst fliegen Leute aus der nächsten Runde,
// nur weil ihr Bildschirm gerade aus war. Kommen sie zurück, sind sie direkt wieder dabei.
export const GRACE_MS = 3 * 60 * 1000;
export const activeIds = (s, now = Date.now()) =>
  s.order.filter((id) => {
    const p = s.players[id];
    return p && (p.online || p.bot || (p.offAt && now - p.offAt < GRACE_MS));
  });

// Spieler, die mitten in einer Runde (wieder) da sind, aber noch nicht mitspielen → aufnehmen.
// Gibt die neu aufgenommenen IDs zurück.
export function joinLate(s) {
  const added = [];
  for (const id of s.order) {
    if (s.players[id]?.online && !s.inGame.includes(id)) {
      s.inGame.push(id);
      added.push(id);
    }
  }
  return added;
}

export function currentTurnId(s) {
  const n = s.order.length;
  for (let i = 0; i < n; i++) {
    const id = s.order[(s.turn + i) % n];
    if (s.players[id]?.online) return id;
  }
  return s.order[0];
}

export function advanceTurn(s) {
  const cur = currentTurnId(s);
  const idx = s.order.indexOf(cur);
  s.turn = (idx + 1) % s.order.length;
}

export function modeTally(s) {
  const t = { 100: 0, 500: 0 };
  for (const id of onlineIds(s)) {
    const v = s.modeVotes[id];
    if (v === 100 || v === 500) t[v]++;
  }
  return t;
}

export function startGame(s) {
  const t = modeTally(s);
  s.mode = t[100] > t[500] ? 100 : 500;
  s.board = newBoard(s.mode);
  s.phase = 'board';
  s.round = 1;
  s.final = false;
  s.revanche = {};
  s.current = null;
  for (const id of s.order) {
    s.players[id].score = 0;
    s.players[id].jokers = freshJokers();
  }
  s.turn = Math.floor(Math.random() * s.order.length);
}

export function boardDone(s) {
  return s.board.tiles.every((col) => col.every((t) => t.used));
}

const norm = (x) =>
  String(x || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(der|die|das|den|dem|des|ein|eine|einen|the|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Anzahl Tippfehler zwischen zwei Wörtern (Levenshtein)
function dist(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

// true / false = sicher, null = KI fragen
export function localJudge(given, q, usedChoices) {
  const g = norm(given);
  if (!g) return false;
  const accepted = [q.answer, ...(q.aliases || [])].map(norm).filter(Boolean);
  if (accepted.includes(g)) return true;
  // kleine Tippfehler direkt gelten lassen (spart die KI-Prüfung → schneller)
  if (!/^\d+$/.test(g) && accepted.some((a) => !/^\d+$/.test(a) && a.length >= 4 && dist(g, a) <= (a.length >= 9 ? 2 : 1))) return true;
  if (usedChoices && (q.options || []).some((o) => norm(o) === g)) return false;
  if (/^\d+$/.test(g) && accepted.some((a) => /^\d+$/.test(a))) return false;
  return null;
}

export function applyResult(s, correct, timedOut = false) {
  const c = s.current;
  const p = s.players[c.playerId];
  c.correct = correct;
  c.timedOut = timedOut;
  c.delta = correct ? c.value : -Math.round(c.value / 2);
  if (p) p.score += c.delta;
  c.status = 'result';
  const tile = s.board.tiles[c.cat][c.row];
  tile.used = true;
  tile.by = c.playerId;
  tile.correct = correct;
}

export function vetoVoters(s) {
  return onlineIds(s).filter((id) => id !== s.current.playerId);
}

// Gibt 'accept' | 'reject' | null zurück. Mehrheit der anderen Spieler entscheidet.
export function vetoOutcome(s) {
  const voters = vetoVoters(s);
  if (voters.length === 0) return 'accept';
  const votes = s.current.vetoVotes || {};
  let yes = 0, no = 0;
  for (const id of voters) {
    if (votes[id] === true) yes++;
    if (votes[id] === false) no++;
  }
  const need = Math.floor(voters.length / 2) + 1;
  if (yes >= need) return 'accept';
  if (no > voters.length - need) return 'reject';
  return null;
}

export function acceptVeto(s) {
  const c = s.current;
  const p = s.players[c.playerId];
  if (p) p.score += -c.delta + c.value;
  c.delta = c.value;
  c.correct = true;
  c.vetoResult = 'accepted';
  s.board.tiles[c.cat][c.row].correct = true;
  c.status = 'result';
}

export function revancheOutcome(s) {
  const voters = onlineIds(s);
  let yes = 0, no = 0;
  for (const id of voters) {
    if (s.revanche[id] === true) yes++;
    if (s.revanche[id] === false) no++;
  }
  const need = Math.floor(voters.length / 2) + 1;
  if (yes >= need) return 'yes';
  if (no > voters.length - need) return 'no';
  return null;
}

export function startRevanche(s) {
  s.board = newBoard(s.mode, s.board.categories.map((c) => c.name));
  s.round += 1;
  s.revanche = {};
  s.phase = 'board';
  s.current = null;
  for (const id of s.order) s.players[id].jokers = freshJokers();
}

export function backToLobby(s) {
  s.phase = 'lobby';
  s.board = null;
  s.current = null;
  s.revanche = {};
  s.final = false;
  s.round = 1;
  for (const id of Object.keys(s.players)) {
    if (!s.players[id].online) {
      delete s.players[id];
      s.order = s.order.filter((x) => x !== id);
    } // Punkte bleiben stehen – sie werden erst beim nächsten Spielstart auf 0 gesetzt
  }
}

export function ranking(s) {
  return [...s.order].map((id) => s.players[id]).filter(Boolean).sort((a, b) => b.score - a.score);
}
