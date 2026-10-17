'use client';
// Erkennt, wann ein Spiel (oder bei Imposter: eine Runde) vorbei ist, und meldet das eigene
// Ergebnis ans Profil. Jeder Browser meldet nur sich selbst; jedes Spiel zählt einmal (key).
import { useEffect, useRef } from 'react';
import { reportResult, gPoints } from './player';
import { ranking as memeRanking } from './meme';

const hash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
};

// Gibt { key, game, rank, players, win } zurück, wenn gerade ein Ergebnis feststeht – sonst null.
export function finishedResult(s, meId, code) {
  if (!s || !s.players?.[meId]) return null;
  const game = s.game || 'quiz';
  if (game === 'imposter') {
    if (s.phase !== 'result' || !s.inGame?.includes(meId) || !s.outcome) return null;
    const imp = s.imposters?.includes(meId);
    const win = (s.outcome === 'crew' && !imp) || (s.outcome === 'imposter' && imp);
    const n = s.inGame.length;
    return { key: `${code}:imposter:${s.roundNo}:${s.secret?.word || ''}`, game, rank: win ? 1 : n, players: n, win };
  }
  const done = game === 'quiz' ? s.phase === 'end' : s.phase === 'final';
  if (!done) return null;
  let list;
  let better;
  if (game === 'meme') {
    list = memeRanking(s);
    const guess = s.settings?.scoring !== 'mix';
    const me = list.find((p) => p.id === meId);
    if (!me) return null;
    better = list.filter((p) => p.score > me.score || (guess && p.score === me.score && p.stars > me.stars)).length;
  } else {
    list = (s.order || []).map((id) => s.players[id]).filter((p) => p && (p.online || p.score > 0 || p.id === meId));
    const me = s.players[meId];
    better = list.filter((p) => p.score > me.score).length;
  }
  if (list.length < 2) return null;
  const rank = better + 1;
  const sig = list.map((p) => p.id + '=' + p.score).sort().join(',');
  const round = game === 'quiz' ? s.round : '';
  return { key: `${code}:${game}:${round}:${hash(sig)}`, game, rank, players: list.length, win: rank === 1 && (s.players[meId].score > 0 || game === 'meme') };
}

// Hook für den Raum: meldet einmal pro Ergebnis, ruft onReported(profil, punkte) auf
export function useResultReporter(state, me, code, onReported) {
  const last = useRef(null);
  useEffect(() => {
    const r = finishedResult(state, me.id, code);
    if (!r || last.current === r.key) return;
    last.current = r.key;
    reportResult(me, r).then((p) => { if (p && onReported) onReported(p, gPoints(r.rank, r.players), r); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, me.id, code]);
}
