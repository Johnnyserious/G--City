// Gekaufte Joker im Spiel. Läuft beim Host (prüfen + anwenden) und im Browser (Knopf aktiv/inaktiv).
// Regeln: höchstens 1 gekaufter Joker pro Spieler und Spiel, Host kann sie im Raum ausschalten.
import { itemById } from './shopCatalog';

export function shopState(s) {
  if (!s.shop) s.shop = { allow: true, used: {}, reveal: {}, hide: {} };
  return s.shop;
}
const view = (s) => s.shop || { allow: true, used: {}, reveal: {}, hide: {} };

export function resetBought(s) {
  const sh = shopState(s);
  sh.used = {};
  sh.reveal = {};
  sh.hide = {};
}

const QUIZ_KIND = { quiz_hint: 'hint', quiz_swap: 'swap', quiz_choices: 'choices' };

// '' = darf eingesetzt werden, sonst Grund (für die Anzeige)
export function canUseBought(s, pid, itemId) {
  const item = itemById(itemId);
  const sh = view(s);
  const game = s.game || 'quiz';
  if (!item || item.game !== game) return 'Gehört zu einem anderen Spiel';
  if (sh.allow === false) return 'Der Host hat gekaufte Joker ausgeschaltet';
  if (sh.used[pid]) return 'Du hast in diesem Spiel schon einen gekauften Joker benutzt';
  const p = s.players?.[pid];
  if (!p) return 'Du spielst gerade nicht mit';
  switch (itemId) {
    case 'quiz_hint':
    case 'quiz_swap':
    case 'quiz_choices': {
      if (!['board', 'question'].includes(s.phase)) return 'Nur während des Spiels';
      if (p.jokers?.[QUIZ_KIND[itemId]]) return 'Du hast diesen Joker noch – erst benutzen';
      return '';
    }
    case 'emoji_letters':
      if (s.phase !== 'play') return 'Nur während ein Rätsel läuft';
      if (s.solved?.some((x) => x.pid === pid)) return 'Du hast es schon erraten';
      return '';
    case 'draw_letters':
      if (s.phase !== 'draw') return 'Nur während gemalt wird';
      if (s.drawer === pid) return 'Du malst gerade selbst';
      return '';
    case 'est_double':
      if (s.phase !== 'answer') return 'Nur während geschätzt wird';
      if (!s.jokerUsed?.[pid]) return 'Du hast deinen Doppelt-Joker noch';
      if (s.entries?.[pid]?.joker) return 'Dein Joker läuft gerade in dieser Frage';
      return '';
    case 'meme_reroll':
      if (s.phase !== 'write' || !s.assign?.[pid]) return 'Nur während Memes geschrieben werden';
      if (!s.assign[pid].rerolled) return 'Du kannst noch kostenlos würfeln';
      if (s.subs?.[pid]) return 'Du hast schon abgegeben';
      return '';
    case 'bluff_5050': {
      if (s.phase !== 'choose') return 'Nur während gewählt wird';
      if (s.picks?.[pid]) return 'Du hast schon gewählt';
      const lies = (s.options || []).filter((o) => !o.truth && !o.authors.includes(pid));
      if (lies.length < 2) return 'Zu wenige Antworten';
      return '';
    }
    default:
      return 'Unbekannter Joker';
  }
}

export function applyBought(s, pid, itemId) {
  if (canUseBought(s, pid, itemId)) return false;
  const sh = shopState(s);
  switch (itemId) {
    case 'quiz_hint':
    case 'quiz_swap':
    case 'quiz_choices':
      s.players[pid].jokers[QUIZ_KIND[itemId]] = true;
      break;
    case 'emoji_letters':
      sh.reveal[pid] = s.idx;
      break;
    case 'draw_letters':
      sh.reveal[pid] = s.turnId;
      break;
    case 'est_double':
      delete s.jokerUsed[pid];
      break;
    case 'meme_reroll':
      s.assign[pid].rerolled = false;
      break;
    case 'bluff_5050': {
      const lies = s.options.filter((o) => !o.truth && !o.authors.includes(pid)).map((o) => o.id);
      for (let i = lies.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lies[i], lies[j]] = [lies[j], lies[i]];
      }
      sh.hide[pid] = { q: s.qIdx, ids: lies.slice(0, Math.floor(lies.length / 2)) };
      break;
    }
    default:
      return false;
  }
  sh.used[pid] = itemId;
  return true;
}

// Hilfen für die Anzeige
export const revealFor = (s, pid, key) => view(s).reveal?.[pid] === key;
export const hiddenFor = (s, pid) => {
  const h = view(s).hide?.[pid];
  return h && h.q === s.qIdx ? h.ids : [];
};
export const boughtUsed = (s, pid) => view(s).used?.[pid] || null;
export const boughtAllowed = (s) => view(s).allow !== false;
