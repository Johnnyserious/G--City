'use client';
import { useEffect, useRef } from 'react';
import Avatar from './Avatar';
import { currentTurnId } from '@/lib/engine';
import { sfx } from '@/lib/sound';

export const CAT_COLORS = ['#ff5d8f', '#ff8a3d', '#2ec4a6', '#4d7cff', '#a46bff'];

export default function Board({ room, me }) {
  const { state, send } = room;
  const turn = currentTurnId(state);
  const mine = turn === me.id && state.phase === 'board';
  const turnPlayer = state.players[turn];
  const lastTurn = useRef(null);

  useEffect(() => {
    if (state.phase === 'board' && lastTurn.current !== turn && turn === me.id) sfx.join();
    lastTurn.current = turn;
  }, [turn, state.phase, me.id]);

  const { board } = state;
  const rows = board.tiles[0].length;

  return (
    <div>
      <div className={'turn-banner' + (mine ? ' mine' : '')}>
        {state.phase === 'board'
          ? mine ? '👉 Du bist dran – wähl ein Feld!' : <>{turnPlayer?.name} wählt ein Feld …</>
          : ' '}
        {state.round > 1 && <span className="muted" style={{ fontSize: 16, marginLeft: 8 }}>Runde {state.round}</span>}
      </div>
      <div className="board" key={state.round}>
        {board.categories.map((c, i) => (
          <div key={'c' + i} className="cat" style={{ background: CAT_COLORS[i % 5], animationDelay: i * 0.07 + 's' }}>
            <span className="ic">{c.icon}</span>
            {c.name}
          </div>
        ))}
        {Array.from({ length: rows }).map((_, r) =>
          board.categories.map((_, ci) => {
            const t = board.tiles[ci][r];
            const by = t.by ? state.players[t.by] : null;
            const can = mine && !t.used;
            return (
              <button
                key={ci + '-' + r}
                className={'tile' + (can ? ' can' : '') + (t.used ? ' used ' + (t.correct ? 'ok' : 'bad') : '')}
                style={{ animationDelay: 0.3 + (r * 5 + ci) * 0.025 + 's' }}
                disabled={!can}
                onClick={() => { sfx.pick(); send('pick', { cat: ci, row: r }); }}
              >
                {t.used ? (
                  <>
                    {by && <span className="by"><Avatar avatar={by.avatar} size={36} /></span>}
                    <span className="mark">{t.correct ? '✅' : '❌'}</span>
                  </>
                ) : (
                  t.value
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
