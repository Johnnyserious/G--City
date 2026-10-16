// Bots für den Dev-Mode: Sie spielen beim Host mit, damit Jonas Spiele allein testen kann.
// Bots sind normale Spieler mit bot: true, die nicht in der Supabase-Presence stehen.
// botPlans(s) liefert, was jeder Bot gerade tun würde. Der Host-Timer (lib/room.js) führt jeden
// Plan genau einmal aus – nach einer kleinen, menschlich wirkenden Verzögerung.
import { randomAvatar } from './avatar';
import { currentTurnId, onlineIds } from './engine';
import { currentSpeaker } from './imposter';
import { raters } from './meme';
import { needsEstimate } from './estimate';
import { isTruth } from './bluff';

const NAMES = ['Anna', 'Ben', 'Cem', 'Dana', 'Emil', 'Fiona', 'Gino', 'Hanna', 'Ilyas', 'Jule', 'Kai', 'Lea'];
const WORDS = ['Banane', 'Pinguin', 'Kanada', 'Fahrrad', 'Gitarre', 'Sonne', 'Rakete', 'Pizza', 'Schloss', 'Drache', 'Kaffee', 'Regen', 'Laptop', 'Wolke'];
const LIES = ['Ein Pinguin', '1987', 'Kanada', 'Napoleon', 'Grün', 'Rückwärts', 'Bananen', 'Dreimal', 'Island', 'Ein Kaktus', 'Zahnpasta', 'Montag', '42', 'Spaghetti'];
const CAPTIONS = [['Ich, wenn', 'der Wecker klingelt'], ['Niemand:', 'Absolut niemand:'], ['Montag', 'schon wieder'], ['Wenn das WLAN', 'kurz weg ist'], ['Ich nach', 'einem Bier'], ['Mein Kontostand', 'am 15.']];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
// Gleiche Entscheidung bei jedem Aufruf (sonst würde ein Bot irgendwann „zufällig“ immer richtig liegen)
const chance = (key, p) => {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000 < p;
};

export const isBot = (s, id) => !!s.players?.[id]?.bot;
export const bots = (s) => (s.order || []).filter((id) => s.players[id]?.bot && s.players[id].online);

// Neuen Bot anlegen (nur in der Lobby)
export function addBot(s) {
  const taken = new Set(Object.values(s.players).map((p) => p.name));
  const name = '🤖 ' + (NAMES.find((n) => !taken.has('🤖 ' + n)) || 'Bot ' + rnd(10, 99));
  const id = 'bot_' + Math.random().toString(36).slice(2, 8);
  s.players[id] = { id, name, avatar: randomAvatar(), score: 0, jokers: { hint: true, swap: true, choices: true }, online: true, bot: true, joinedAt: Date.now() };
  s.order.push(id);
  return id;
}

export function removeBot(s, id) {
  if (!isBot(s, id)) return false;
  delete s.players[id];
  s.order = s.order.filter((x) => x !== id);
  return true;
}

