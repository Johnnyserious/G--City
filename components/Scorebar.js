'use client';
import Avatar from './Avatar';
import { currentTurnId } from '@/lib/engine';

export default function Scorebar({ state, me }) {
  const turn = currentTurnId(state);
  return (
    <div className="scorebar">
      {state.order.map((id) => {
        const p = state.players[id];
        if (!p) return null;
        return (
          <div key={id} className={'score-item' + (id === turn && state.phase === 'board' ? ' turn' : '') + (p.online ? '' : ' offline')}>
            <Avatar avatar={p.avatar} size={36} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{p.name}{id === me.id ? ' (du)' : ''}</div>
              <div className={'pts' + (p.score < 0 ? ' neg' : '')}>{p.score}</div>
            </div>
            <div style={{ fontSize: 12, opacity: .8 }} title="Joker übrig">
              {p.jokers.hint ? '💡' : ''}{p.jokers.swap ? '🔄' : ''}{p.jokers.choices ? '🔠' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}
