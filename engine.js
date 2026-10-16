// Spiellogik des Quiz. Läuft nur beim Host (Raumersteller), der den Zustand an alle sendet.

export const ANSWER_SECONDS = 45;

export const CATEGORIES = [
  { name: 'Geschichte', icon: '🏛️' }, { name: 'Geografie', icon: '🗺️' }, { name: 'Fußball', icon: '⚽' },
  { name: 'Sport allgemein', icon: '🏅' }, { name: 'Musik', icon: '🎵' }, { name: 'Filme & Serien', icon: '🎬' },
  { name: 'Wissenschaft', icon: '🔬' }, { name: 'Tierwelt', icon: '🦁' }, { name: 'Essen & Trinken', icon: '🍕' },
  { name: 'Technik & Internet', icon: '💻' }, { name: 'Kunst & Design', icon: '🎨' }, { name: 'Bücher & Literatur', icon: '📚' },
  { name: 'Sprache & Wörter', icon: '🔤' }, { name: 'Politik & Gesellschaft', icon: '🏛' }, { name: 'Weltraum', icon: '🚀' },
  { name: 'Menschlicher Körper', icon: '🫀' }, { name: 'Erfindungen', icon: '💡' }, { name: 'Marken & Wirtschaft', icon: '💼' },
  { name: 'Mythologie & Sagen', icon: '🐉' }, { name: 'Deutschland', icon: '🇩🇪' }, { name: 'Autos & Verkehr', icon: '🏎️' },
  { name: 'Videospiele', icon: '🎮' }, { name: 'Natur & Pflanzen', icon: '🌿' }, { name: 'Religionen der Welt', icon: '🕍' },
  { name: 'Mode & Lifestyle', icon: '👟' }, { name: 'Rekorde & Superlative', icon: '🏆' }, { name: 'Chemie', icon: '⚗️' },
  { name: 'Physik', icon: '🧲' }, { name: 'Mathe & Zahlen', icon: '🔢' }, { name: 'Flaggen & Länder', icon: '🏳️' },
  { name: 'Hauptstädte', icon: '🏙️' }, { name: '90er & 2000er', icon: '📼' }, { name: 'Social Media', icon: '📱' },
  { name: 'Olympische Spiele', icon: '🥇' }, { name: 'Comics & Animation', icon: '🦸' }, { name: 'Bauwerke & Architektur', icon: '🗼' },
  { name: 'Feiertage & Bräuche', icon: '🎉' }, { name: 'Sprichwörter & Redewendungen', icon: '💬' }, { name: 'Berühmte Persönlichkeiten', icon: '⭐' },
  { name: 'Wetter & Klima', icon: '⛈️' }, { name: 'Meere & Ozeane', icon: '🌊' }, { name: 'Medizin', icon: '💊' },
  { name: 'Kinder & Spielzeug', icon: '🧸' }, { name: 'Kriminalfälle & Detektive', icon: '🕵️' }, { name: 'Philosophie', icon: '🤔' },
];

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
  const fresh = CATEGORIES.filter((c) => !previous.includes(c.name));
  const cats = shuffle(fresh.length >= COLS ? fresh : CATEGORIES).slice(0, COLS);
  const values = valuesFor(mode);
  return {
    categories: cats,
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
      ex.name = p.name;
      ex.avatar = p.avatar;
      changed = true;
    }
  }
  for (const id of Object.keys(s.players)) {
    if (!ids.has(id) && s.players[id].online) {
      s.players[id].online = false;
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

// true / false = sicher, null = KI fragen
export function localJudge(given, q, usedChoices) {
  const g = norm(given);
  if (!g) return false;
  const accepted = [q.answer, ...(q.aliases || [])].map(norm).filter(Boolean);
  if (accepted.includes(g)) return true;
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
    } else s.players[id].score = 0;
  }
}

export function ranking(s) {
  return [...s.order].map((id) => s.players[id]).filter(Boolean).sort((a, b) => b.score - a.score);
}
