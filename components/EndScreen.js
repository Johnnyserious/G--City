'use client';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import Avatar from './Avatar';
import { ranking, onlineIds } from '@/lib/engine';
import { sfx } from '@/lib/sound';

export default function EndScreen({ room, me }) {
  const { state, send } = room;
  const ranked = ranking(state);
  const [first, second, third] = ranked;
  const isHost = state.hostId === me.id;
  const voters = onlineIds(state);
  const my = state.revanche[me.id];

  useEffect(() => {
    sfx.fanfare();
    const end = Date.now() + 1800;
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 }, zIndex: 100 });
      confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 }, zIndex: 100 });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [state.final]);

  const pod = (p, place) =>
    p && (
      <div className={'pod p' + place}>
        <Avatar avatar={p.avatar} size={place === 1 ? 84 : 64} />
        <div style={{ fontWeight: 900, maxWidth: 96, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
        <div className="block">{place === 1 ? '👑' : place}</div>
        <div className="display" style={{ fontSize: 22 }}>{p.score}</div>
      </div>
    );

  const yes = voters.filter((id) => state.revanche[id] === true);
  const no = voters.filter((id) => state.revanche[id] === false);

  return (
    <div className="stack">
      <h1 className="center" style={{ fontSize: 44 }}>{state.final ? 'Endstand 🏆' : `Runde ${state.round} vorbei!`}</h1>
      <div className="podium">
        {pod(second, 2)}
        {pod(first, 1)}
        {pod(third, 3)}
      </div>
      {ranked.length > 3 && (
        <div className="card rank-list">
          {ranked.slice(3).map((p, i) => (
            <div key={p.id}><b style={{ width: 24 }}>{i + 4}.</b><Avatar avatar={p.avatar} size={32} /><span style={{ flex: 1, fontWeight: 800 }}>{p.name}</span><span className="display">{p.score}</span></div>
          ))}
        </div>
      )}

      {!state.final ? (
        <div className="card center stack">
          <h3 style={{ fontSize: 26 }}>Noch eine Runde mit gleichem Punktestand?</h3>
          <p className="muted" style={{ margin: 0, fontWeight: 700 }}>Neues Board, neue Themen, Joker wieder voll. Jeder hat nochmal die Chance.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn green big" style={{ opacity: my === false ? 0.5 : 1 }} onClick={() => { sfx.vote(); send('revanche', { yes: true }); }}>🔥 Ja! ({yes.length})</button>
            <button className="btn ghost big" style={{ opacity: my === true ? 0.5 : 1 }} onClick={() => { sfx.vote(); send('revanche', { yes: false }); }}>Nein ({no.length})</button>
          </div>
          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            {voters.map((id) => {
              const p = state.players[id];
              const v = state.revanche[id];
              return <div key={id} style={{ opacity: v === undefined ? 0.35 : 1, position: 'relative' }}><Avatar avatar={p.avatar} size={40} /><span style={{ position: 'absolute', right: -4, bottom: -4 }}>{v === true ? '🔥' : v === false ? '💤' : ''}</span></div>;
            })}
          </div>
        </div>
      ) : (
        <div className="center">
          {isHost ? (
            <button className="btn big pink" onClick={() => { sfx.click(); send('lobby'); }}>Neues Spiel 🎲</button>
          ) : (
            <div className="muted" style={{ fontWeight: 800 }}>Der Host kann ein neues Spiel starten.</div>
          )}
        </div>
      )}
    </div>
  );
}