// ---------- Was tun die Bots gerade? ----------
export function botPlans(s) {
  const B = bots(s);
  if (!B.length) return [];
  const out = [];
  const add = (pid, key, action, delay = rnd(1500, 4000)) => out.push({ pid, key: `${s.game || 'quiz'}:${key}:${pid}`, action, delay });
  const others = (pid, list) => list.filter((x) => x !== pid);

  switch (s.game || 'quiz') {
    case 'quiz': {
      const c = s.current;
      if (s.phase === 'board') {
        const t = currentTurnId(s);
        if (isBot(s, t)) {
          const free = [];
          s.board.tiles.forEach((col, ci) => col.forEach((tile, ri) => !tile.used && free.push([ci, ri])));
          const [cat, row] = pick(free) || [0, 0];
          add(t, `pick:${s.turn}:${free.length}`, { type: 'pick', cat, row }, rnd(1500, 3000));
        }
      }
      if (s.phase === 'question' && c) {
        if (c.status === 'asking' && isBot(s, c.playerId)) {
          const right = chance(`${c.playerId}:${c.q?.question}`, 0.55);
          add(c.playerId, `answer:${c.q?.question}`, { type: 'answer', text: right ? c.q.answer : pick(WORDS) }, rnd(4000, 9000));
        }
        if (c.status === 'veto') for (const b of others(c.playerId, B)) add(b, `veto:${c.cat}-${c.row}`, { type: 'vetoVote', yes: chance(`${b}:v:${c.cat}-${c.row}`, 0.5) });
        if (c.status === 'result' && isBot(s, c.playerId)) add(c.playerId, `next:${c.cat}-${c.row}`, { type: 'next' }, rnd(3000, 5000));
      }
      if (s.phase === 'end' && !s.final) for (const b of B) add(b, `revanche:${s.round}`, { type: 'revanche', yes: Math.random() < 0.5 });
      break;
    }
    case 'imposter': {
      const r = s.roundNo;
      if (s.phase === 'reveal') for (const b of B) if (s.inGame.includes(b)) add(b, `ready:${r}`, { type: 'ready' });
      if (s.phase === 'words') {
        const sp = currentSpeaker(s);
        if (isBot(s, sp)) add(sp, `word:${r}:${s.wordRound}:${s.turnIdx}`, { type: 'word', text: pick(WORDS) }, rnd(2500, 6000));
      }
      if (s.phase === 'vote') for (const b of B) if (s.inGame.includes(b)) add(b, `vote:${r}`, { type: 'vote', target: pick(others(b, s.inGame)) }, rnd(2000, 6000));
      if (s.phase === 'guess' && isBot(s, s.accused)) add(s.accused, `guess:${r}`, { type: 'guess', text: chance(`${s.accused}:${r}`, 0.3) ? s.secret.word : pick(WORDS) }, rnd(3000, 6000));
      break;
    }
    case 'meme': {
      if (s.phase === 'write') for (const b of B) if (s.assign[b] && !s.subs[b]) {
        const [top, bottom] = pick(CAPTIONS);
        // Bots setzen ihre Textfelder an zufällige Stellen (wie echte Spieler)
        const boxes = [{ x: 0.3 + Math.random() * 0.4, y: 0.08 + Math.random() * 0.25, text: top }, { x: 0.3 + Math.random() * 0.4, y: 0.65 + Math.random() * 0.27, text: bottom }];
        add(b, `write:${s.round}`, { type: 'submit', boxes }, rnd(4000, 12000));
      }
      if (s.phase === 'present') {
        for (const b of raters(s)) if (isBot(s, b)) add(b, `rate:${s.round}:${s.showIdx}`, { type: 'rate', stars: rnd(1, 5), guess: pick(others(b, s.inGame)) }, rnd(2000, 6000));
      }
      break;
    }
    case 'draw': {
      if (s.phase === 'choose' && isBot(s, s.drawer)) add(s.drawer, `choose:${s.turnId}`, { type: 'choose', index: rnd(0, 2) }, rnd(1500, 3000));
      // Bots können nicht malen → geben nach kurzer Zeit auf
      if (s.phase === 'draw' && isBot(s, s.drawer)) add(s.drawer, `giveup:${s.turnId}`, { type: 'skip' }, 6000);
      if (s.phase === 'draw') {
        for (const b of B) {
          if (b === s.drawer) continue;
          add(b, `g1:${s.turnId}`, { type: 'guess', text: pick(WORDS) }, rnd(5000, 12000));
          if (chance(`${b}:${s.turnId}`, 0.6)) add(b, `g2:${s.turnId}`, { type: 'guess', text: s.word.word }, rnd(15000, 35000));
        }
      }
      break;
    }
    case 'bluff': {
      const q = s.qs?.[s.qIdx];
      if (s.phase === 'write' && q) for (const b of B) if (s.inGame.includes(b) && !s.lies[b]) {
        let lie = pick(LIES);
        if (isTruth(lie, q)) lie = 'Etwas ganz anderes';
        add(b, `lie:${s.qIdx}`, { type: 'lie', text: lie }, rnd(4000, 10000));
      }
      if (s.phase === 'choose') for (const b of B) if (s.inGame.includes(b)) {
        const opts = s.options.filter((o) => !o.authors.includes(b));
        const truth = opts.find((o) => o.truth);
        const choice = truth && chance(`${b}:t:${s.qIdx}`, 0.45) ? truth : opts[Math.abs(b.charCodeAt(4) + s.qIdx) % opts.length];
        if (choice) add(b, `pick:${s.qIdx}`, { type: 'pick', option: choice.id }, rnd(3000, 8000));
        const lie = opts.find((o) => !o.truth);
        if (lie && chance(`${b}:l:${s.qIdx}`, 0.3)) add(b, `like:${s.qIdx}`, { type: 'like', option: lie.id }, rnd(2000, 5000));
      }
      break;
    }
    case 'emoji': {
      if (s.phase === 'play') {
        const pz = s.puzzles[s.idx];
        for (const b of B) {
          if (s.solved.some((x) => x.pid === b)) continue;
          add(b, `w:${s.idx}`, { type: 'guess', text: pick(WORDS) }, rnd(4000, 10000));
          if (chance(`${b}:${s.idx}:${pz.a}`, 0.65)) add(b, `r:${s.idx}`, { type: 'guess', text: pz.a }, rnd(8000, s.settings.seconds * 900));
        }
      }
      break;
    }
    case 'estimate': {
      const q = s.qs?.[s.idx];
      if (s.phase === 'answer' && q) for (const b of B) if (s.inGame.includes(b)) {
        if (needsEstimate(s.settings.mode, s.duel, b)) {
          const v = q.unit === 'Jahr' ? q.a + rnd(-25, 25) : Math.round(q.a * (0.5 + Math.random()) * 100) / 100;
          add(b, `est:${s.idx}`, { type: 'estimate', value: v }, rnd(3000, 9000));
        } else add(b, `bet:${s.idx}`, { type: 'bet', side: Math.random() < 0.5 ? 'A' : 'B' }, rnd(2000, 6000));
      }
      break;
    }
    default:
  }
  return out;
}

export const humanCount = (s) => onlineIds(s).filter((id) => !isBot(s, id)).length;
